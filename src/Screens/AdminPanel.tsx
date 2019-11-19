import moment from "moment";
import React from "react";
import { RowRenderProps } from "react-table";
import { Tab, TabList, TabPanel, Tabs } from "react-tabs";
import ReactTooltip from "react-tooltip";
import SearchableTable from "../Components/SearchableTable";
import { TaskChangeRecord, UserRole } from "../sharedtypes";
import { getAdminLogs, getAllChanges, setRoles } from "../store/corestore";

type RoleMap = {
  [roleName in UserRole]: boolean;
};

const NO_ROLES_MAP: RoleMap = {
  Auditor: false,
  Payor: false,
  Operator: false,
  Admin: false
};

type Props = {};
type State = {
  allChanges: ChangeRow[];
  allAdminLogs: AdminLogRow[];
  email: string;
  roleMap: RoleMap;
};

export type ChangeRow = {
  taskID: string;
  timestamp: string;
  description: string;
  notes?: string;
};

export type AdminLogRow = {
  userID: string;
  desc: string;
  timestamp: string;
  userName: string;
};

const CHANGE_HISTORY_TABLE_COLUMNS = [
  { Header: "Task ID", accessor: "taskID", minWidth: 100 },
  {
    Header: "Time",
    accessor: "timestamp",
    Cell: (props: RowRenderProps) => renderTooltippedTime(props.value),
    minWidth: 60
  },
  { Header: "Description", accessor: "description", minWidth: 150 },
  {
    Header: "Notes",
    accessor: "notes",
    minWidth: 200,
    style: { whiteSpace: "unset" }
  }
];

const ADMIN_LOGS_TABLE_COLUMNS = [
  { Header: "ID", accessor: "userID", minWidth: 200 },
  { Header: "Name", accessor: "userName", minWidth: 100 },
  { Header: "Description", accessor: "desc", minWidth: 150 },
  {
    Header: "Time",
    accessor: "timestamp",
    Cell: (props: RowRenderProps) => renderTooltippedTime(props.value),
    minWidth: 100
  }
];

class AdminPanel extends React.Component<Props, State> {
  state: State = {
    allAdminLogs: [],
    allChanges: [],
    email: "",
    roleMap: NO_ROLES_MAP
  };

  _fetchedAllData = false;

  async componentDidMount() {
    const allChanges = await getAllChanges();
    const allAdminLogs = await getAdminLogs();
    this._fetchedAllData = true;
    this.setState({
      roleMap: NO_ROLES_MAP,
      allChanges: this._recordsToChangeRows(allChanges),
      allAdminLogs: this._recordsToAdminLogRows(allAdminLogs)
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

  _recordsToChangeRows = (records: TaskChangeRecord[]): ChangeRow[] => {
    return records.map(r => {
      return {
        taskID: r.taskID,
        timestamp: new Date(r.timestamp).toLocaleDateString(),
        description: !!r.fromState
          ? `${r.by} changed task from ${r.fromState} to ${r.state}`
          : `${r.by} ${(r as any).desc}`,
        notes: r.notes || ""
      };
    });
  };

  _recordsToAdminLogRows = (records: any[]): AdminLogRow[] => {
    return records.map(r => {
      return {
        desc: r.desc,
        timestamp: new Date(r.timestamp).toLocaleDateString(),
        userID: r.user.id,
        userName: r.user.name
      };
    });
  };

  render() {
    const { allChanges, allAdminLogs } = this.state;
    return (
      <div className="mainview_admin_panel">
        <Tabs>
          <TabList>
            <Tab>Change History</Tab>
            <Tab>Admin Logs</Tab>
            <Tab>User Roles</Tab>
          </TabList>
          <TabPanel>
            {this._fetchedAllData && (
              <SearchableTable
                downloadPrefix={"changeHistory_"}
                allData={allChanges}
                tableColumns={CHANGE_HISTORY_TABLE_COLUMNS}
              />
            )}
          </TabPanel>
          <TabPanel>
            {this._fetchedAllData && (
              <SearchableTable
                downloadPrefix={"adminLogs_"}
                allData={allAdminLogs}
                tableColumns={ADMIN_LOGS_TABLE_COLUMNS}
              />
            )}
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

export default AdminPanel;
