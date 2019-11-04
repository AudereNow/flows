import React from "react";
import firebase from "firebase/app";
import "firebase/auth";
import LoginScreen from "./Screens/LoginScreen";
import { initializeStore } from "./store/corestore";
import MainView from "./Screens/MainView";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  RouteComponentProps
} from "react-router-dom";

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
    return (
      <MainView key={taskID} selectedTaskID={taskID} startingTab={tabName} />
    );
  };

  render() {
    if (this.state.authenticated) {
      return (
        <Router>
          <Switch>
            <Route
              path={["/auditor/:id", "/payor/:id", "/operator/:id"]}
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
