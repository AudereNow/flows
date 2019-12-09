import firebase from "firebase/app";
import "firebase/auth";
import "firebase/storage";
import React from "react";
// @ts-ignore
import LoadingOverlay from "react-loading-overlay"; // no available type data
import logoutIcon from "../assets/logout.png";
import logo from "../assets/maishalogo.png";
import uploadIcon from "../assets/uploadcsv.png";
import { UserRole } from "../sharedtypes";
import { uploadCSV, userRoles } from "../store/corestore";
import "./TopBar.css";

type State = {
  roles: UserRole[];
  showFileSelector: boolean;
  selectingFile: boolean;
  uploading: boolean;
};

class TopBar extends React.Component<{}, State> {
  state: State = {
    roles: [],
    showFileSelector: false,
    selectingFile: false,
    uploading: false
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

    this.setState({ selectingFile: false, uploading: true });

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

    this.setState({ uploading: false, showFileSelector: false });

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
    const { roles, showFileSelector, uploading } = this.state;
    const uploadButton =
      roles.includes(UserRole.AUDITOR) && !showFileSelector ? (
        <div
          onClick={this._onUploadIconClick}
          className="topbar_row topbar_pointer"
        >
          <img className="topbar_upload_icon" src={uploadIcon} alt="upload" />
          <div className="topbar_item">Upload CSV</div>
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
    const overlay = uploading ? (
      <LoadingOverlay
        className="mainview_loading_fullscreen"
        active={uploading}
        spinner
        text="Loading..."
      />
    ) : (
      undefined
    );

    return (
      <div className="topbar_main">
        <a href="/">
          <img className="topbar_logo" src={logo} alt="logo" />
        </a>

        <div className="topbar_details">
          <span>{firebase.auth().currentUser!.displayName}</span>
          <div className="topbar_row">
            {overlay}
            {uploadButton}
            {uploader}
            <span className="topbar_divider topbar_item" />
            <div
              className="topbar_logout topbar_pointer"
              onClick={this._handleLogout}
            >
              Logout
              <img
                className="topbar_arrow"
                src={logoutIcon}
                alt="logout_arrow"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default TopBar;
