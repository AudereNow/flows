import React from "react";
import MainChrome from "./MainChrome";
import {
  userRoles,
  UserRole,
  tasksForRole,
  Task,
  ClaimTask,
  ReimbursementTask
} from "../store/corestore";
import { roleName } from "../util/UIUtils";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import "./MainView.css";
import TaskList from "../Components/TaskList";

type Props = {};
type State = {
  roles: UserRole[];
  tasksForRoles: Task[][]; // One array of tasks for each role
};

class MainView extends React.Component<Props, State> {
  state = {
    roles: [],
    tasksForRoles: []
  };

  async componentDidMount() {
    const roles = await userRoles();
    const tasksForRoles = await Promise.all(roles.map(r => tasksForRole(r)));
    this.setState({ roles, tasksForRoles });
  }

  _renderTaskListClaim = (task: Task, isSelected: boolean) => {
    const claim = task as ClaimTask;
    const previewName =
      "mainview_task_preview" + (isSelected ? " selected" : "");
    return (
      <div className={previewName}>
        <div className="mainview_preview_header">
          <span>{claim.site.name}</span>
          <span>{new Date(claim.timestamp).toLocaleDateString()}</span>
        </div>
        <div>{claim.patientFirstName + " " + claim.patientLastName}</div>
        <div>{`${claim.item}: ${claim.totalCost} KSh (${claim.claimedCost})`}</div>
      </div>
    );
  };

  _renderTaskListReimbursement = (task: Task, isSelected: boolean) => {
    const reimbursement = task as ReimbursementTask;
    const previewName =
      "mainview_task_preview" + (isSelected ? " selected" : "");
    const claimAmounts = reimbursement.claims.map(task => {
      const claim = task as ClaimTask;
      return claim.claimedCost;
    });
    const claimsTotal = claimAmounts.reduce(
      (sum, claimedCost) => sum + claimedCost
    );
    return (
      <div className={previewName}>
        <div className="mainview_preview_header">
          <span>{reimbursement.site.name}</span>
        </div>
        <div>{"Total Reimbursement: " + claimsTotal + " KSh"}</div>
      </div>
    );
  };

  _renderRolePanel(index: number) {
    const renderer =
      this.state.roles[index] === UserRole.AUDITOR
        ? this._renderTaskListClaim
        : this._renderTaskListReimbursement;

    return (
      <TabPanel key={index}>
        <TaskList
          tasks={this.state.tasksForRoles[index]}
          renderItem={renderer}
          className="mainview_tasklist"
        />
      </TabPanel>
    );
  }

  _renderBody() {
    if (!this.state.roles.length) {
      return "User has no enabled roles";
    }

    return (
      <Tabs>
        <TabList>
          {this.state.roles.map(r => (
            <Tab key={r}>{roleName(r)}</Tab>
          ))}
        </TabList>
        {this.state.roles.map((_, index) => this._renderRolePanel(index))}
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
