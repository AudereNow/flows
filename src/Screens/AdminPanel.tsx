import moment from "moment";
import React from "react";
import ReactMarkdown from "react-markdown";
import { RouteComponentProps, withRouter } from "react-router";
import { RowRenderProps, Column } from "react-table";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import ReactTooltip from "react-tooltip";
import Button from "../Components/Button";
import CannedNotesEditor from "../Components/CannedNotesEditor";
import CheckBox from "../Components/CheckBox";
import SearchableTable from "../Components/SearchableTable";
import {
  RemoteConfig,
  TaskChangeRecord,
  TaskState,
  UserRole
} from "../sharedtypes";
import {
  getAdminLogs,
  getAllChanges,
  getBestUserName,
  issuePayments,
  setRoles,
  updatePatientsTaskLists
} from "../store/corestore";
import { setConfig } from "../store/remoteconfig";
import { configuredComponent } from "../util/configuredComponent";

type RoleMap = {
  [roleName in UserRole]: boolean;
};

const NO_ROLES_MAP: RoleMap = {
  Auditor: false,
  Payor: false,
  Operator: false,
  Admin: false
};
const ADMIN_TABS = [
  "history",
  "instructions",
  "userRoles",
  "cannedResponses",
  "advanced"
];

type Props = {
  config: RemoteConfig;
};
type State = {
  allHistory: HistoryRow[];
  email: string;
  roleMap: RoleMap;
  paymentForm: {
    sending?: boolean;
    phoneNumber?: string;
    amount?: number;
  };
  opsInstructions?: string;
  savingOpsInstructions: boolean;
};

export type HistoryRow = {
  id: string;
  time: number;
  description: string;
  notes?: string;
  state?: TaskState;
};

const HISTORY_TABLE_COLUMNS: Column<any>[] = [
  {
    Header: "ID",
    accessor: "id",
    minWidth: 90,
    Cell: (props: RowRenderProps) => (
      <span className="mainview_table_id">{props.value}</span>
    )
  },
  {
    Header: "TIME",
    id: "timestamp",
    accessor: "time",
    Cell: (props: RowRenderProps) => renderTooltippedTime(props.value),
    minWidth: 60
  },
  {
    Header: "DESCRIPTION",
    accessor: "description",
    minWidth: 150
  },
  {
    Header: "NOTES",
    accessor: "notes",
    minWidth: 200,
    style: { whiteSpace: "unset" }
  }
];

const REMOTE_CONFIG_TOGGLES: { key: keyof RemoteConfig; label: string }[] = [
  { key: "allowDuplicateUploads", label: "Allow duplicate uploads" },
  { key: "enableRealPayments", label: "Enable Africa's talking payments" }
];

class AdminPanel extends React.Component<RouteComponentProps & Props, State> {
  state: State = {
    allHistory: [],
    email: "",
    roleMap: NO_ROLES_MAP,
    paymentForm: {},
    savingOpsInstructions: false
  };

  _fetchedAllData = false;

  async componentDidMount() {
    const allChanges = await getAllChanges();
    const allAdminLogs = await getAdminLogs();
    this._fetchedAllData = true;
    this.setState({
      roleMap: NO_ROLES_MAP,
      allHistory: this._recordsToChangeRows(allChanges).concat(
        this._recordsToAdminLogRows(allAdminLogs)
      )
    });
  }

  componentDidUpdate() {
    //@ts-ignore
    const tabName = this.props.match.params.tab;
    if (!tabName) {
      this.props.history.push(`/admin/${ADMIN_TABS[0]}`);
    }
  }

  _onEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ email: event.target.value });
  };

  _onRoleChange = (value: string, checked: boolean) => {
    const roleMap = Object.assign({}, this.state.roleMap);

    // @ts-ignore
    roleMap[value] = checked;
    this.setState({ roleMap });
  };

  _onPhoneNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      paymentForm: {
        ...this.state.paymentForm,
        phoneNumber: event.target.value
      }
    });
  };

  _onAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      paymentForm: {
        ...this.state.paymentForm,
        amount: parseInt(event.target.value)
      }
    });
  };
  _setUserRoles = async (event: React.FormEvent<HTMLFormElement>) => {
    // You need to call this, or else browsers reload the entire page by default
    // on every form submit.
    event.preventDefault();

    if (this.state.email.trim().length === 0) {
      alert("Please enter a user email");
      return;
    }

    const roles: UserRole[] = [];

    Object.keys(this.state.roleMap).forEach(role => {
      // @ts-ignore
      if (this.state.roleMap[role]) {
        roles.push(role as UserRole);
      }
    });

    const result = await setRoles(this.state.email, roles);

    alert(result);
    this.setState({ email: "", roleMap: NO_ROLES_MAP });
  };

  _renderRoles() {
    const roleBoxes = Object.keys(this.state.roleMap).map(role => (
      <CheckBox
        key={role}
        label={role as string}
        onCheckBoxSelect={this._onRoleChange}
        checked={(this.state.roleMap as any)[role]}
        value={role}
      />
    ));

    return <div>{roleBoxes}</div>;
  }

  _recordsToChangeRows = (records: TaskChangeRecord[]): HistoryRow[] => {
    return records.map(r => {
      return {
        id: r.taskID,
        time: r.timestamp,
        description: !!r.fromState
          ? `${r.by} changed task from ${r.fromState} to ${r.state}`
          : `${r.by} ${(r as any).desc}`,
        notes: r.notes || "",
        state: r.state
      };
    });
  };

  _recordsToAdminLogRows = (records: any[]): HistoryRow[] => {
    return records.map(r => {
      return {
        id: "",
        time: r.timestamp,
        description: r.desc,
        notes: r.notes || ""
      };
    });
  };

  _updatePatientsTaskLists = async () => {
    console.log("Starting update...");
    await updatePatientsTaskLists();
    console.log("Update complete");
  };

  _sendPayment = async () => {
    const { amount, phoneNumber } = this.state.paymentForm;
    if (!amount) {
      alert("Enter a payment amount");
      return;
    }
    if (amount > 500) {
      alert("Please an amount less than 500");
      return;
    }
    if (!phoneNumber) {
      alert("Enter a phone number");
      return;
    }

    this.setState({
      paymentForm: { ...this.state.paymentForm, sending: true }
    });

    try {
      const result = await issuePayments([
        {
          name: "Maisha Meds",
          reason: "TestPayment",
          amount,
          phoneNumber,
          currencyCode: "KES",
          metadata: {
            payorName: getBestUserName()
          }
        }
      ]);
      console.log(result);
      if (result.data && result.data.error) {
        alert("Payment failed");
      } else {
        alert("Payment issued successfully!");
      }
    } catch (e) {
      console.error(e);
      alert("Payment failed");
    }
    this.setState({
      paymentForm: { ...this.state.paymentForm, sending: false }
    });
  };

  _onOpsInstructionsEdit = () => {
    this.setState({ opsInstructions: this.props.config.opsInstructions });
  };

  _onOpsInstructionsChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    this.setState({ opsInstructions: event.target.value });
  };

  _onOpsInstructionsSave = async () => {
    this.setState({ savingOpsInstructions: true });
    await setConfig("opsInstructions", this.state.opsInstructions || "");
    this.setState({ savingOpsInstructions: false, opsInstructions: undefined });
  };

  _remoteConfigToggle = async (value: string, checked: boolean) => {
    await setConfig(
      value as keyof RemoteConfig,
      !this.props.config[value as keyof RemoteConfig]
    );
  };

  _onTabSelect = (index: number) => {
    this.props.history.push(`/admin/${ADMIN_TABS[index]}`);
  };

  render() {
    const { allHistory } = this.state;
    // @ts-ignore
    const tabName = this.props.match.params.tab;
    const selectedTabIndex = tabName ? ADMIN_TABS.indexOf(tabName) : 0;

    return (
      <div className="mainview_admin_panel">
        <Tabs onSelect={this._onTabSelect} selectedIndex={selectedTabIndex}>
          <TabList>
            <Tab>History</Tab>
            <Tab>Instructions</Tab>
            <Tab>User Roles</Tab>
            <Tab>Canned Responses</Tab>
            <Tab>Advanced</Tab>
          </TabList>
          <TabPanel>
            {this._fetchedAllData && (
              <SearchableTable
                downloadPrefix={"history_"}
                allData={allHistory}
                tableColumns={HISTORY_TABLE_COLUMNS}
              />
            )}
          </TabPanel>
          <TabPanel>
            <div>Instructions for secondary review:</div>
            {this.state.opsInstructions !== undefined && (
              <div>
                <textarea
                  defaultValue={this.props.config.opsInstructions}
                  onChange={this._onOpsInstructionsChange}
                  className="mainview_instructions_edit"
                />
              </div>
            )}
            <div>
              <ReactMarkdown
                source={
                  this.state.opsInstructions !== undefined
                    ? this.state.opsInstructions
                    : this.props.config.opsInstructions
                }
              />
            </div>
            <div>
              {this.state.opsInstructions === undefined ? (
                <Button label="Edit" onClick={this._onOpsInstructionsEdit} />
              ) : (
                <Button
                  label="Save"
                  onClick={this._onOpsInstructionsSave}
                  disabled={this.state.savingOpsInstructions}
                />
              )}
            </div>
          </TabPanel>
          <TabPanel>
            <form onSubmit={this._setUserRoles}>
              <input
                type="text"
                name="email"
                placeholder="email of user"
                onChange={this._onEmailChange}
              />
              {this._renderRoles()}
              <input type="submit" value="Submit" />
            </form>
          </TabPanel>
          <TabPanel>
            <div>
              <div>Edit Canned Claim Notes:</div>
              <CannedNotesEditor categoryName="claim" />
            </div>
            <div>
              <div>Edit Canned Task Notes:</div>
              <CannedNotesEditor categoryName="task" />
            </div>
          </TabPanel>
          <TabPanel>
            <div>
              <div>Config Options:</div>
              {REMOTE_CONFIG_TOGGLES.map(toggle => (
                <CheckBox
                  checked={!!this.props.config[toggle.key]}
                  label={toggle.label}
                  value={toggle.key}
                  onCheckBoxSelect={this._remoteConfigToggle}
                  key={toggle.key}
                />
              ))}
            </div>
            <div>
              <div>Issue Payment:</div>
              <input
                type="text"
                name="phone"
                placeholder="recipient phone number"
                onChange={this._onPhoneNumberChange}
              />
              <input
                type="text"
                name="amount"
                placeholder="payment amount"
                onChange={this._onAmountChange}
              />
              <Button
                onClick={this._sendPayment}
                label="Send Payment"
                disabled={this.state.paymentForm.sending}
              />
            </div>
            <div>
              <div>Update Patients Collection:</div>
              <Button onClick={this._updatePatientsTaskLists} label="Update" />
            </div>
          </TabPanel>
        </Tabs>
      </div>
    );
  }
}

function renderTooltippedTime(timestamp: number) {
  const tip = moment(timestamp).fromNow();
  const when = new Date(timestamp).toLocaleDateString();

  return (
    <span data-tip={tip}>
      {when}
      <ReactTooltip key={tip} />
    </span>
  );
}

export default configuredComponent<{}, Props>(
  withRouter(AdminPanel),
  config => ({
    config
  })
);
