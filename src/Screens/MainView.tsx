import React from "react";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { ListItem } from "../Components/ListItem";
import { Task, UserRole } from "../sharedtypes";
import { defaultConfig, isCustomPanel } from "../store/config";
import { userRoles } from "../store/corestore";
import AdminPanel from "./AdminPanel";
import { AuditorDetails } from "./AuditorPanel";
import MainChrome from "./MainChrome";
import "./MainView.css";
import { OperatorDetails } from "./OperatorPanel";
import { PayorDetails } from "./PayorPanel";
import TaskPanel, { DetailsComponentProps } from "./TaskPanel";

type Props = {};
type State = {
  roles: UserRole[];
};

const PanelComponents: {
  [key: string]: React.ComponentClass<{}>;
} = {
  Admin: AdminPanel
};

const ItemComponents: {
  [key: string]: React.ComponentClass<{ task: Task; isSelected: boolean }>;
} = {
  default: ListItem
};

const DetailsComponents: {
  [key: string]: React.ComponentClass<DetailsComponentProps>;
} = {
  AuditTask: AuditorDetails,
  PayorTask: PayorDetails,
  OperatorTask: OperatorDetails
};

class MainView extends React.Component<Props, State> {
  state: State = {
    roles: []
  };
  _onTabSelectCallback?: () => boolean;

  async componentDidMount() {
    const roles = await userRoles();
    this.setState({ roles });
  }

  _onTabSelect = (): boolean => {
    const result = !this._onTabSelectCallback || this._onTabSelectCallback();
    if (result) {
      this._onTabSelectCallback = undefined;
    }
    return result;
  };

  _registerForTabSelectCallback = (onTabSelect: () => boolean) => {
    this._onTabSelectCallback = onTabSelect;
  };

  _renderBody() {
    if (!this.state.roles.length) {
      return "User has no enabled roles";
    }

    const taskConfigs = defaultConfig.tabs;
    const tabs = Object.keys(taskConfigs).filter(taskName =>
      taskConfigs[taskName].roles.some(role => this.state.roles.includes(role))
    );

    return (
      <Tabs onSelect={this._onTabSelect}>
        <TabList>
          {tabs.map(tab => (
            <Tab key={tab}>{tab}</Tab>
          ))}
        </TabList>
        {tabs.map((tab, index) => {
          const tabConfig = taskConfigs[tab];
          let panelElement;
          if (isCustomPanel(tabConfig)) {
            if (!PanelComponents[tabConfig.panelComponent]) {
              throw new Error(`No component found for ${tab}`);
            }
            const PanelComponent = PanelComponents[tabConfig.panelComponent];
            panelElement = <PanelComponent />;
          } else {
            panelElement = (
              <TaskPanel
                taskState={tabConfig.taskState}
                itemComponent={ItemComponents[tabConfig.taskListComponent]}
                detailsComponent={DetailsComponents[tabConfig.detailsComponent]}
                listLabel={tabConfig.listLabel}
                actions={tabConfig.actions}
                registerForTabSelectCallback={
                  this._registerForTabSelectCallback
                }
              />
            );
          }
          return (
            <TabPanel
              key={"tab_" + index}
              style={{
                display: "flex",
                flexDirection: "row"
              }}
            >
              {panelElement}
            </TabPanel>
          );
        })}
      </Tabs>
    );
  }

  render() {
    return (
      <MainChrome>
        <div className="mainview_container">{this._renderBody()}</div>
      </MainChrome>
    );
  }
}

export default MainView;
