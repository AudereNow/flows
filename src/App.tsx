import React from "react";
import firebase from "firebase/app";
import "firebase/auth";
import LoginScreen from "./Screens/LoginScreen";
import { initializeStore } from "./store/corestore";
import MainView from "./Screens/MainView";

type Props = {};
type State = {
  authenticated: boolean;
};

class App extends React.Component<Props, State> {
  state = {
    authenticated: false
  };

  constructor(props: Props) {
    super(props);
    initializeStore();

    firebase.auth().onAuthStateChanged(this._onAuthChanged);
  }

  _onAuthChanged = (user: firebase.User | null) => {
    this.setState({ authenticated: !!user });
  };

  render() {
    if (this.state.authenticated) {
      return <MainView />;
    } else {
      return <LoginScreen />;
    }
  }
}

export default App;
