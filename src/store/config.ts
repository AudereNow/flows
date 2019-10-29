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
      taskListComponent: "AuditTask",
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
      taskListComponent: "PayorTask",
      detailsComponent: "PayorTask",
      listLabel: "ITEMS TO REVIEW",
      roles: [UserRole.PAYOR],
      actions: {
        decline: {
          label: "Decline Payent",
          nextTaskState: TaskState.FOLLOWUP
        },
        accept: {
          label: "Issue Payment",
          nextTaskState: TaskState.COMPLETED
        }
      }
    },
    Operator: {
      taskState: TaskState.FOLLOWUP,
      taskListComponent: "OperatorTask",
      detailsComponent: "OperatorTask",
      listLabel: "ITEMS TO REVIEW",
      roles: [UserRole.OPERATOR],
      actions: {}
    },
    Rejected: {
      taskState: TaskState.REJECTED,
      taskListComponent: "AuditTask",
      detailsComponent: "AuditTask",
      listLabel: "ITEMS",
      actions: {},
      roles: [UserRole.AUDITOR]
    },
    Complete: {
      taskState: TaskState.COMPLETED,
      taskListComponent: "AuditTask",
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
