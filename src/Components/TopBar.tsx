import React from "react";
import firebase from "firebase/app";
import "firebase/auth";
import "./TopBar.css";
import logo from "../assets/maishalogo.png";

class TopBar extends React.PureComponent {
  render() {
    return (
      <div className="topbar_main">
        <img className="topbar_logo" src={logo} />
        <div className="topbar_user">
          {firebase.auth().currentUser!.displayName}
        </div>
      </div>
    );
  }
}

export default TopBar;
