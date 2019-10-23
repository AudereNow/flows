import firebase from "firebase/app";
import "firebase/auth";
import "firebase/storage";
import React, { Fragment } from "react";
import uploadIcon from "../assets/cloud_upload.svg";
import logo from "../assets/maishalogo.png";
import Dropdown from "../Components/Dropdown";
import { userRoles, uploadCSV } from "../store/corestore";
import "./TopBar.css";
import { UserRole } from "../sharedtypes";

type State = {
  roles: UserRole[];
  showFileSelector: boolean;
  selectingFile: boolean;
};

class TopBar extends React.Component {
  state: State = {
    roles: [],
    showFileSelector: false,
    selectingFile: false
  };

  async componentDidMount() {
    const roles = await userRoles();
    this.setState({ roles });
  }

  _handleLogout = async () => {
    try {
      await firebase.auth().signOut();
    } catch (e) {
      alert(`Error logging out: ${e}`);
    }
  };

  _onUploadIconClick = () => {
    this.setState({ showFileSelector: true });
  };

  _onFileSelecting = () => {
    this.setState({ selectingFile: true });
  };

  _onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length !== 1) {
      return;
    }

    const reader = new FileReader();
    const file = event.target.files[0];

    reader.onload = this._onFileLoaded;
    reader.onerror = e => {
      alert(`Error reading file: ${e}`);
    };
    reader.readAsText(file);
  };

  _onFileLoaded = async (e: ProgressEvent<FileReader>) => {
    if (!e.target || !e.target.result) {
      alert("Error reading file.  It appears empty.");
      return;
    }
    const result = await uploadCSV(e.target.result);
    if (!result.data || !(result.data.result || result.data.error)) {
      alert("Encountered unknown error processing CSV");
      return;
    }
    if (result.data.result) {
      alert(result.data.result);
    } else {
      alert(result.data.error);
    }
  };

  render() {
    const { roles, showFileSelector } = this.state;
    const uploadButton =
      roles.includes(UserRole.AUDITOR) && !showFileSelector ? (
        <div className="topbar_row" onClick={this._onUploadIconClick}>
          <img className="topbar_upload_icon" src={uploadIcon} alt="upload" />
          <div>Upload CSV</div>
        </div>
      ) : null;
    const uploader = showFileSelector ? (
      <input
        className="topbar_input"
        type="file"
        name="file"
        accept=".csv"
        onClick={this._onFileSelecting}
        onChange={this._onFileSelected}
      />
    ) : null;

    return (
      <div className="topbar_main">
        <img className="topbar_logo" src={logo} alt="logo" />
        <div className="topbar_user">
          {firebase.auth().currentUser!.displayName}
        </div>

        <div className="topbar_row">
          <Dropdown pinned={this.state.selectingFile}>
            <Fragment>
              {uploadButton}
              {uploader}
            </Fragment>
            <div className="nav_menu_item" onClick={this._handleLogout}>
              Logout
            </div>
          </Dropdown>
        </div>
      </div>
    );
  }
}

export default TopBar;
