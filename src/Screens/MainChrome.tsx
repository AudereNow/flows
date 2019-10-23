import React from "react";
import TopBar from "../Components/TopBar";
import "./MainChrome.css";
// @ts-ignore
import LoadingOverlay from "react-loading-overlay"; // no available type data

type State = {
  loading: boolean;
};
class MainChrome extends React.Component<{}, State> {
  state: State = {
    loading: false
  };

  _onLoadingChanged = (loading: boolean) => {
    this.setState({ loading });
  };

  render() {
    return (
      <LoadingOverlay
        className="mainview_fullscreen_loader"
        active={this.state.loading}
        spinner
        text="Loading..."
      >
        <TopBar onLoadingChanged={this._onLoadingChanged} />
        <div className="mainchrome_content">{this.props.children}</div>
      </LoadingOverlay>
    );
  }
}

export default MainChrome;
