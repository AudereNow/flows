/*
  Until we truly export a private module that allows sharing of common types
  and functions between the main app and cloud functions, this is the lame way
  to do it.  This file is copied during `yarn build` in `functions/`.

  You should only put things in here that don't have module dependencies.
  Simple types, simple functions.
*/
export const ACTIVE_TASK_COLLECTION = "actively_viewed_tasks";
export const ADMIN_LOG_EVENT_COLLECTION = "admin_log_event";
export const CANNED_NOTES_COLLECTION = "canned_notes";
export const TASK_CHANGE_COLLECTION = "task_changes";
export const METADATA_COLLECTION = "metadata";
export const TASKS_COLLECTION = "tasks";
export const PATIENTS_COLLECTION = "patients";
export const PHARMACY_COLLECTION = "pharmacies";

export enum TaskState {
  CSV = "CSV",
  AUDIT = "AUDIT",
  FOLLOWUP = "FOLLOWUP",
  COMPLETED = "COMPLETED",
  REJECTED = "rejected",
  PAY = "PAY",
  RECEIVED = "received",
  APPROVED = "approved",
  NEEDS_PATIENT_REVIEW = "needs_patient_review",
  NEEDS_REJECTED_REVIEW = "needs_rejected_review",
  NEEDS_FINAL_APPROVAL = "needs_final_approval",
}

export const REMOTE_CONFIG_DOC = "remoteConfig";

export type RemoteConfig = {
  enableRealPayments: boolean;
  allowDuplicateUploads: boolean;
  opsInstructions: string;
};

export const DEFAULT_REMOTE_CONFIG: RemoteConfig = {
  enableRealPayments: false,
  allowDuplicateUploads: false,
  opsInstructions: "",
};

export enum UserRole {
  AUDITOR = "Auditor",
  PAYOR = "Payor",
  OPERATOR = "Operator",
  ADMIN = "Admin",
}

export type Site = {
  id: string;
  name: string;
  phone: string;
  location: string;
};

export type ClaimEntry = {
  patientAge?: number;
  patientFirstName: string;
  patientLastName: string;
  patientSex?: string;
  patientID?: string;
  phone?: string;
  claimedCost: number;
  photos: {
    url: string;
    caption?: string;
  }[];

  items: {
    name: string;
    photoUrl?: string;
  }[];

  startTime: number;
  endTime: number;
  lastActedTime: number;
  reviewed?: boolean;
  notes?: string[];
  rejected?: boolean;
  claimID: string;
};

export type TaskChangeRecord = {
  taskID: string;
  state: TaskState;
  fromState: TaskState;
  timestamp: number;
  by: string;
  notes?: string;
  payment?: PaymentRecord;
};

export type PaymentRecord = {
  paymentType: PaymentType;
  amount: number;
  confirmationNumber?: string;
  bundledUnderTaskId?: string;
  bundledTaskIds?: string[];
  recipient?: PaymentRecipient;
};

export enum PaymentType {
  MANUAL,
  AFRICAS_TALKING,
  BUNDLED,
}

export type Task = {
  id: string;
  state: TaskState;
  entries: ClaimEntry[];
  site: Site;
  createdAt: number; // timestamp
  updatedAt?: number; // timestamp
};

export type PaymentRecipient = {
  name?: string;
  phoneNumber: string;
  currencyCode: string;
  amount: number;
  reason?: string;
  metadata: {
    [key: string]: any;
  };
};

export type UploaderInfo = {
  uploaderName: string;
  uploaderID: string;
};

export type User = {
  name: string;
  id: string;
};

export type Pharmacy = {
  notes: string;
  owners: string[];
};

export type Patient = {
  id: string;
  taskIds: string[];
};

// This is used to log isuses that the Admin needs to see
export type AdminLogEvent = {
  timestamp: number;
  user: User;
  desc: string;
};

// https://stackoverflow.com/questions/286141/remove-blank-attributes-from-an-object-in-javascript
export function removeEmptyFieldsInPlace(obj: { [key: string]: any }) {
  Object.keys(obj).forEach(key => {
    if (obj[key] && typeof obj[key] === "object") {
      removeEmptyFieldsInPlace(obj[key]);
    } else if (obj[key] === null || obj[key] === undefined) {
      // Note this captures undefined as well!
      delete obj[key];
    }
  });
}
