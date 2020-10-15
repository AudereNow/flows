import {
  AuthState,
  CarePathwayInstance,
  MaishaApi,
  MaishaApprovalStatus,
  MaishaPaidStatus,
  MaishaSignInResponse,
} from "./maisha";
import {
  ClaimEntry,
  PaymentRecord,
  Site,
  Task,
  TaskState,
  UserRole,
} from "../sharedtypes";
import { DataStore, Flag } from "./baseDatastore";

import moment from "moment";
import { v4 as uuidv4 } from "uuid";

export class RestDataStore extends DataStore {
  maishaApi: MaishaApi;
  constructor(readonly endpointRoot: string) {
    super();
    this.maishaApi = new MaishaApi(endpointRoot, () =>
      this.authStateChangedCallbacks.map(cb => cb(false))
    );
  }

  async userRoles(): Promise<UserRole[]> {
    // The Maisha login API doesn't support user roles, so everyone gets everything
    return [
      UserRole.AUDITOR,
      UserRole.PAYOR,
      UserRole.OPERATOR,
      ...(process.env.NODE_ENV === "development" ? [UserRole.ADMIN] : []),
    ];
  }

  authStateChangedCallbacks: ((authenticated: boolean) => void)[] = [];
  authCheckPromise: Promise<void> | null = null;
  async onAuthStateChanged(
    callback: (authenticated: boolean) => void
  ): Promise<void> {
    this.authStateChangedCallbacks.push(callback);
    if (!this.authCheckPromise) {
      this.authCheckPromise = (async () => {
        if (await this.maishaApi.isLoggedIn()) {
          this.authCheckPromise = null;
          this.authStateChangedCallbacks.map(cb => cb(true));
        } else {
          this.authCheckPromise = null;
          this.authStateChangedCallbacks.map(cb => cb(false));
        }
        try {
        } catch {}
      })();
    }
  }

  async login({ username, password }: { username: string; password: string }) {
    const res = await fetch(this.endpointRoot + "/users/sign_in", {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user: { username, password },
      }),
    });
    const user: MaishaSignInResponse = await res.json();
    if (res.ok) {
      const token = res.headers.get("Authorization");
      if (token) {
        const authState: AuthState = {
          token,
          user,
        };
        this.maishaApi.setLocalAuthState(authState);
      }
    }
    if (user.error) {
      throw new Error(user.error);
    } else {
      this.authStateChangedCallbacks.map(cb => cb(true));
    }
  }

  async logout() {
    this.maishaApi.clearLocalAuthState();
    this.authStateChangedCallbacks.map(cb => cb(false));
  }

  async changeTaskState(
    tasks: Task[],
    reviewedTasks: Task[],
    flaggedTasks: Task[],
    newState: TaskState,
    notes: string,
    payment?: PaymentRecord
  ): Promise<void> {
    if (tasks.length === 0) {
      return;
    }
    const entries = tasks.map(task => task.entries).flat();
    const reviewedEntries = reviewedTasks.map(task => task.entries).flat();
    const flaggedEntries = flaggedTasks.map(task => task.entries).flat();
    const claimIds = entries
      .map(entry => entry.claimID)
      .filter(id => id) as string[];
    const reviewedClaimIds = reviewedEntries
      .map(entry => entry.claimID)
      .filter(id => id) as string[];
    const flaggedClaimIds = flaggedEntries
      .map(entry => entry.claimID)
      .filter(id => id) as string[];
    if (newState === TaskState.COMPLETED) {
      // Changing to COMPLETED changes the paid state, not approval status
      if (!payment) {
        throw new Error("Payment info required to mark paid");
      }
      await this.markClaimsPaid(claimIds, notes, payment);
    } else {
      await this.changeClaimsState(
        claimIds,
        reviewedClaimIds,
        flaggedClaimIds,
        this.getApprovalStatus(newState),
        notes
      );
    }
    await this.refreshTasks(tasks[0].state);
  }

  async markClaimsPaid(
    claimIds: string[],
    notes: string,
    payment: PaymentRecord
  ) {
    await this.maishaApi.loyaltyPayment({
      loyalty_payment: {
        care_pathway_instance_ids: claimIds,
        notes,
        mpesa_confirmation: payment.confirmationNumber || "",
        id: uuidv4(),
        total_cents: payment.amount * 100,
      },
    });
  }

  async changeClaimsState(
    claimIds: string[],
    reviewedClaimIds: string[],
    flaggedClaimIds: string[],
    approvalStatus: MaishaApprovalStatus,
    notes: string
  ) {
    await this.maishaApi.updateApprovalStatus({
      care_pathway_instance_approval_status_update_event: {
        care_pathway_instance_ids: claimIds,
        manually_reviewed_ids: reviewedClaimIds,
        flagged_for_patient_review_ids: flaggedClaimIds,
        new_approval_status: approvalStatus,
        notes,
        event_id: uuidv4(),
        client_timestamp: moment().utc().format("YYYY-MM-DD HH:mm:ss [UTC]"),
        device_id: "Flows client",
      },
    });
  }

  // This is for testing/development only, resets all the claims back to the initial state
  async resetAllClaims() {
    if (process.env.NODE_ENV !== "development") {
      console.error(
        "Attempted to bulk reset claims outside of dev environment"
      );
      return;
    }
    const tasks: Task[] = await this.loadTasks();
    const claimIds = tasks.reduce(
      (ids: string[], task: Task) =>
        ids.concat(
          task.entries.map(entry => entry.claimID).filter(id => id) as string[]
        ),
      []
    );
    await this.changeClaimsState(
      claimIds,
      [],
      [],
      MaishaApprovalStatus.RECEIVED,
      ""
    );
  }

  getUserEmail(): string {
    const authState = this.maishaApi.getLocalAuthState();
    if (authState) {
      return authState.user.email;
    }
    return "";
  }
  getBestUserName(): string {
    const authState = this.maishaApi.getLocalAuthState();
    if (authState) {
      return authState.user.username;
    }
    return "";
  }

  taskCallbacks: {
    [key in TaskState]?: ((tasks: Task[]) => void)[];
  } = {};
  subscribeToTasks(
    state: TaskState,
    callback: (tasks: Task[]) => void
  ): () => void {
    if (this.taskCallbacks[state]) {
      this.taskCallbacks[state]!.push(callback);
    } else {
      this.taskCallbacks[state] = [callback];
    }
    this.refreshTasks(state);
    return () => {
      this.taskCallbacks[state]!.splice(
        this.taskCallbacks[state]!.indexOf(callback),
        1
      );
    };
  }

  async refreshTasks(state: TaskState) {
    const tasks = await this.loadTasks(state);
    this.taskCallbacks[state] &&
      this.taskCallbacks[state]!.forEach(cb => cb(tasks));
  }

  getApprovalStatus(taskState: TaskState): MaishaApprovalStatus {
    if (taskState === TaskState.PAY || taskState === TaskState.COMPLETED) {
      return MaishaApprovalStatus.APPROVED;
    }
    return (taskState as string) as MaishaApprovalStatus;
  }

  getClaimQuery(
    taskState?: TaskState
  ): {
    approvalStatus?: MaishaApprovalStatus;
    paidStatus?: MaishaPaidStatus;
  } {
    if (!taskState) {
      return {};
    }
    let approvalStatus: MaishaApprovalStatus = this.getApprovalStatus(
      taskState
    );
    let paidStatus: MaishaPaidStatus | undefined = undefined;
    if (taskState === TaskState.PAY) {
      paidStatus = MaishaPaidStatus.UNPAID;
    }
    if (taskState === TaskState.COMPLETED) {
      paidStatus = MaishaPaidStatus.PAID;
    }
    return {
      approvalStatus,
      paidStatus,
    };
  }

  async loadTasks(taskState?: TaskState): Promise<Task[]> {
    const claimFilters = this.getClaimQuery(taskState);
    const { facilities } = await this.maishaApi.facilities();
    return (
      await Promise.all(
        facilities.map(async facility => {
          const cursor = "";
          const {
            care_pathway_instances: carePathwayInstances,
          } = await this.maishaApi.carePathwayInstances(
            facility.id,
            cursor,
            claimFilters.approvalStatus,
            claimFilters.paidStatus
          );
          const site: Site = {
            location: facility.address,
            name: facility.name,
            phone: facility.phone_number || "",
          };
          const tasks: Task[] = carePathwayInstances.map(instance => {
            return {
              createdAt: 0,
              entries: [carePathwayInstanceToClaimEntry(instance)],
              id: instance.id,
              site,
              state: getTaskState(
                instance.approval_status,
                instance.payment_status
              ),
            };
          });
          return tasks;
        })
      )
    ).flat();
  }

  async loadFlags(tasks: Task[]): Promise<{ [taskId: string]: Flag[] }> {
    if (tasks.length === 0) {
      return {};
    }
    const result = await this.maishaApi.complianceFlags(
      tasks.map(task => task.id)
    );
    const flagsById: { [taskId: string]: Flag[] } = {};
    result.compliance_flags.forEach(
      task => (flagsById[task.care_pathway_instance_id] = task.flags)
    );
    return flagsById;
  }

  async setClaimNotes(
    task: Task,
    claimIndex: number,
    notes: string
  ): Promise<void> {
    await this.maishaApi.postReviewNote({
      review_note: {
        care_pathway_instance_id: task.id,
        message: notes,
      },
    });
  }
}

function getTaskState(
  approvalStatus: MaishaApprovalStatus,
  paidStatus: MaishaPaidStatus
): TaskState {
  if (approvalStatus === MaishaApprovalStatus.APPROVED) {
    return paidStatus === "paid" ? TaskState.COMPLETED : TaskState.PAY;
  }
  return (approvalStatus as string) as TaskState;
}

function carePathwayInstanceToClaimEntry(
  instance: CarePathwayInstance
): ClaimEntry {
  return {
    patientAge: moment().diff(moment(instance.patient!.birthday), "years"),
    patientFirstName: (instance.patient && instance.patient.first_name) || "",
    patientLastName: (instance.patient && instance.patient.last_name) || "",
    patientSex: instance.patient && instance.patient.gender,
    patientID: instance.patient!.id,
    phone: instance.patient!.phone_number || "",
    items: instance.loyalty_sold_products!.map(product => {
      return {
        name: product.api,
      };
    }),
    photos: instance.care_pathway_answer_photos.map(photo => {
      const care_pathway_answer = instance.care_pathway_answers.find(
        answer => answer.id === photo.care_pathway_answer_id
      );
      const caption = care_pathway_answer ? care_pathway_answer.ref : undefined;
      return {
        url: photo.photo_url,
        caption,
      };
    }),
    claimedCost: instance.facility_reimbursement_cents / 100,
    startTime: Date.parse(instance.started_at),
    endTime: Date.parse(instance.completed_at),
    notes: instance.notes || "",
    claimID: instance.id,
  };
}
