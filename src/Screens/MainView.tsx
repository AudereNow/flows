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
  ClaimEntry,
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
          <span>{claim.entries.length} Entries</span>
        </div>
      </div>
    );
  };

  _onNotesChanged = (notes: string) => {
    this.setState({ notes });
  };

  _onApprove() {}

  _onDecline() {
    this.setState({ notes: "" });
  }

  _extractImageURLs = (claim: ClaimEntry) => {
    const claimImageURLs: string[] = [];
    if (!!claim.photoIDUri) {
      claimImageURLs.push(claim.photoIDUri);
    }
    if (!!claim.photoMedBatchUri) {
      claimImageURLs.push(claim.photoMedBatchUri);
    }
    if (!!claim.photoMedUri) {
      claimImageURLs.push(claim.photoMedUri);
    }
    return claimImageURLs;
  };

  _renderClaimEntryDetails = (entry: ClaimEntry) => {
    return (
      <LabelWrapper>
        <TextItem
          data={{ Date: new Date(entry.timestamp).toLocaleDateString() }}
        />
        <TextItem
          data={{
            Patient: `${entry.patientFirstName} ${entry.patientLastName}`
          }}
        />
        <TextItem data={{ Item: entry.item }} />
        <ImageRow imageURLs={this._extractImageURLs(entry)} />
      </LabelWrapper>
    );
  }

  _renderClaimDetails = (task: Task) => {
    const claim = task as ClaimTask;

    return (
      <LabelWrapper label="DETAILS VIEW">
        <TextItem data={{ Pharmacy: claim.site.name }} />
        {claim.entries.map(this._renderClaimEntryDetails)}
        <LabelTextInput onTextChange={this._onNotesChanged} label={"Notes"} />
        <div className="mainview_button_row">
          <Button label="Decline" onClick={this._onDecline} />
          <Button label="Approve" onClick={this._onApprove} />
        </div>
      </LabelWrapper>
    );
  };

  _renderReimbursementDetails = (task: Task) => {
    const reimbursement = task as ReimbursementTask;
    const claim = reimbursement.claim as ClaimTask;
    if (!reimbursement || !claim || !claim.entries) return null;
    const claimAmounts = claim.entries.map(entry => {
      return entry.claimedCost;
    });
    const claimsTotal = claimAmounts.reduce(
      (sum, claimedCost) => sum + claimedCost
    );

    let cleanedData: any[] = [];
    claim.entries.forEach((entry: ClaimEntry) => {
      let row: any = {};
      row["Patient"] = `${entry.patientFirstName} ${entry.patientLastName}`;
      row["Item"] = entry.item;
      row["Reimbursement"] = entry.claimedCost;
      cleanedData.push(row);
    });

    return (
      <LabelWrapper label="DETAILS VIEW">
        <TextItem data={{ Pharmacy: claim.site.name }} />
        {!!claim.site.phone && (
          <TextItem data={{ Phone: claim.site.phone }} />
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
    const claim = reimbursement.claim as ClaimTask;
    const previewName =
      "mainview_task_preview" + (isSelected ? " selected" : "");
    const claimAmounts = claim.entries.map(entry => {
      return entry.claimedCost;
    });
    const claimsTotal = claimAmounts.reduce(
      (sum, claimedCost) => sum + claimedCost
    );
    return (
      <div className={previewName}>
        <div className="mainview_preview_header">
          <span>{claim.site.name}</span>
        </div>
        <div>{"Total Reimbursement: " + claimsTotal + " KSh"}</div>
      </div>
    );
  };

  _renderRolePane(index: number) {
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

  _renderDetailsPane(index: number) {
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
              {this._renderRolePane(index)}
              {this._renderDetailsPane(index)}
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
