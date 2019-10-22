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
      panelComponent: "AuditTask",
      roles: [UserRole.AUDITOR]
    },
    Payor: {
      taskState: TaskState.PAY,
      taskListComponent: "PayorTask",
      detailsComponent: "PayorTask",
      roles: [UserRole.PAYOR]
    },
    Operator: {
      taskState: TaskState.FOLLOWUP,
      taskListComponent: "OperatorTask",
      detailsComponent: "OperatorTask",
      roles: [UserRole.OPERATOR]
    },
    Admin: {
      panelComponent: "Admin",
      roles: [UserRole.ADMIN]
    }
  }
};
