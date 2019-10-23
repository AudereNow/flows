import { UserRole, TaskState } from "../sharedtypes";

interface TabConfig {
  roles: UserRole[];
}

interface CustomPanelConfig extends TabConfig {
  panelComponent: string;
}

interface TaskConfig extends TabConfig {
  taskState: TaskState;
  taskListComponent: string;
  detailsComponent: string;
  listLabel: string;
  actionable?: boolean;
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
      roles: [UserRole.AUDITOR]
    },
    Payor: {
      taskState: TaskState.PAY,
      taskListComponent: "PayorTask",
      detailsComponent: "PayorTask",
      listLabel: "ITEMS TO REVIEW",
      roles: [UserRole.PAYOR]
    },
    Operator: {
      taskState: TaskState.FOLLOWUP,
      taskListComponent: "OperatorTask",
      detailsComponent: "OperatorTask",
      listLabel: "ITEMS TO REVIEW",
      roles: [UserRole.OPERATOR]
    },
    Rejected: {
      taskState: TaskState.REJECTED,
      taskListComponent: "AuditTask",
      detailsComponent: "AuditTask",
      listLabel: "ITEMS",
      actionable: false,
      roles: [UserRole.AUDITOR]
    },
    Complete: {
      taskState: TaskState.COMPLETED,
      taskListComponent: "AuditTask",
      detailsComponent: "AuditTask",
      listLabel: "ITEMS",
      actionable: false,
      roles: [UserRole.AUDITOR]
    },
    Admin: {
      panelComponent: "Admin",
      roles: [UserRole.ADMIN]
    }
  }
};
