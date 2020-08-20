import { ActiveTask, DataStore, PatientHistory } from "./datastore";
import {
  AdminLogEvent,
  PaymentRecipient,
  PaymentRecord,
  Pharmacy,
  Task,
  TaskChangeRecord,
  TaskState,
  UserRole,
} from "../sharedtypes";
import { firestore, functions } from "firebase";

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
  onAuthStateChanged(callback: (authenticated: boolean) => void): void {
    this.authStateChangedCallbacks.push(callback);
    //setImmediate(() => callback(true));
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
    const user = await res.json();
    console.log(user);
    if (user.error) {
      throw new Error(user.error);
    } else {
      this.authStateChangedCallbacks.map(cb => cb(true));
    }
  }

  async changeTaskState(
    task: Task,
    newState: TaskState,
    notes: string,
    payment?: PaymentRecord | undefined
  ): Promise<void> {}
  getUserEmail(): string {
    // TODO(ram): implement
    return "";
  }
  getBestUserName(): string {
    // TODO(ram): implement
    return "";
  }
  subscribeToTasks(
    state: TaskState,
    callback: (tasks: Task[]) => void
  ): () => void {
    // TODO(ram): implement
    return () => null;
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
  async loadTasks(taskState: TaskState): Promise<Task[]> {
    // TODO(ram): implement
    return [];
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
    throw new Error("not implemented");
  }
  async logAdminEvent(desc: string): Promise<void> {}
  toServerTimestamp(date: Date): firestore.Timestamp {
    throw new Error("not implemented");
  }
  dateFromServerTimestamp(timestamp: firestore.Timestamp): Date {
    throw new Error("not implemented");
  }
  formatCurrency(amount: number): string {
    return "";
  }
  async logActiveTaskView(taskID: string): Promise<void> {}
  subscribeActiveTasks(
    onActiveTasksChanged: (tasks: ActiveTask[]) => void
  ): () => void {
    return () => null;
  }
  subscribeToPharmacyDetails(
    pharmacyId: string,
    callback: (pharmacy: Pharmacy) => void
  ): () => void {
    return () => null;
  }
  async getPharmacyDetails(pharmacyId: string): Promise<Pharmacy> {
    throw new Error("not implemented");
  }
  async setPharmacyDetails(
    pharmacyId: string,
    pharmacy: Pharmacy
  ): Promise<void> {}
  async getAllTasks(taskIds: string[]): Promise<Task[]> {
    return [];
  }
  async getPatientHistories(
    patientIds: string[]
  ): Promise<{ [id: string]: PatientHistory }> {
    return {};
  }
  async getPharmacyClaims(siteName: string): Promise<Task[]> {
    throw new Error("Method not implemented.");
  }
  async saveNotes(categoryName: string, notes: string[]): Promise<void> {}
  async getNotes(categoryName: string): Promise<string[]> {
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
