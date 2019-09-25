import React from "react";
import firebase from "firebase/app";
import "firebase/auth";
import "./TopBar.css";
import logo from "../assets/maishalogo.png";

class TopBar extends React.PureComponent {
  render() {
    return (
      <div id="topbar">
        <img className="logo" src={logo} />
        <div className="user">{firebase.auth().currentUser!.displayName}</div>
      </div>
    );
  }
}

export default TopBar;
