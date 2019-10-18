import React from "react";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { userRoles } from "../store/corestore";
import AdminPanel from "./AdminPanel";
import AuditorPanel from "./AuditorPanel";
import MainChrome from "./MainChrome";
import "./MainView.css";
import { OperatorItem, OperatorDetails } from "./OperatorPanel";
import { PayorItem, PayorDetails } from "./PayorPanel";
import { isCustomPanel, defaultConfig } from "../store/config";
import TaskPanel from "./TaskPanel";
import { UserRole, Task } from "../sharedtypes";

type Props = {};
type State = {
  roles: UserRole[];
};

const PanelComponents: {
  [key: string]: React.ComponentClass<{}>;
} = {
  Admin: AdminPanel,
  AuditTask: AuditorPanel
};

const ItemComponents: {
  [key: string]: React.ComponentClass<{ task: Task; isSelected: boolean }>;
} = {
  PayorTask: PayorItem,
  OperatorTask: OperatorItem
};

const DetailsComponents: {
  [key: string]: React.ComponentClass<{ task: Task }>;
} = {
  PayorTask: PayorDetails,
  OperatorTask: OperatorDetails
};

class MainView extends React.Component<Props, State> {
  state: State = {
    roles: []
  };
  async componentDidMount() {
    const roles = await userRoles();
    this.setState({ roles });
  }

  _renderBody() {
    if (!this.state.roles.length) {
      return "User has no enabled roles";
    }

    const taskConfigs = defaultConfig.tabs;
    const tabs = Object.keys(taskConfigs).filter(taskName =>
      taskConfigs[taskName].roles.some(role => this.state.roles.includes(role))
    );

    return (
      <Tabs>
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
                taskCollection={tabConfig.taskCollection}
                itemComponent={ItemComponents[tabConfig.taskListComponent]}
                detailsComponent={DetailsComponents[tabConfig.detailsComponent]}
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
