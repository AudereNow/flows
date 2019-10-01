import React from "react";
import TopBar from "../Components/TopBar";
import "./MainChrome.css";

class MainChrome extends React.PureComponent {
  render() {
    return (
      <div>
        <TopBar />
        <div className="mainchrome_content">{this.props.children}</div>
      </div>
    );
  }
}

export default MainChrome;