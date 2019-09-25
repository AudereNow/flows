import React from "react";
import MainChrome from "./MainChrome";
import { userRoles, UserRole } from "../store/corestore";
import { roleName } from "../util/UIUtils";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import "./MainView.css";

type Props = {};
type State = {
  roles: UserRole[];
};

class MainView extends React.Component<Props, State> {
  state = {
    roles: []
  };

  async componentDidMount() {
    const roles = await userRoles();
    this.setState({ roles });
  }

  _renderRolePanel(role: UserRole) {
    return <TabPanel>Amazeballs stuff</TabPanel>;
  }

  _renderBody() {
    if (!this.state.roles.length) {
      return "User has no enabled roles";
    }

    return (
      <Tabs>
        <TabList>
          {this.state.roles.map(r => (
            <Tab>{roleName(r)}</Tab>
          ))}
        </TabList>
        {this.state.roles.map(r => this._renderRolePanel(r))}
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
