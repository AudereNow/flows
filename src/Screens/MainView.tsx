import React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { ListItem } from "../Components/ListItem";
import { Task, UserRole } from "../sharedtypes";
import { AppConfig, defaultConfig, isCustomPanel } from "../store/config";
import { userRoles } from "../store/corestore";
import AdminPanel from "./AdminPanel";
import { AuditorDetails } from "./AuditorPanel";
import MainChrome from "./MainChrome";
import "./MainView.css";
import { OperatorDetails } from "./OperatorPanel";
import { PayorDetails } from "./PayorPanel";
import TaskPanel, { DetailsComponentProps } from "./TaskPanel";

type Props = RouteComponentProps & {
  // To simplify our implementation, you should change MainView's key if you
  // change either of these props.
  selectedTaskID?: string;
  startingTab?: string;
};

type State = {
  roles: UserRole[];
  selectedTabIndex: number;
};

const PanelComponents: {
  [key: string]: React.ComponentType<{}>;
} = {
  Admin: AdminPanel
};

const ItemComponents: {
  [key: string]: React.ComponentType<{ task: Task; isSelected: boolean }>;
} = {
  default: ListItem
};

const DetailsComponents: {
  [key: string]: React.ComponentType<DetailsComponentProps>;
} = {
  AuditTask: AuditorDetails,
  PayorTask: PayorDetails,
  OperatorTask: OperatorDetails
};

class MainView extends React.Component<Props, State> {
  state: State = {
    roles: [],
    selectedTabIndex: 0
  };
  _onTabSelectCallback?: () => boolean;

  async componentDidMount() {
    const roles = await userRoles();
    let selectedTabIndex = 0;

    if (!!this.props.startingTab) {
      selectedTabIndex = Object.keys(defaultConfig.tabs).findIndex(
        tabName => tabName.toLowerCase() === this.props.startingTab
      );
    }

    this.setState({ roles, selectedTabIndex });
  }

  _onTabSelect = (index: number): boolean => {
    const result = !this._onTabSelectCallback || this._onTabSelectCallback();
    if (result) {
      this._onTabSelectCallback = undefined;
    }
    this.setState({ selectedTabIndex: index });
    return result;
  };

  _registerForTabSelectCallback = (onTabSelect: () => boolean) => {
    this._onTabSelectCallback = onTabSelect;
  };

  _getTabNames(config: AppConfig) {
    const taskConfigs = config.tabs;
    return Object.keys(taskConfigs).filter(taskName =>
      taskConfigs[taskName].roles.some(role => this.state.roles.includes(role))
    );
  }

  _renderBody() {
    if (!this.state.roles.length) {
      return "User has no enabled roles";
    }

    const taskConfigs = defaultConfig.tabs;
    const tabs = this._getTabNames(defaultConfig);

    return (
      <Tabs
        onSelect={this._onTabSelect}
        selectedIndex={this.state.selectedTabIndex}
      >
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
                initialSelectedTaskID={this.props.selectedTaskID}
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

export default withRouter(MainView);
