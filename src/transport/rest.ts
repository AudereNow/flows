import { ActiveTask, DataStore, Flag, PatientHistory } from "./datastore";
import {
  AdminLogEvent,
  PaymentRecipient,
  Pharmacy,
  Site,
  Task,
  TaskChangeRecord,
  TaskState,
  UserRole,
} from "../sharedtypes";
import { firestore, functions } from "firebase";

import firebase from "firebase";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";

type Facility = {
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

type CarePathwayAnswerPhoto = {};

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
  care_pathway_answer_photos: {
    care_pathway_answer_id: string;
    id: string;
    photo_url: string;
  }[];
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
};

function getClaimStateString(state: TaskState): string {
  switch (state) {
    case TaskState.PAY:
      return "needs_patient_review";
    default:
      return state.toString();
  }
}

const CurrencyType: string = "KSh";

export class RestDataStore implements DataStore {
  constructor(readonly endpointRoot: string) {}

  async userRoles(): Promise<UserRole[]> {
    return [
      UserRole.AUDITOR,
      UserRole.PAYOR,
      UserRole.OPERATOR,
      UserRole.ADMIN,
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
          // TODO(ram): Switch to status endpoint
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
    if (res.ok) {
      const token = res.headers.get("Authorization");
      if (token) {
        localStorage.setItem("token", token);
      }
    }
    const user: {
      email: string;
      name: string;
      phone_number: string;
      user_id: string;
      username: string;
      error?: string;
    } = await res.json();
    if (user.error) {
      throw new Error(user.error);
    } else {
      this.authStateChangedCallbacks.map(cb => cb(true));
    }
  }

  async fetchWithToken(
    path: string,
    method: string = "GET",
    body?: any
  ): Promise<any> {
    const token = localStorage.getItem("token");
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
      throw new Error(await res.text());
    }
    return res.json();
  }

  async changeTaskState(
    tasks: Task[],
    reviewedTasks: Task[],
    newState: TaskState,
    notes: string
  ): Promise<void> {
    if (tasks.length === 0) {
      return;
    }
    const entries = tasks.map(task => task.entries).flat();
    const reviewedEntries = reviewedTasks.map(task => task.entries).flat();
    const claimIds = entries
      .map(entry => entry.claimID)
      .filter(id => id) as string[];
    const reviewedClaimIds = reviewedEntries
      .map(entry => entry.claimID)
      .filter(id => id) as string[];
    await this.changeClaimsState(claimIds, reviewedClaimIds, newState, notes);
    this.refreshTasks(tasks[0].state);
  }

  async changeClaimsState(
    claimIds: string[],
    reviewedClaimIds: string[],
    newState: TaskState,
    notes: string
  ) {
    await this.fetchWithToken(
      "/care_pathway_instance_approval_status_update_event",
      "POST",
      {
        care_pathway_instance_approval_status_update_event: {
          care_pathway_instance_ids: claimIds,
          manually_reviewed_ids: reviewedClaimIds,
          new_approval_status: getClaimStateString(newState),
          notes,
          event_id: uuidv4(),
          client_timestamp: moment().utc().format("YYYY-MM-DD HH:mm:ss [UTC]"),
          device_id: "Flows client",
        },
      }
    );
  }

  async resetAllClaims() {
    if (process.env.NODE_ENV !== "development") {
      console.error(
        "Attempted to bulk reset claims outside of dev environment, request blocked"
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
    await this.changeClaimsState(claimIds, [], TaskState.RECEIVED, "");
  }

  getUserEmail(): string {
    // TODO(ram): implement
    return "";
  }
  getBestUserName(): string {
    // TODO(ram): implement
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
  refreshTasks(state: TaskState) {
    this.loadTasks(state).then(
      tasks =>
        this.taskCallbacks[state] &&
        this.taskCallbacks[state]!.forEach(cb => cb(tasks))
    );
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
  async loadTasks(taskState?: TaskState): Promise<Task[]> {
    // TODO(ram): implement
    const {
      facilities,
    }: { facilities: Facility[] } = await this.fetchWithToken(
      "/facilities?loyalty_enabled=true"
    );
    return (
      await Promise.all(
        facilities.map(async facility => {
          //const f = {
          //  id: "1234",
          //  site: {
          //    location: facility.address,
          //    name: facility.name,
          //    phone: facility.phone_number || "",
          //  },
          //  entries: [
          //    {
          //      claimedCost: 10,
          //      item: "medicine",
          //      patientFirstName: "Ram",
          //      patientLastName: "Kandasamy",
          //      timestamp: Date.now(),
          //      totalCost: 10,
          //    },
          //  ],
          //  state: TaskState.CSV,
          //  createdAt: Date.now(),
          //};
          const result = await this.fetchWithToken(
            `/facilities/${facility.id}/care_pathway_instances`
          );
          const site: Site = {
            location: facility.address,
            name: facility.name,
            phone: facility.phone_number || "",
          };
          const carePathwayInstances: CarePathwayInstance[] =
            result.care_pathway_instances;
          const tasks: Task[] = carePathwayInstances
            .filter(
              instance =>
                taskState === undefined ||
                instance.approval_status === taskState.toString()
            )
            .map(instance => {
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
                    //item: product.api,
                    //totalCost: product.retail_price_cents,
                    claimedCost:
                      instance.loyalty_sold_products!.reduce(
                        (total, product) => total + product.loyalty_price_cents,
                        0
                      ) / 100,
                    //photoIDUri?: string;
                    //photoMedUri?: string;
                    //photoMedBatchUri?: string;
                    timestamp: 0,
                    //reviewed?: boolean;
                    notes: instance.notes || "",
                    //rejected?: boolean;
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
    const fakeFlags: { [taskId: string]: Flag[] } = {};
    tasks.forEach(task => {
      if (task.id.match(/^[0-9]/)) {
        return;
      }
      fakeFlags[task.id] = [
        {
          severity: "ALERT",
          description: "Claim has no matched EM code",
        },
      ];
    });
    return fakeFlags;
    const result = await this.fetchWithToken("/compliance_flags/", "POST", {
      care_pathway_instance_ids: tasks.map(task => task.id),
    });
    return result.compliance_flags;
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
    this.getPharmacyDetails(pharmacyId).then(callback);
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
