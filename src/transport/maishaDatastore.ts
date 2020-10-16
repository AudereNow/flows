import {
  AuthState,
  CarePathwayInstance,
  GetCarePathwayInstancesResult,
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
import {
  DataStore,
  Flag,
  PharmacyLoadingState,
  PharmacyStats,
} from "./baseDatastore";

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
    const claimIds = tasks
      .map(task => task.entries.map(entry => entry.claimID))
      .flat()
      .filter(id => id);
    const reviewedClaimIds = reviewedTasks
      .map(task => task.entries.map(entry => entry.claimID))
      .flat()
      .filter(id => id);
    const flaggedClaimIds = flaggedTasks
      .map(task => task.entries.map(entry => entry.claimID))
      .flat()
      .filter(id => id);
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
    await this.refreshTasks(tasks[0].state, tasks[0].site.id, true);
  }

  async markClaimsPaid(
    claimIds: string[],
    notes: string,
    payment: PaymentRecord
  ) {
    await this.maishaApi.postLoyaltyPayment({
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
    await this.maishaApi.postApprovalStatusUpdate({
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
    const tasks: Task[] = Object.values(this.taskCache).flatMap(stateCache =>
      stateCache
        ? Object.values(stateCache).flatMap(pharmacy => pharmacy.tasks)
        : []
    );
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
    [key in TaskState]?: ((tasks: Task[], stats: PharmacyStats) => void)[];
  } = {};
  subscribeToTasks(
    state: TaskState,
    callback: (tasks: Task[], stats: PharmacyStats) => void
  ): () => void {
    if (this.taskCallbacks[state]) {
      this.taskCallbacks[state]!.push(callback);
    } else {
      this.taskCallbacks[state] = [callback];
    }
    return () => {
      this.taskCallbacks[state]!.splice(
        this.taskCallbacks[state]!.indexOf(callback),
        1
      );
    };
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

  taskCache: {
    [taskState in TaskState]?: {
      [pharmacyId: string]: {
        tasks: Task[];
        site: Site;
        loadingState: PharmacyLoadingState;
        stats?: {
          claimCount: number;
          totalReimbursement: number;
        };
      };
    };
  } = {};

  async loadPharmacies(taskState: TaskState) {
    const claimFilters = this.getClaimQuery(taskState);
    const { facilities } = await this.maishaApi.getFacilities();
    const {
      facility_stats: allFacilityStats,
    } = await this.maishaApi.getLoyaltyFacilityStats();
    facilities.forEach(facility => {
      const site: Site = {
        id: facility.id,
        location: facility.address,
        name: facility.name,
        phone: facility.phone_number || "",
      };
      const facilityStats = allFacilityStats.find(
        stats => stats.facility_id === facility.id
      );
      const stateStats = facilityStats
        ? facilityStats.stats.find(
            stats =>
              stats.approval_status === claimFilters.approvalStatus &&
              stats.payment_status ===
                (claimFilters.paidStatus || MaishaPaidStatus.UNPAID)
          )
        : undefined;
      if (!this.taskCache[taskState]) {
        this.taskCache[taskState] = {};
      }
      this.taskCache[taskState]![facility.id] = {
        tasks: [],
        site,
        loadingState: PharmacyLoadingState.NOT_LOADED,
        stats: stateStats
          ? {
              claimCount: stateStats.count,
              totalReimbursement:
                stateStats.total_reimbursement_amount_cents / 100,
            }
          : undefined,
      };
    });
  }

  callTaskCallbacks(taskState: TaskState) {
    const stateCache = this.taskCache[taskState]!;
    const tasks = Object.values(stateCache).flatMap(cache => cache.tasks);
    const stats: PharmacyStats = {};
    Object.entries(stateCache).forEach(([pharmacyId, cache]) => {
      if (cache.stats) {
        stats[pharmacyId] = {
          ...cache.stats,
          loadingState: cache.loadingState,
          site: cache.site,
        };
      }
    });
    this.taskCallbacks[taskState]?.forEach(cb => cb(tasks, stats));
  }

  async refreshTasks(
    taskState: TaskState,
    selectedPharmacyId?: string,
    force?: boolean
  ) {
    const claimFilters = this.getClaimQuery(taskState);
    if (
      !selectedPharmacyId ||
      !this.taskCache[taskState] ||
      (selectedPharmacyId && !this.taskCache[taskState]![selectedPharmacyId])
    ) {
      await this.loadPharmacies(taskState);
    }
    if (!selectedPharmacyId) {
      this.callTaskCallbacks(taskState);
      return;
    }
    const pharmacyCache = this.taskCache[taskState]![selectedPharmacyId];
    if (!pharmacyCache) {
      this.callTaskCallbacks(taskState);
      return;
    }
    if (
      pharmacyCache.loadingState === PharmacyLoadingState.LOADING ||
      (!force && pharmacyCache.loadingState === PharmacyLoadingState.LOADED)
    ) {
      // No need to re-refresh
      return;
    }
    pharmacyCache.loadingState = PharmacyLoadingState.LOADING;
    pharmacyCache.tasks = [];
    let cursor = "";
    let result: GetCarePathwayInstancesResult;
    do {
      [result] = await Promise.all([
        // Kick off the next network request before triggering the UI update
        this.maishaApi.getCarePathwayInstances(
          selectedPharmacyId,
          cursor,
          claimFilters.approvalStatus,
          claimFilters.paidStatus
        ),
        this.callTaskCallbacks(taskState),
      ]);
      cursor = result.next_cursor;
      const tasks: Task[] = result.care_pathway_instances.map(instance => {
        return {
          createdAt: 0,
          entries: [carePathwayInstanceToClaimEntry(instance)],
          id: instance.id,
          site: pharmacyCache.site,
          state: getTaskState(
            instance.approval_status,
            instance.payment_status
          ),
        };
      });
      pharmacyCache.tasks.push(...tasks);
    } while (result.has_next);
    pharmacyCache.loadingState = PharmacyLoadingState.LOADED;
    this.callTaskCallbacks(taskState);
  }

  async loadFlags(tasks: Task[]): Promise<{ [taskId: string]: Flag[] }> {
    if (tasks.length === 0) {
      return {};
    }
    const result = await this.maishaApi.getComplianceFlags(
      tasks.map(task => task.id)
    );
    const flagsById: { [taskId: string]: Flag[] } = {};
    result.compliance_flags.forEach(
      task => (flagsById[task.care_pathway_instance_id] = task.flags)
    );
    tasks.forEach(task => {
      if (!flagsById[task.id]) {
        flagsById[task.id] = [];
      }
    });
    return flagsById;
  }

  async setClaimNotes(
    task: Task,
    claimIndex: number,
    notes: string
  ): Promise<void> {}
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
