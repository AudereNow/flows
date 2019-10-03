import React from "react";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import { UserRole, userRoles } from "../store/corestore";
import AdminPanel from "./AdminPanel";
import AuditorPanel from "./AuditorPanel";
import MainChrome from "./MainChrome";
import "./MainView.css";
import OperatorPanel from "./OperatorPanel";
import PayorPanel from "./PayorPanel";

type Props = {};
type State = {
  roles: UserRole[];
};

const RoleToPanelMap = {
  Auditor: AuditorPanel,
  Payor: PayorPanel,
  Operator: OperatorPanel,
  Admin: AdminPanel
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

    return (
      <Tabs>
        <TabList>
          {this.state.roles.map(r => (
            <Tab key={r}>{r}</Tab>
          ))}
        </TabList>
        {this.state.roles.map((role, index) => {
          const PanelTag = RoleToPanelMap[role];
          return (
            <TabPanel
              key={"tab_" + index}
              style={{
                display: "flex",
                flexDirection: "row"
              }}
            >
              <PanelTag />
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
