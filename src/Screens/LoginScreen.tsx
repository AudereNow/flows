import "firebase/auth";
import "./LoginScreen.css";

import {
  DataStoreConfig,
  DataStoreType,
  FirebaseDataStoreConfig,
  RestDataStoreConfig,
} from "../store/config";
import React, { ChangeEvent, Component, PureComponent } from "react";

import { RestDataStore } from "../transport/rest";
import StyledFirebaseAuth from "react-firebaseui/StyledFirebaseAuth";
import { dataStore } from "../transport/datastore";
import firebase from "firebase/app";

export interface LoginScreenProps {
  dataStoreConfig: DataStoreConfig;
}

class LoginScreen extends PureComponent<LoginScreenProps> {
  render() {
    const { dataStoreConfig } = this.props;
    switch (dataStoreConfig.type) {
      case DataStoreType.FIREBASE:
        return (
          <StyledFirebaseAuth
            uiConfig={dataStoreConfig.authUiConfig}
            firebaseAuth={firebase.auth()}
          />
        );
      case DataStoreType.REST:
        return <RestLoginScreen dataStoreConfig={dataStoreConfig} />;
    }
  }
}

interface RestLoginScreenProps {
  dataStoreConfig: RestDataStoreConfig;
}

interface RestLoginScreenState {
  username: string;
  password: string;
  error: string;
}

class RestLoginScreen extends Component<
  RestLoginScreenProps,
  RestLoginScreenState
> {
  state: RestLoginScreenState = { username: "", password: "", error: "" };

  _updateUsername = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ username: e.target.value });
  };

  _updatePassword = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ password: e.target.value });
  };

  _onSubmit = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    this.setState({ error: "" });
    const { username, password } = this.state;
    e.preventDefault();
    try {
      await (dataStore as RestDataStore).login({ username, password });
    } catch (e) {
      console.error(e);
      this.setState({ error: e.message });
    }
  };

  render() {
    return (
      <form
        method="post"
        action={this.props.dataStoreConfig.endpointRoot + "/users/sign_in"}
      >
        {this.state.error && (
          <div className="login_error">{this.state.error}</div>
        )}
        <div>
          <input
            type="text"
            id="username"
            name="username"
            placeholder="username"
            value={this.state.username}
            onChange={this._updateUsername}
          />
        </div>
        <div>
          <input
            type="password"
            id="password"
            name="password"
            placeholder="password"
            value={this.state.password}
            onChange={this._updatePassword}
          />
        </div>
        <div>
          <button onClick={this._onSubmit}>Log In</button>
        </div>
      </form>
    );
  }
}

export default LoginScreen;
