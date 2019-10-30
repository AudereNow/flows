import { UserRole, TaskState } from "../sharedtypes";

interface TabConfig {
  roles: UserRole[];
}

interface CustomPanelConfig extends TabConfig {
  panelComponent: string;
}

export interface ActionConfig {
  label: string;
  nextTaskState: TaskState;
  enableOnConfig?: string;
  disableOnConfig?: string;
}

export interface TaskConfig extends TabConfig {
  taskState: TaskState;
  taskListComponent: string;
  detailsComponent: string;
  listLabel: string;
  actions: { [key: string]: ActionConfig };
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
    Auditor: {
      taskState: TaskState.AUDIT,
      taskListComponent: "default",
      detailsComponent: "AuditTask",
      listLabel: "ITEMS TO REVIEW",
      roles: [UserRole.AUDITOR],
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
    Operator: {
      taskState: TaskState.FOLLOWUP,
      taskListComponent: "default",
      detailsComponent: "OperatorTask",
      listLabel: "ITEMS TO REVIEW",
      roles: [UserRole.OPERATOR],
      actions: {
        decline: {
          label: "Reject",
          nextTaskState: TaskState.REJECTED
        },
        approve: {
          label: "Approve for Payment",
          nextTaskState: TaskState.PAY
        }
      }
    },
    Rejected: {
      taskState: TaskState.REJECTED,
      taskListComponent: "default",
      detailsComponent: "AuditTask",
      listLabel: "ITEMS",
      actions: {},
      roles: [UserRole.AUDITOR]
    },
    Complete: {
      taskState: TaskState.COMPLETED,
      taskListComponent: "default",
      detailsComponent: "AuditTask",
      listLabel: "ITEMS",
      actions: {},
      roles: [UserRole.AUDITOR]
    },
    Admin: {
      panelComponent: "Admin",
      roles: [UserRole.ADMIN]
    }
  }
};
