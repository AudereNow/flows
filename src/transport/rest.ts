import { ActiveTask, DataStore, Flag, PatientHistory } from "./datastore";
import {
  AdminLogEvent,
  PaymentRecipient,
  PaymentRecord,
  Pharmacy,
  Site,
  Task,
  TaskChangeRecord,
  TaskState,
  UserRole,
} from "../sharedtypes";
import { firestore, functions } from "firebase";

import { appendFile } from "fs";
import firebase from "firebase";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";

const AUTH_STATE_KEY = "authState";
type AuthState = {
  token: string;
  user: MaishaSignInResponse;
};

type MaishaSignInResponse = {
  email: string;
  name: string;
  phone_number: string;
  user_id: string;
  username: string;
  error?: string;
};

type MaishaFacility = {
  address: string;
  business_registration_number: string | null;
  city: string;
  country: "Kenya";
  dashboard_query_id: string;
  facility_id: string;
  facility_setting: object;
  id: string;
  latitude: string;
  longitude: string;
  mpesa_till_number: string;
  name: string;
  notes: string | null;
  phone_number: string | null;
};

type LoyaltySoldProduct = {
  api: string;
  brand: string;
  care_pathway_answer_id: string;
  category: string;
  cost_price_cents: number;
  description: string | null;
  id: string;
  loyalty_price_cents: number;
  product_id: string;
  retail_price_cents: number;
  stock_code: string | null;
  strength: string | null;
  unit_type: string;
  unit_volume: number | null;
  wholesale_price_cents: number;
};

type MaishaPatient = {
  birthday: string;
  birthday_accuracy: string;
  enrolled_at: string;
  first_name: string;
  gender: string;
  id: string;
  last_name: string;
  membership_card_number: string;
  national_id_hash: string;
  phone_number: string | null;
};

type CarePathwayAnswerPhoto = {
  care_pathway_answer_id: string;
  id: string;
  photo_url: string;
};

type CarePathwayInstance = {
  approval_status: string;
  address: string;
  business_registration_number: string;
  care_pathway_answers: {
    care_pathway_instance_id: string;
    id: string;
    loyalty_sold_products: LoyaltySoldProduct[];
    ref: string;
    value: string;
  }[];
  care_pathway_answer_photos: CarePathwayAnswerPhoto[];
  city: string;
  country: string;
  dashboard_query_id: string;
  facility_id: string;
  facility_setting: any;
  id: string;
  latitude: string;
  longitude: string;
  mpesa_till_number: string;
  name: string;
  notes: string | null;
  phone_number: string;
  loyalty_sold_products?: LoyaltySoldProduct[];
  patient?: MaishaPatient;
  started_at: string;
  completed_at: string;
};

type MaishaFlagsResponse = {
  compliance_flags: {
    care_pathway_instance_id: string;
    flags: Flag[];
  }[];
};

const CurrencyType: string = "KSh";

export class RestDataStore implements DataStore {
  constructor(readonly endpointRoot: string) {}

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
        try {
          // TODO(ram): Use a status endpoint
          await this.fetchWithToken("/facilities?loyalty_enabled=true");
          this.authCheckPromise = null;
          this.authStateChangedCallbacks.map(cb => cb(true));
        } catch {
          this.authCheckPromise = null;
          this.authStateChangedCallbacks.map(cb => cb(false));
        }
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
        localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authState));
      }
    }
    if (user.error) {
      throw new Error(user.error);
    } else {
      this.authStateChangedCallbacks.map(cb => cb(true));
    }
  }

  async logout() {
    localStorage.removeItem(AUTH_STATE_KEY);
    this.authStateChangedCallbacks.map(cb => cb(false));
  }

  async fetchWithToken(
    path: string,
    method: string = "GET",
    body?: any
  ): Promise<any> {
    const authState = this.getLocalAuthState();
    if (!authState) {
      throw new Error("Attempted to fetch without token");
    }
    const { token } = authState;
    const res = await fetch(this.endpointRoot + path, {
      method,
      headers: {
        ...(token
          ? {
              Authorization: token,
            }
          : {}),
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      if (res.status === 401) {
        this.authStateChangedCallbacks.map(cb => cb(false));
      }
      throw new Error(await res.text());
    }
    return res.json();
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
    await this.fetchWithToken("/loyalty_payment", "POST", {
      loyalty_payment: {
        care_pathway_instance_ids: claimIds,
        notes,
        mpesa_confirmation: payment.confirmationNumber,
        id: uuidv4(),
      },
    });
  }

  async changeClaimsState(
    claimIds: string[],
    reviewedClaimIds: string[],
    flaggedClaimIds: string[],
    approvalStatus: string,
    notes: string
  ) {
    await this.fetchWithToken(
      "/care_pathway_instance_approval_status_update_event",
      "POST",
      {
        care_pathway_instance_approval_status_update_event: {
          care_pathway_instance_ids: claimIds,
          manually_reviewed_ids: reviewedClaimIds,
          //flagged_claim_ids: flaggedClaimIds, // TODO(ram): re-enable once endpoint supports it
          new_approval_status: approvalStatus,
          notes,
          event_id: uuidv4(),
          client_timestamp: moment().utc().format("YYYY-MM-DD HH:mm:ss [UTC]"),
          device_id: "Flows client",
        },
      }
    );
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
    await this.changeClaimsState(claimIds, [], [], TaskState.RECEIVED, "");
  }

  getLocalAuthState(): AuthState | null {
    const authStateString = localStorage.getItem(AUTH_STATE_KEY);
    if (!authStateString) {
      return null;
    }
    return JSON.parse(authStateString) as AuthState;
  }
  getUserEmail(): string {
    const authState = this.getLocalAuthState();
    if (authState) {
      return authState.user.email;
    }
    return "";
  }
  getBestUserName(): string {
    const authState = this.getLocalAuthState();
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

  async getChanges(taskID: string): Promise<TaskChangeRecord[]> {
    // TODO(ram): implement
    return [];
  }
  async getAllChanges(): Promise<TaskChangeRecord[]> {
    // TODO(ram): implement
    return [];
  }
  async getAdminLogs(): Promise<AdminLogEvent[]> {
    // TODO(ram): implement
    return [];
  }

  getApprovalStatus(taskState: TaskState): string {
    if (taskState === TaskState.PAY || taskState === TaskState.COMPLETED) {
      return "approved";
    }
    return taskState;
  }

  getClaimQuery(taskState: TaskState | undefined): string {
    if (!taskState) {
      return "";
    }
    let approvalStatus = this.getApprovalStatus(taskState);
    let paidStatus = "";
    if (taskState === TaskState.PAY) {
      paidStatus = "unpaid";
    }
    if (taskState === TaskState.COMPLETED) {
      paidStatus = "paid";
    }
    const paidStatusFilter = paidStatus ? `&payment_status=${paidStatus}` : "";
    return `approval_status=${approvalStatus}${paidStatusFilter}`;
  }

  async loadTasks(taskState?: TaskState): Promise<Task[]> {
    const claimFilters = this.getClaimQuery(taskState);
    const {
      facilities,
    }: { facilities: MaishaFacility[] } = await this.fetchWithToken(
      "/facilities?loyalty_enabled=true"
    );
    return (
      await Promise.all(
        facilities.map(async facility => {
          const carePathwayInstances: CarePathwayInstance[] = [];
          const result = await this.fetchWithToken(
            `/facilities/${facility.id}/care_pathway_instances?cursor=&${claimFilters}`
          );
          const site: Site = {
            location: facility.address,
            name: facility.name,
            phone: facility.phone_number || "",
          };
          carePathwayInstances.push(...result.care_pathway_instances);
          const tasks: Task[] = carePathwayInstances.map(instance => {
            return {
              createdAt: 0,
              entries: [
                {
                  patientAge: moment().diff(
                    moment(instance.patient!.birthday),
                    "years"
                  ),
                  patientFirstName:
                    (instance.patient && instance.patient.first_name) || "",
                  patientLastName:
                    (instance.patient && instance.patient.last_name) || "",
                  patientSex: instance.patient && instance.patient.gender,
                  patientID: instance.patient!.id,
                  phone: instance.patient!.phone_number || "",
                  items: instance.loyalty_sold_products!.map(product => {
                    const photo = instance.care_pathway_answer_photos.find(
                      photo =>
                        photo.care_pathway_answer_id ===
                        product.care_pathway_answer_id
                    );
                    const photoUrl = photo ? photo.photo_url : undefined;
                    return {
                      name: product.api,
                      costPriceCents: product.cost_price_cents,
                      loyaltyPriceCents: product.loyalty_price_cents,
                      retailPriceCents: product.retail_price_cents,
                      wholesalePriceCents: product.wholesale_price_cents,
                      photoUrl,
                    };
                  }),
                  generalPhotoUris: instance.care_pathway_answer_photos
                    .filter(
                      photo =>
                        instance.loyalty_sold_products!.findIndex(
                          product =>
                            product.care_pathway_answer_id ===
                            photo.care_pathway_answer_id
                        ) === -1
                    )
                    .map(photo => photo.photo_url),
                  claimedCost: 0,
                  startTime: Date.parse(instance.started_at),
                  endTime: Date.parse(instance.completed_at),
                  notes: instance.notes || "",
                  claimID: instance.id,
                },
              ],
              id: instance.id,
              site,
              state: instance.approval_status as TaskState,
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
    const care_pathway_instance_ids = tasks
      .map(task => `care_pathway_instance_ids[]=${task.id}`)
      .join("&");
    const result: MaishaFlagsResponse = await this.fetchWithToken(
      `/compliance_flags/?${care_pathway_instance_ids}`,
      "GET"
    );
    const flagsById: { [taskId: string]: Flag[] } = {};
    result.compliance_flags.forEach(
      task => (flagsById[task.care_pathway_instance_id] = task.flags)
    );
    return flagsById;
  }

  async loadPreviousTasks(
    siteName: string,
    currentIds: string[]
  ): Promise<Task[]> {
    // TODO(ram): implement
    return [];
  }
  async setRoles(email: string, roles: UserRole[]): Promise<string> {
    // TODO(ram): implement
    return "";
  }
  async issuePayments(
    recipients: PaymentRecipient[]
  ): Promise<functions.HttpsCallableResult> {
    throw new Error("issuePayments not implemented");
  }
  toServerTimestamp(date: Date): firebase.firestore.Timestamp {
    return firebase.firestore.Timestamp.fromDate(date);
  }

  dateFromServerTimestamp(timestamp: firebase.firestore.Timestamp): Date {
    return timestamp.toDate();
  }

  formatCurrency(amount: number): string {
    return `${amount.toFixed(2)} ${CurrencyType}`;
  }
  async logAdminEvent(desc: string): Promise<void> {}
  async logActiveTaskView(taskID: string): Promise<void> {
    console.warn("logActiveTaskView not implemented");
  }

  subscribeActiveTasks(
    onActiveTasksChanged: (tasks: ActiveTask[]) => void
  ): () => void {
    console.warn("subscribeActiveTasks not implemented");
    return () => null;
  }

  subscribeToPharmacyDetails(
    pharmacyId: string,
    callback: (pharmacy: Pharmacy) => void
  ): () => void {
    //this.getPharmacyDetails(pharmacyId).then(callback);
    return () => null;
  }

  async getPharmacyDetails(pharmacyId: string): Promise<Pharmacy> {
    console.warn("getPharmacyDetails not implemented");
    return {
      notes: "",
      owners: [],
    };
  }
  async setPharmacyDetails(
    pharmacyId: string,
    pharmacy: Pharmacy
  ): Promise<void> {
    console.warn("setPharmacyDetails not implemented");
  }

  async getAllTasks(taskIds: string[]): Promise<Task[]> {
    console.warn("getAllTasks not implemented");
    return [];
  }
  async getPatientHistories(
    patientIds: string[]
  ): Promise<{ [id: string]: PatientHistory }> {
    console.warn("getPatientHistories not implemented");
    return {};
  }
  async getPharmacyClaims(siteName: string): Promise<Task[]> {
    console.warn("getPharmacyClaims not implemented");
    return [];
  }
  async saveNotes(categoryName: string, notes: string[]): Promise<void> {
    console.warn("saveNotes not implemented");
  }
  async getNotes(categoryName: string): Promise<string[]> {
    console.warn("getNotes not implemented");
    return [];
  }
  subscribeToNotes(
    categoryNamestring: string,
    callback: (notes: string[]) => void
  ): () => void {
    return () => null;
  }
  async setClaimNotes(
    task: Task,
    claimIndex: number,
    notes: string
  ): Promise<void> {}
  async setRejectedClaim(
    task: Task,
    claimIndex: number,
    rejected: boolean
  ): Promise<void> {}
  async saveTask(task: Task, id: string): Promise<void> {}
}
