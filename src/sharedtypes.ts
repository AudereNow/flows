/*
  Until we truly export a private module that allows sharing of common types
  and functions between the main app and cloud functions, this is the lame way
  to do it.  This file is copied during `yarn build` in `functions/`.

  You should only put things in here that don't have module dependencies.
  Simple types, simple functions.
*/
export const AUDITOR_TASK_COLLECTION = "auditor_task";
export const OPERATOR_TASK_COLLECTION = "operator_task";
export const PAYOR_TASK_COLLECTION = "payor_task";
export const PAYMENT_COMPLETE_TASK_COLLECTION = "payment_complete_task";
export const ACTIVE_TASK_COLLECTION = "actively_viewed_tasks";
export const REJECTED_TASK_COLLECTION = "rejected_task";
export const ADMIN_LOG_EVENT_COLLECTION = "admin_log_event";
export const METADATA_COLLECTION = "metadata";

export const REMOTE_CONFIG_DOC = "remoteConfig";

export type RemoteConfig = {
  enableRealPayments: boolean;
  allowDuplicateUploads: boolean;
};

export const DEFAULT_REMOTE_CONFIG: RemoteConfig = {
  enableRealPayments: false,
  allowDuplicateUploads: false
};

export enum UserRole {
  AUDITOR = "Auditor",
  PAYOR = "Payor",
  OPERATOR = "Operator",
  ADMIN = "Admin"
}

export enum TaskDecision {
  DECLINE_AUDIT = "Decline Audit",
  APPROVE_AUDIT = "Approve Audit",
  DECLINE_PAYMENT = "Decline Payment",
  PAYMENT_COMPLETE = "Payment Complete",
  TASK_REJECTED = "Task Rejected"
}

export type Site = {
  name: string;
  phone?: string;
};

export type ClaimEntry = {
  patientAge?: number;
  patientFirstName: string;
  patientLastName: string;
  patientSex?: string;
  patientID?: string;
  phone?: string;
  item: string;
  totalCost: number;
  claimedCost: number;
  photoIDUri?: string;
  photoMedUri?: string;
  photoMedBatchUri?: string;
  timestamp: number;
  reviewed?: boolean;
};

export type ClaimTask = {
  entries: ClaimEntry[];
  site: Site;
};

export type TaskChangeMetadata = {
  timestamp: number;
  by: string;
  desc?: string;
  notes?: string;
};

export type Task = ClaimTask & {
  id: string;
  batchID: string;
  flow?: TaskDecision;
  changes: TaskChangeMetadata[];
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
