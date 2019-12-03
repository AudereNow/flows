import firebase from "firebase/app";
import "firebase/auth";
import React from "react";
import {
  BrowserRouter as Router,
  Route,
  RouteComponentProps,
  Switch
} from "react-router-dom";
import LoginScreen from "./Screens/LoginScreen";
import MainView from "./Screens/MainView";
import { initializeStore } from "./store/corestore";
import "./styles/SharedStyles.css";

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
                "/completed/:id"
              ]}
              render={this._renderLinkedMainView}
            />
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
