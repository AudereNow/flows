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
    const datastore = initializeStore(defaultConfig.dataStore);

    datastore.onAuthStateChanged(this._onAuthChanged);
  }

  _onAuthChanged = (authenticated: boolean) => {
    this.setState({ authenticated });
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
              path={Object.values(defaultConfig.tabs).map(
                tab => `/${tab.baseUrl}/:id`
              )}
              render={this._renderLinkedMainView}
            />
            <Route>
              <MainView />
            </Route>
          </Switch>
        </Router>
      );
    } else {
      return <LoginScreen dataStoreConfig={defaultConfig.dataStore} />;
    }
  }
}

export default App;
