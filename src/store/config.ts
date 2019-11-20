import { RemoteConfig, TaskState, UserRole } from "../sharedtypes";

interface TabConfig {
  roles: UserRole[];
  baseUrl: string;
}

interface CustomPanelConfig extends TabConfig {
  panelComponent: string;
}

export interface ActionConfig {
  label: string;
  nextTaskState: TaskState;
  enableOnConfig?: keyof RemoteConfig;
  disableOnConfig?: keyof RemoteConfig;
}

export interface TaskConfig extends TabConfig {
  taskState: TaskState;
  taskListComponent: string;
  detailsComponent: string;
  listLabel: string;
  actions: { [key: string]: ActionConfig };
  hideImagesDefault?: boolean;
}

export interface AppConfig {
  tabs: {
    [tab: string]: TaskConfig | CustomPanelConfig;
  };
}

export function isCustomPanel(config: TabConfig): config is CustomPanelConfig {
  return (config as CustomPanelConfig).panelComponent !== undefined;
}

export const defaultConfig: AppConfig = {
  tabs: {
    "Primary Review": {
      taskState: TaskState.AUDIT,
      taskListComponent: "default",
      detailsComponent: "AuditTask",
      listLabel: "ITEMS TO REVIEW",
      roles: [UserRole.AUDITOR],
      baseUrl: "/auditor",
      actions: {
        decline: {
          label: "Decline",
          nextTaskState: TaskState.FOLLOWUP
        },
        approve: {
          label: "Approve",
          nextTaskState: TaskState.PAY
        }
      }
    },
    Payor: {
      taskState: TaskState.PAY,
      taskListComponent: "default",
      detailsComponent: "PayorTask",
      listLabel: "ITEMS TO REVIEW",
      roles: [UserRole.PAYOR],
      baseUrl: "/payor",
      actions: {
        decline: {
          label: "Decline Payment",
          nextTaskState: TaskState.FOLLOWUP
        },
        approve: {
          label: "Issue Payment",
          nextTaskState: TaskState.COMPLETED,
          enableOnConfig: "enableRealPayments"
        },
        markApprove: {
          label: "Mark Paid",
          nextTaskState: TaskState.COMPLETED,
          disableOnConfig: "enableRealPayments"
        }
      }
    },
    "Secondary Followup": {
      taskState: TaskState.FOLLOWUP,
      taskListComponent: "default",
      detailsComponent: "OperatorTask",
      listLabel: "ITEMS TO REVIEW",
      roles: [UserRole.OPERATOR],
      baseUrl: "/operator",
      actions: {
        decline: {
          label: "Reject",
          nextTaskState: TaskState.REJECTED
        },
        approve: {
          label: "Approve for Payment",
          nextTaskState: TaskState.PAY
        },
        sendToPrimary: {
          label: "Send to Primary Reviewer",
          nextTaskState: TaskState.AUDIT
        }
      }
    },
    Rejected: {
      taskState: TaskState.REJECTED,
      taskListComponent: "default",
      detailsComponent: "AuditTask",
      listLabel: "ITEMS",
      actions: {},
      roles: [UserRole.AUDITOR],
      baseUrl: "/rejected",
      hideImagesDefault: true
    },
    Completed: {
      taskState: TaskState.COMPLETED,
      taskListComponent: "default",
      detailsComponent: "AuditTask",
      listLabel: "ITEMS",
      actions: {},
      roles: [UserRole.AUDITOR],
      baseUrl: "/completed",
      hideImagesDefault: true
    },
    Admin: {
      panelComponent: "Admin",
      roles: [UserRole.ADMIN],
      baseUrl: "/admin"
    }
  }
};
