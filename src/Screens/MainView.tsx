import "react-tabs/style/react-tabs.css";
import "./MainView.css";

import { AppConfig, defaultConfig, isCustomPanel } from "../store/config";
import { RouteComponentProps, withRouter } from "react-router";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import { Task, UserRole } from "../sharedtypes";
import TaskPanel, { DetailsComponentProps } from "./TaskPanel";

import AdminPanel from "./AdminPanel";
import { AuditorDetails } from "./AuditorPanel";
import { ListItem } from "../Components/ListItem";
import MainChrome from "./MainChrome";
import { OperatorDetails } from "./OperatorPanel";
import { PayorDetails } from "./PayorPanel";
import React from "react";
import { TaskGroup } from "../Components/TaskList";
import { dataStore } from "../transport/datastore";

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
  Admin: AdminPanel,
};

const ItemComponents: {
  [key: string]: React.ComponentType<{ tasks: TaskGroup; isSelected: boolean }>;
} = {
  default: ListItem,
};

const DetailsComponents: {
  [key: string]: React.ComponentType<DetailsComponentProps>;
} = {
  AuditTask: AuditorDetails,
  PayorTask: PayorDetails,
  OperatorTask: OperatorDetails,
};

class MainView extends React.Component<Props, State> {
  state: State = {
    roles: [],
    selectedTabIndex: 0,
  };
  _onTabSelectCallback?: () => boolean;

  async componentDidMount() {
    const roles = await dataStore.userRoles();

    this.setState({
      roles,
      selectedTabIndex: this._getSelectedTabIndex(defaultConfig, roles),
    });
  }

  componentDidUpdate(nextProps: Props) {
    if (!!this.props.startingTab) {
      const selectedTabIndex = this._getSelectedTabIndex(defaultConfig);
      if (
        selectedTabIndex !== this.state.selectedTabIndex &&
        !nextProps.hasOwnProperty("startingTab")
      ) {
        this.setState({ selectedTabIndex });
      }
    }
  }

  _onTabSelect = (index: number): boolean => {
    const result = !this._onTabSelectCallback || this._onTabSelectCallback();
    if (result) {
      this._onTabSelectCallback = undefined;
    }
    this.setState({ selectedTabIndex: index });

    // Set admin URL in browser if you're in the admin tab
    const tabName = this._getTabNames(defaultConfig);
    const tabConfig = defaultConfig.tabs[tabName[index]];
    if (isCustomPanel(tabConfig)) {
      this.props.history.push("/" + tabConfig.baseUrl);
    }
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

  _getSelectedTabIndex(config: AppConfig, roles = this.state.roles) {
    if (!this.props.startingTab) {
      return 0;
    }
    return Object.entries(config.tabs)
      .filter(([name, tabConfig]) =>
        tabConfig.roles.some(role => roles.includes(role))
      )
      .findIndex(
        ([name, tabConfig]) => tabConfig.baseUrl === this.props.startingTab
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
                config={tabConfig}
                initialSelectedPharmacyID={this.props.selectedTaskID}
                taskState={tabConfig.taskState}
                itemComponent={ItemComponents[tabConfig.taskListComponent]}
                detailsComponent={DetailsComponents[tabConfig.detailsComponent]}
                listLabel={tabConfig.listLabel}
                baseUrl={tabConfig.baseUrl}
                actions={tabConfig.actions}
                filterByOwners={tabConfig.filterByOwners || false}
                registerForTabSelectCallback={
                  this._registerForTabSelectCallback
                }
                hideImagesDefault={tabConfig.hideImagesDefault || false}
                showPreviousClaims={tabConfig.showPreviousClaims || false}
                taskConfig={tabConfig}
              />
            );
          }
          return (
            <TabPanel
              key={"tab_" + index}
              style={{
                display: "flex",
                flexDirection: "row",
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
