import React from "react";
import "react-tabs/style/react-tabs.css";
import Button from "../Components/Button";
import DataTable from "../Components/DataTable";
import ImageRow from "../Components/ImageRow";
import LabelTextInput from "../Components/LabelTextInput";
import LabelWrapper from "../Components/LabelWrapper";
import TextItem from "../Components/TextItem";
import {
  ClaimTask,
  ReimbursementTask,
  Task,
  tasksForRole,
  UserRole,
  userRoles
} from "../store/corestore";
import MainChrome from "./MainChrome";
import "./MainView.css";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import "./MainView.css";
import TaskList from "../Components/TaskList";
import AdminPanel from "../Components/AdminPanel";

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

  _onApprove() {}

  _onDecline() {
    this.setState({ notes: "" });
  }

  _extractImageURLs = (claim: ClaimTask) => {
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

  _renderClaimDetails = (task: Task) => {
    const claim = task as ClaimTask;
    let patientProps = [];
    if (!!claim.patientAge) patientProps.push(claim.patientAge);
    if (!!claim.patientSex && claim.patientSex!.length > 0)
      patientProps.push(claim.patientSex);
    const patientInfo =
      patientProps.length > 0 ? `(${patientProps.join(", ")})` : "";

    return (
      <LabelWrapper label="DETAILS VIEW">
        <TextItem data={{ Pharmacy: claim.site.name }} />
        <TextItem
          data={{ Date: new Date(claim.timestamp).toLocaleDateString() }}
        />
        <TextItem
          data={{
            Patient: `${claim.patientFirstName} ${claim.patientLastName} ${patientInfo}`
          }}
        />
        <TextItem data={{ Item: claim.item }} />
        <ImageRow imageURLs={this._extractImageURLs(claim)} />
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

  _renderRolePane(index: number) {
    const adminIndex = this.state.roles.findIndex(r => r === UserRole.ADMIN);

    if (adminIndex === index) {
      console.log("Rendering admin panel");
      return (
        <TabPanel key="adminpanel">
          <AdminPanel />
        </TabPanel>
      );
    }

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
            <Tab key={r}>{r}</Tab>
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
