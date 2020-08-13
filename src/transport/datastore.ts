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
import { DataStoreConfig, DataStoreType } from "../store/config";

import { FirebaseDataStore } from "./firestore";

export type ActiveTask = {
  id: string;
  name: string;
  since: firebase.firestore.Timestamp;
};

export interface PatientHistory {
  tasks: {
    taskId: string;
    date: string;
    totalAmount: string;
    claimCount: number;
  }[];
}

export let dataStore: DataStore;

export function initializeStore(config: DataStoreConfig): DataStore {
  switch (config.type) {
    case DataStoreType.FIREBASE:
      const firebaseDataStore = new FirebaseDataStore();
      firebaseDataStore.initializeStore();
      dataStore = firebaseDataStore;
      return dataStore;
    default:
      throw new Error("Unsupported DataStore type: " + config.type);
  }
}

export interface DataStore {
  userRoles: () => Promise<UserRole[]>;

  changeTaskState: (
    task: Task,
    newState: TaskState,
    notes: string,
    payment?: PaymentRecord
  ) => Promise<void>;

  getUserEmail: () => string;

  getBestUserName: () => string;

  subscribeToTasks: (
    state: TaskState,
    callback: (tasks: Task[]) => void
  ) => () => void;

  getChanges: (taskID: string) => Promise<TaskChangeRecord[]>;

  getAllChanges: () => Promise<TaskChangeRecord[]>;

  getAdminLogs: () => Promise<AdminLogEvent[]>;

  loadTasks: (taskState: TaskState) => Promise<Task[]>;

  loadPreviousTasks: (
    siteName: string,
    currentIds: string[]
  ) => Promise<Task[]>;

  setRoles: (email: string, roles: UserRole[]) => Promise<string>;

  issuePayments: (
    recipients: PaymentRecipient[]
  ) => Promise<firebase.functions.HttpsCallableResult>;

  logAdminEvent: (desc: string) => Promise<void>;

  toServerTimestamp: (date: Date) => firebase.firestore.Timestamp;

  dateFromServerTimestamp: (timestamp: firebase.firestore.Timestamp) => Date;

  formatCurrency: (amount: number) => string;

  logActiveTaskView: (taskID: string) => Promise<void>;

  subscribeActiveTasks: (
    onActiveTasksChanged: (tasks: ActiveTask[]) => void
  ) => () => void;

  subscribeToPharmacyDetails: (
    pharmacyId: string,
    callback: (pharmacy: Pharmacy) => void
  ) => () => void;

  getPharmacyDetails: (pharmacyId: string) => Promise<Pharmacy>;

  setPharmacyDetails: (pharmacyId: string, pharmacy: Pharmacy) => Promise<void>;

  getAllTasks: (taskIds: string[]) => Promise<Task[]>;

  getPatientHistories: (
    patientIds: string[]
  ) => Promise<{ [id: string]: PatientHistory }>;

  getPharmacyClaims(siteName: string): Promise<Task[]>;

  saveNotes: (categoryName: string, notes: string[]) => Promise<void>;

  getNotes: (categoryName: string) => Promise<string[]>;

  subscribeToNotes: (
    categoryName: string,
    callback: (notes: string[]) => void
  ) => () => void;

  setClaimNotes: (
    task: Task,
    claimIndex: number,
    notes: string
  ) => Promise<void>;

  setRejectedClaim: (
    task: Task,
    claimIndex: number,
    rejected: boolean
  ) => Promise<void>;

  saveTask: (task: Task, id: string) => Promise<void>;
}
