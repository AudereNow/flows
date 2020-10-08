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
  claimAction?: ClaimAction;
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
      showPreviousClaims: true,
      groupTasksByPharmacy: true,
      actions: {
        decline: {
          label: "DECLINE",
          claimAction: ClaimAction.REJECT,
          nextTaskState: TaskState.NEEDS_REJECTED_REVIEW,
          labelClassName: "mainview_decline_button",
          labelImg: DeclineImg,
        },
        approve: {
          label: "APPROVE",
          nextTaskState: TaskState.NEEDS_PATIENT_REVIEW,
          labelClassName: "mainview_approve_button",
          labelImg: ApproveImg,
        },
        save: {
          label: "HOLD",
          nextTaskState: TaskState.RECEIVED,
          labelClassName: "mainview_button",
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
      showPreviousClaims: true,
      groupTasksByPharmacy: true,
      actions: {
        decline: {
          label: "DECLINE",
          claimAction: ClaimAction.REJECT,
          nextTaskState: TaskState.NEEDS_REJECTED_REVIEW,
          labelClassName: "mainview_decline_button",
          labelImg: DeclineImg,
        },
        approve: {
          label: "APPROVE",
          nextTaskState: TaskState.NEEDS_FINAL_APPROVAL,
          labelClassName: "mainview_approve_button",
          labelImg: ApproveImg,
        },
        save: {
          label: "HOLD",
          nextTaskState: TaskState.NEEDS_PATIENT_REVIEW,
          labelClassName: "mainview_button",
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
      showPreviousClaims: true,
      groupTasksByPharmacy: true,
      actions: {
        decline: {
          label: "DECLINE",
          claimAction: ClaimAction.REJECT,
          nextTaskState: TaskState.NEEDS_REJECTED_REVIEW,
          labelClassName: "mainview_decline_button",
          labelImg: DeclineImg,
        },
        approve: {
          label: "APPROVE",
          nextTaskState: TaskState.PAY,
          labelClassName: "mainview_approve_button",
          labelImg: ApproveImg,
        },
        save: {
          label: "HOLD",
          nextTaskState: TaskState.NEEDS_FINAL_APPROVAL,
          labelClassName: "mainview_button",
        },
      },
    },
    "Rejection Review": {
      taskState: TaskState.NEEDS_REJECTED_REVIEW,
      taskListComponent: "default",
      detailsComponent: "OperatorTask",
      listLabel: "ITEMS TO REVIEW",
      roles: [UserRole.OPERATOR],
      baseUrl: "rejectionreview",
      filterByOwners: true,
      actions: {
        decline: {
          label: "CONFIRM REJECTION",
          labelImg: DeclineImg,
          claimAction: ClaimAction.REJECT,
          nextTaskState: TaskState.REJECTED,
          labelClassName: "mainview_decline_button",
        },
        approve: {
          label: "RE-APPROVE",
          nextTaskState: TaskState.NEEDS_FINAL_APPROVAL,
          labelClassName: "mainview_approve_button",
          labelImg: ApproveImg,
        },
        save: {
          label: "HOLD",
          nextTaskState: TaskState.NEEDS_REJECTED_REVIEW,
          labelClassName: "mainview_button",
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
      actions: {
        decline: {
          label: "DECLINE PAYMENT",
          labelClassName: "mainview_decline_button",
          labelImg: DeclineImg,
          claimAction: ClaimAction.REJECT,
          nextTaskState: TaskState.NEEDS_REJECTED_REVIEW,
        },
        approve: {
          label: "ISSUE PAYMENT",
          labelClassName: "mainview_approve_button",
          nextTaskState: TaskState.COMPLETED,
          labelImg: ApproveImg,
          enableOnConfig: "enableRealPayments",
        },
        markApprove: {
          label: "MARK PAID",
          labelClassName: "mainview_approve_button",
          labelImg: ApproveImg,
          nextTaskState: TaskState.COMPLETED,
          disableOnConfig: "enableRealPayments",
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
    },
    Admin: {
      panelComponent: "Admin",
      roles: [UserRole.ADMIN],
      baseUrl: "admin",
    },
  },
  dataStore: {
    type: DataStoreType.REST,
    //endpointRoot: "http://localhost:5001/flows-app-staging/us-central1/api",
    endpointRoot: "https://staging-service.maishameds.org",
    //endpointRoot:
    //  "https://us-central1-flows-app-staging.cloudfunctions.net/api",
  },
};
