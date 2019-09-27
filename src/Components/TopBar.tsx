import React from "react";
import firebase from "firebase/app";
import "firebase/auth";
import "firebase/storage";
import "./TopBar.css";
import logo from "../assets/maishalogo.png";
import uploadIcon from "../assets/cloud_upload.svg";
import { UserRole, userRoles } from "../store/corestore";

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
        {uploadButton}
        {uploader}
      </div>
    );
  }
}

export default TopBar;
