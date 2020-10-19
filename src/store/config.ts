import "firebase/auth";

import { RemoteConfig, TaskState, UserRole } from "../sharedtypes";

import ApproveImg from "../assets/approve.png";
import { ClaimAction } from "../Screens/TaskPanel";
import DeclineImg from "../assets/decline.png";

interface TabConfig {
  roles: UserRole[];
  baseUrl: string;
}

interface CustomPanelConfig extends TabConfig {
  panelComponent: string;
}

export interface ActionConfig {
  label: string;
  labelClassName?: string;
  labelImg?: string;
  nextTaskState: TaskState;
  claimAction: ClaimAction;
  enableOnConfig?: keyof RemoteConfig;
  disableOnConfig?: keyof RemoteConfig;
}

export interface TaskConfig extends TabConfig {
  taskState: TaskState;
  taskListComponent: string;
  detailsComponent: string;
  listLabel: string;
  filterByOwners?: boolean;
  actions: { [key: string]: ActionConfig };
  hideImagesDefault?: boolean;
  showPreviousClaims?: boolean;
  groupTasksByPharmacy?: boolean;
  showFlagForReview?: string;
  manualReviewMinimumRatio: number;
  showBatchNotes?: boolean;
}

export enum DataStoreType {
  FIREBASE = "FIREBASE",
  REST = "REST",
}

export type DataStoreConfig = FirebaseDataStoreConfig | RestDataStoreConfig;
export type FirebaseDataStoreConfig = {
  type: DataStoreType.FIREBASE;
  authUiConfig: firebaseui.auth.Config;
};
export type RestDataStoreConfig = {
  type: DataStoreType.REST;
  endpointRoot: string;
};

export interface AppConfig {
  tabs: {
    [tab: string]: TaskConfig | CustomPanelConfig;
  };
  dataStore: DataStoreConfig;
}

export function isCustomPanel(config: TabConfig): config is CustomPanelConfig {
  return (config as CustomPanelConfig).panelComponent !== undefined;
}

export const defaultConfig: AppConfig = {
  tabs: {
    "First Review": {
      taskState: TaskState.RECEIVED,
      taskListComponent: "default",
      detailsComponent: "AuditTask",
      listLabel: "ITEMS TO REVIEW",
      roles: [UserRole.AUDITOR],
      baseUrl: "auditor",
      groupTasksByPharmacy: true,
      showFlagForReview: "Flag for patient review",
      manualReviewMinimumRatio: 0.2,
      actions: {
        approve: {
          label: "APPROVE REMAINING",
          nextTaskState: TaskState.NEEDS_PATIENT_REVIEW,
          claimAction: ClaimAction.APPROVE,
          labelClassName: "mainview_approve_button",
          labelImg: ApproveImg,
        },
        save: {
          label: "HOLD REMAINING",
          nextTaskState: TaskState.RECEIVED,
          claimAction: ClaimAction.HOLD,
          labelClassName: "mainview_button",
        },
        decline: {
          label: "DECLINE REMAINING",
          nextTaskState: TaskState.NEEDS_REJECTED_REVIEW,
          claimAction: ClaimAction.REJECT,
          labelClassName: "mainview_decline_button",
          labelImg: DeclineImg,
        },
      },
    },
    "Patient Review": {
      taskState: TaskState.NEEDS_PATIENT_REVIEW,
      taskListComponent: "default",
      detailsComponent: "AuditTask",
      listLabel: "ITEMS TO REVIEW",
      roles: [UserRole.AUDITOR],
      baseUrl: "patient",
      groupTasksByPharmacy: true,
      manualReviewMinimumRatio: 0.2,
      actions: {
        approve: {
          label: "APPROVE REMAINING",
          nextTaskState: TaskState.NEEDS_FINAL_APPROVAL,
          claimAction: ClaimAction.APPROVE,
          labelClassName: "mainview_approve_button",
          labelImg: ApproveImg,
        },
        save: {
          label: "HOLD REMAINING",
          nextTaskState: TaskState.NEEDS_PATIENT_REVIEW,
          claimAction: ClaimAction.HOLD,
          labelClassName: "mainview_button",
        },
        decline: {
          label: "DECLINE REMAINING",
          claimAction: ClaimAction.REJECT,
          nextTaskState: TaskState.NEEDS_REJECTED_REVIEW,
          labelClassName: "mainview_decline_button",
          labelImg: DeclineImg,
        },
      },
    },
    "Final Approval": {
      taskState: TaskState.NEEDS_FINAL_APPROVAL,
      taskListComponent: "default",
      detailsComponent: "AuditTask",
      listLabel: "ITEMS TO REVIEW",
      roles: [UserRole.AUDITOR],
      baseUrl: "finalapproval",
      groupTasksByPharmacy: true,
      manualReviewMinimumRatio: 0,
      actions: {
        approve: {
          label: "APPROVE REMAINING",
          nextTaskState: TaskState.APPROVED,
          claimAction: ClaimAction.APPROVE,
          labelClassName: "mainview_approve_button",
          labelImg: ApproveImg,
        },
        save: {
          label: "HOLD REMAINING",
          nextTaskState: TaskState.NEEDS_FINAL_APPROVAL,
          claimAction: ClaimAction.HOLD,
          labelClassName: "mainview_button",
        },
        decline: {
          label: "DECLINE REMAINING",
          claimAction: ClaimAction.REJECT,
          nextTaskState: TaskState.NEEDS_REJECTED_REVIEW,
          labelClassName: "mainview_decline_button",
          labelImg: DeclineImg,
        },
      },
    },
    "Rejection Review": {
      taskState: TaskState.NEEDS_REJECTED_REVIEW,
      taskListComponent: "default",
      detailsComponent: "AuditTask",
      listLabel: "ITEMS TO REVIEW",
      roles: [UserRole.OPERATOR],
      baseUrl: "rejectionreview",
      filterByOwners: true,
      manualReviewMinimumRatio: 0,
      groupTasksByPharmacy: true,
      actions: {
        decline: {
          label: "REJECT REMAINING",
          labelImg: DeclineImg,
          claimAction: ClaimAction.REJECT,
          nextTaskState: TaskState.REJECTED,
          labelClassName: "mainview_decline_button",
        },
        save: {
          label: "HOLD REMAINING",
          nextTaskState: TaskState.NEEDS_REJECTED_REVIEW,
          claimAction: ClaimAction.HOLD,
          labelClassName: "mainview_button",
        },
        approve: {
          label: "RE-APPROVE REMAINING",
          nextTaskState: TaskState.NEEDS_FINAL_APPROVAL,
          claimAction: ClaimAction.APPROVE,
          labelClassName: "mainview_approve_button",
          labelImg: ApproveImg,
        },
      },
    },
    Billing: {
      taskState: TaskState.PAY,
      taskListComponent: "default",
      detailsComponent: "PayorTask",
      listLabel: "ITEMS TO REVIEW",
      roles: [UserRole.PAYOR],
      baseUrl: "payor",
      groupTasksByPharmacy: true,
      manualReviewMinimumRatio: 0,
      actions: {
        approve: {
          label: "ISSUE",
          labelClassName: "mainview_approve_button",
          nextTaskState: TaskState.COMPLETED,
          claimAction: ClaimAction.APPROVE,
          labelImg: ApproveImg,
          enableOnConfig: "enableRealPayments",
        },
        markApprove: {
          label: "ISSUE",
          labelClassName: "mainview_approve_button",
          labelImg: ApproveImg,
          nextTaskState: TaskState.COMPLETED,
          claimAction: ClaimAction.APPROVE,
          disableOnConfig: "enableRealPayments",
        },
        decline: {
          label: "REJECT",
          labelClassName: "mainview_decline_button",
          labelImg: DeclineImg,
          claimAction: ClaimAction.REJECT,
          nextTaskState: TaskState.NEEDS_REJECTED_REVIEW,
        },
      },
    },
    Rejected: {
      taskState: TaskState.REJECTED,
      taskListComponent: "default",
      detailsComponent: "AuditTask",
      listLabel: "ITEMS",
      actions: {},
      roles: [UserRole.AUDITOR],
      baseUrl: "rejected",
      hideImagesDefault: true,
      manualReviewMinimumRatio: 0,
    },
    Completed: {
      taskState: TaskState.COMPLETED,
      taskListComponent: "default",
      detailsComponent: "AuditTask",
      listLabel: "ITEMS",
      actions: {},
      roles: [UserRole.AUDITOR],
      baseUrl: "completed",
      hideImagesDefault: true,
      groupTasksByPharmacy: true,
      manualReviewMinimumRatio: 0,
    },
    Admin: {
      panelComponent: "Admin",
      roles: [UserRole.ADMIN],
      baseUrl: "admin",
    },
  },
  dataStore: {
    type: DataStoreType.REST,
    endpointRoot:
      process.env.REACT_APP_MAISHA_API_HOST ||
      "https://staging-service.maishameds.org",
  },
};
