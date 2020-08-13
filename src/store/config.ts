import ApproveImg from "../assets/approve.png";
import DeclineImg from "../assets/decline.png";
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
  labelClassName?: string;
  labelImg?: string;
  nextTaskState: TaskState;
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
      baseUrl: "auditor",
      showPreviousClaims: true,
      groupTasksByPharmacy: true,
      actions: {
        decline: {
          label: "DECLINE",
          nextTaskState: TaskState.FOLLOWUP,
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
          label: "SAVE NOTE",
          nextTaskState: TaskState.AUDIT,
          labelClassName: "mainview_button",
        },
      },
    },
    Payor: {
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
          nextTaskState: TaskState.FOLLOWUP,
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
    "Secondary Followup": {
      taskState: TaskState.FOLLOWUP,
      taskListComponent: "default",
      detailsComponent: "OperatorTask",
      listLabel: "ITEMS TO REVIEW",
      roles: [UserRole.OPERATOR],
      baseUrl: "operator",
      filterByOwners: true,
      actions: {
        decline: {
          label: "REJECT",
          labelImg: DeclineImg,
          nextTaskState: TaskState.REJECTED,
          labelClassName: "mainview_decline_button",
        },
        approve: {
          label: "APPROVE FOR PAYMENT",
          nextTaskState: TaskState.PAY,
          labelClassName: "mainview_approve_button",
          labelImg: ApproveImg,
        },
        sendToPrimary: {
          label: "SEND TO PRIMARY REVIEWER",
          nextTaskState: TaskState.AUDIT,
          labelClassName: "mainview_neutral_button",
        },
        save: {
          label: "SAVE NOTE",
          nextTaskState: TaskState.FOLLOWUP,
          labelClassName: "mainview_button",
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
};
