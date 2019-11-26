import moment from "moment";
import React, { ChangeEvent } from "react";
import { RowRenderProps } from "react-table";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import ReactTooltip from "react-tooltip";
import ReactMarkdown from "react-markdown";
import Button from "../Components/Button";
import CheckBox from "../Components/CheckBox";
import SearchableTable from "../Components/SearchableTable";
import { RemoteConfig, TaskChangeRecord, UserRole } from "../sharedtypes";
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
  time: string;
  description: string;
  notes?: string;
};

const HISTORY_TABLE_COLUMNS = [
  { Header: "ID", accessor: "id", minWidth: 90 },
  {
    Header: "Time",
    accessor: "time",
    Cell: (props: RowRenderProps) => renderTooltippedTime(props.value),
    minWidth: 60
  },
  {
    Header: "Description",
    accessor: "description",
    minWidth: 150
  },
  {
    Header: "Notes",
    accessor: "notes",
    minWidth: 200,
    style: { whiteSpace: "unset" }
  }
];

const REMOTE_CONFIG_TOGGLES: { key: keyof RemoteConfig; label: string }[] = [
  { key: "allowDuplicateUploads", label: "Allow duplicate uploads" },
  { key: "enableRealPayments", label: "Enable Africa's talking payments" }
];

class AdminPanel extends React.Component<Props, State> {
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

  _onEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ email: event.target.value });
  };

  _onRoleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const roleMap = Object.assign({}, this.state.roleMap);

    // @ts-ignore
    roleMap[event.target.name] = event.target.checked;
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
      <div key={role}>
        <label>
          {role as string}:
          <input
            type="checkbox"
            name={role}
            // @ts-ignore
            checked={this.state.roleMap[role]}
            onChange={this._onRoleChange}
          />
        </label>
      </div>
    ));

    return <div>{roleBoxes}</div>;
  }

  _recordsToChangeRows = (records: TaskChangeRecord[]): HistoryRow[] => {
    return records.map(r => {
      return {
        id: r.taskID,
        time: new Date(r.timestamp).toLocaleDateString(),
        description: !!r.fromState
          ? `${r.by} changed task from ${r.fromState} to ${r.state}`
          : `${r.by} ${(r as any).desc}`,
        notes: r.notes || ""
      };
    });
  };

  _recordsToAdminLogRows = (records: any[]): HistoryRow[] => {
    return records.map(r => {
      return {
        id: "",
        time: new Date(r.timestamp).toLocaleDateString(),
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

  _remoteConfigToggle = async (e: ChangeEvent<HTMLInputElement>) => {
    const key = e.currentTarget.getAttribute(
      "data-value"
    ) as keyof RemoteConfig;
    await setConfig(key, !this.props.config[key]);
  };

  render() {
    const { allHistory } = this.state;

    return (
      <div className="mainview_admin_panel">
        <Tabs>
          <TabList>
            <Tab>History</Tab>
            <Tab>Instructions</Tab>
            <Tab>User Roles</Tab>
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

function renderTooltippedTime(timestamp: string) {
  const tip = moment(timestamp).fromNow();
  const when = timestamp;

  return (
    <span data-tip={tip}>
      {when}
      <ReactTooltip key={tip} />
    </span>
  );
}

export default configuredComponent<{}, Props>(AdminPanel, config => ({
  config
}));
