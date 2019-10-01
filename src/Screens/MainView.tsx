import React from "react";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import DataTable from "../Components/DataTable";
import ImageRow from "../Components/ImageRow";
import LabelTextInput from "../Components/LabelTextInput";
import LabelWrapper from "../Components/LabelWrapper";
import TaskList from "../Components/TaskList";
import TextItem from "../Components/TextItem";
import {
  ClaimTask,
  ReimbursementTask,
  Task,
  tasksForRole,
  UserRole,
  userRoles
} from "../store/corestore";
import { roleName } from "../util/UIUtils";
import MainChrome from "./MainChrome";
import "./MainView.css";

type Props = {};
type State = {
  notes: string;
  roles: UserRole[];
  tasksForRoles: Task[][];
  selectedTaskIndex: number | null;
};

class MainView extends React.Component<Props, State> {
  state = {
    notes: "",
    roles: [],
    selectedTaskIndex: -1,
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

  _onNotesChanged = (notes: string) => {
    this.setState({ notes });
  };

  _onApprove() {
    // Get the notes and send the approval call
  }

  _onDecline() {
    this.setState({ notes: "" });
    // TODO: Send some sort of call to remove it
  }

  _renderClaimDetails = (task: Task) => {
    const claim = task as ClaimTask;
    // TODO: Remove temp image URLs
    const claimImageURLs = [
      "https://vetstreet-brightspot.s3.amazonaws.com/7d/8b/98ea05c4403e8d4163dc8c8991c0/kitten-in-bed-thinkstockphotos-466265898.jpg",
      "https://vetstreet-brightspot.s3.amazonaws.com/7d/8b/98ea05c4403e8d4163dc8c8991c0/kitten-in-bed-thinkstockphotos-466265898.jpg",
      "https://vetstreet-brightspot.s3.amazonaws.com/7d/8b/98ea05c4403e8d4163dc8c8991c0/kitten-in-bed-thinkstockphotos-466265898.jpg"
    ];

    return (
      <LabelWrapper label="DETAILS VIEW">
        <TextItem
          data={{
            Patient: `${claim.patientFirstName} ${claim.patientLastName}`
          }}
        />
        <TextItem data={{ Item: claim.item }} />
        <ImageRow imageURLs={claimImageURLs} />
        <LabelTextInput onTextChange={this._onNotesChanged} label={"Notes"} />
        <div className="mainview_button_row">
          <Button label="Decline" onClick={() => console.log("CLICKED")} />
          <Button label="Approve" onClick={() => console.log("CLICKED")} />
        </div>
      </LabelWrapper>
    );
  };

  _renderReimbursementDetails = (task: Task) => {
    const reimbursement = task as ReimbursementTask;
    if (!reimbursement || !reimbursement.claims) return null;
    const claimAmounts = reimbursement.claims.map(task => {
      const claim = task as ClaimTask;
      return claim.claimedCost;
    });
    const claimsTotal = claimAmounts.reduce(
      (sum, claimedCost) => sum + claimedCost
    );

    let cleanedData: any[] = [];
    reimbursement.claims.forEach((value: Task) => {
      const item = value as ClaimTask;
      let row: any = {};
      row["Patient"] = `${item.patientFirstName} ${item.patientLastName}`;
      row["Item"] = item.item;
      row["Reimbursement"] = item.claimedCost;
      row["Notes"] = item.notes;
      cleanedData.push(row);
    });

    return (
      <LabelWrapper label="DETAILS VIEW">
        <TextItem data={{ Pharmacy: reimbursement.site.name }} />
        {!!reimbursement.site.phone && (
          <TextItem data={{ Phone: reimbursement.site.phone }} />
        )}
        <TextItem
          data={{ "Total Reimbursement": claimsTotal.toString() + "KSh" }}
        />
        <DataTable data={cleanedData} />
        <LabelTextInput onTextChange={this._onNotesChanged} label="Notes" />
        <div className="mainview_button_row">
          <Button
            label="Payment Complete"
            onClick={() => console.log("Payment complete")}
          />
        </div>
      </LabelWrapper>
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
      <TaskList
        onSelect={this._onTaskSelect}
        tasks={this.state.tasksForRoles[index]}
        renderItem={renderer}
        className="mainview_tasklist"
      />
    );
  }

  _renderDetailsPanel(index: number) {
    const renderer =
      this.state.roles[index] === UserRole.AUDITOR
        ? this._renderClaimDetails
        : this._renderReimbursementDetails;
    return (
      <div key={index} style={{ width: "100%" }}>
        {this.state.selectedTaskIndex >= 0 &&
          renderer(
            this.state.tasksForRoles[index][this.state.selectedTaskIndex]
          )}
      </div>
    );
  }

  _onTaskSelect = (index: number) => {
    this.setState({ selectedTaskIndex: index });
  };

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
        {this.state.roles.map((_, index) => {
          return (
            <TabPanel
              key={"tab_" + index}
              style={{
                display: "flex",
                flexDirection: "row"
              }}
            >
              {this._renderRolePanel(index)}
              {this._renderDetailsPanel(index)}
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
