import firebase from "firebase/app";
import "firebase/auth";
import "firebase/storage";
import React from "react";
import uploadIcon from "../assets/cloud_upload.svg";
import logo from "../assets/maishalogo.png";
import Dropdown from "../Components/Dropdown";
import { UserRole, userRoles } from "../store/corestore";
import "./TopBar.css";

type State = {
  roles: UserRole[];
  showFileSelector: boolean;
};

class TopBar extends React.Component {
  state: State = {
    roles: [],
    showFileSelector: false
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

  _onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length !== 1) {
      return;
    }

    const filename = new Date().toISOString() + ".csv";
    const ref = firebase
      .storage()
      .ref()
      .child(`csvuploads/${filename}`);
    const file = event.target.files[0];

    try {
      await ref.put(file, { contentType: file.type });

      alert("File successfully uploaded!");
      this.setState({ showFileSelector: false });
    } catch (e) {
      alert(e);
    }
  };

  render() {
    const { roles, showFileSelector } = this.state;
    const uploadButton =
      roles.includes(UserRole.AUDITOR) && !showFileSelector ? (
        <img
          className="topbar_upload_icon"
          src={uploadIcon}
          alt="upload"
          onClick={this._onUploadIconClick}
        />
      ) : null;
    const uploader = showFileSelector ? (
      <input type="file" name="file" onChange={this._onFileSelected} />
    ) : null;

    return (
      <div className="topbar_main">
        <img className="topbar_logo" src={logo} alt="logo" />
        <div className="topbar_user">
          {firebase.auth().currentUser!.displayName}
        </div>

        <div className="topbar_row">
          {uploadButton}
          {uploader}
          <Dropdown>
            <div onClick={this._handleLogout}>Logout</div>
          </Dropdown>
        </div>
      </div>
    );
  }
}

export default TopBar;
