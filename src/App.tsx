import "firebase/auth";
import "./styles/SharedStyles.css";

import {
  Route,
  RouteComponentProps,
  BrowserRouter as Router,
  Switch,
} from "react-router-dom";

import LoginScreen from "./Screens/LoginScreen";
import MainView from "./Screens/MainView";
import React from "react";
import { defaultConfig } from "./store/config";
import firebase from "firebase/app";
import { initializeStore } from "./transport/datastore";

type Props = {};
type State = {
  authenticated: boolean;
};

class App extends React.Component<Props, State> {
  state = {
    authenticated: false,
  };

  constructor(props: Props) {
    super(props);
    initializeStore(defaultConfig.dataStore);

    firebase.auth().onAuthStateChanged(this._onAuthChanged);
  }

  _onAuthChanged = (user: firebase.User | null) => {
    this.setState({ authenticated: !!user });
  };

  _renderLinkedMainView = (routeProps: RouteComponentProps) => {
    // @ts-ignore
    const taskID = routeProps.match.params.id;
    const tabMatches = routeProps.location.pathname.match(/\/(.+?)\//);
    const tabName = tabMatches![1];
    return <MainView selectedTaskID={taskID} startingTab={tabName} />;
  };

  render() {
    if (this.state.authenticated) {
      return (
        <Router>
          <Switch>
            <Route
              path={[
                "/auditor/:id",
                "/payor/:id",
                "/operator/:id",
                "/rejected/:id",
                "/completed/:id",
              ]}
              render={this._renderLinkedMainView}
            />
            <Route path={"/admin/:tab?"}>
              <MainView startingTab={"admin"} />
            </Route>
            <Route>
              <MainView />
            </Route>
          </Switch>
        </Router>
      );
    } else {
      return <LoginScreen />;
    }
  }
}

export default App;
