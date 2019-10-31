import firebase from "firebase";
import React from "react";
import { UserRole } from "../sharedtypes";
import { setRoles } from "../store/corestore";

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
  email: string;
  roleMap: RoleMap;
};

class AdminPanel extends React.Component<Props, State> {
  state: State = {
    email: "",
    roleMap: NO_ROLES_MAP
  };

  async componentDidMount() {
    const adminLogs = await this._getAdminLogs();
    console.log(adminLogs);
    this.setState({ roleMap: NO_ROLES_MAP });
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

  _getAdminLogs = async () => {
    const snap = await firebase
      .firestore()
      .collection("admin_log_event")
      .orderBy("timestamp")
      .get();

    return snap.docs.map(doc => doc.data());
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

  render() {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flex: 1
        }}
      >
        <div>
          <h3>Set User Roles</h3>
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
        </div>
        <div style={{ display: "flex", flex: 1 }}></div>
      </div>
    );
  }
}

export default AdminPanel;
