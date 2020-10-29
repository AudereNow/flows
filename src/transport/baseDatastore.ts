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

import firebase from "firebase";
import { functions } from "firebase";

export type ActiveTask = {
  id: string;
  name: string;
  since: firebase.firestore.Timestamp;
};

export type Flag = {
  severity: "ALERT" | "WARN";
  description: string;
  manually_flagged: boolean;
};

export interface PatientHistory {
  tasks: {
    taskId: string;
    date: string;
    totalAmount: string;
    claimCount: number;
  }[];
}

export enum PharmacyLoadingState {
  NOT_LOADED,
  LOADING,
  LOADED,
}
export type PharmacyStats = {
  [pharmacyId: string]: {
    site: Site;
    claimCount: number;
    totalReimbursement: number;
    loadingState: PharmacyLoadingState;
  };
};

export abstract class DataStore {
  // Required abstract methods
  abstract onAuthStateChanged(callback: (authenticated: boolean) => void): void;

  abstract logout(): Promise<void>;

  abstract userRoles(): Promise<UserRole[]>;

  abstract changeTaskState(
    tasks: Task[],
    reviewedTasks: Task[],
    flaggedTasks: Task[],
    newState: TaskState,
    notes: string,
    payment?: PaymentRecord
  ): Promise<void>;

  abstract getUserEmail(): string;

  abstract getBestUserName(): string;

  abstract subscribeToTasks(
    state: TaskState,
    callback: (tasks: Task[], stats?: PharmacyStats) => void
  ): () => void;

  abstract loadFlags(tasks: Task[]): Promise<{ [taskId: string]: Flag[] }>;

  abstract setClaimNotes(
    task: Task,
    claimIndex: number,
    notes: string
  ): Promise<void>;

  // Optional Methods with no-op default implementations
  refreshTasks(taskState: TaskState, pharmacyId?: string): void {}

  refreshAllTasks(taskState: TaskState): void {}

  async getChanges(taskID: string): Promise<TaskChangeRecord[]> {
    return [];
  }

  async getAllChanges(): Promise<TaskChangeRecord[]> {
    return [];
  }

  async getAdminLogs(): Promise<AdminLogEvent[]> {
    return [];
  }

  async loadPreviousTasks(
    siteName: string,
    currentIds: string[]
  ): Promise<Task[]> {
    return [];
  }

  async setRoles(email: string, roles: UserRole[]): Promise<string> {
    return "";
  }

  async issuePayments(
    recipients: PaymentRecipient[]
  ): Promise<functions.HttpsCallableResult> {
    throw new Error("issuePayments not implemented");
  }

  dateFromServerTimestamp(timestamp: firebase.firestore.Timestamp): Date {
    return timestamp.toDate();
  }

  async logAdminEvent(desc: string): Promise<void> {}

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
    return {
      notes: "",
      owners: [],
    };
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
    return [];
  }

  async saveNotes(categoryName: string, notes: string[]): Promise<void> {}

  async getNotes(categoryName: string): Promise<string[]> {
    return [];
  }

  subscribeToNotes(
    categoryName: string,
    callback: (notes: string[]) => void
  ): () => void {
    return () => {};
  }

  async setRejectedClaim(
    task: Task,
    claimIndex: number,
    rejected: boolean
  ): Promise<void> {}

  getHistoryLink(task: Task): string {
    return "";
  }
}
