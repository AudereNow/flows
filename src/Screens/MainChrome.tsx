import "./MainChrome.css";

import React from "react";
import TopBar from "../Components/TopBar";

class MainChrome extends React.PureComponent {
  render() {
    return (
      <div className="mainchrome_page">
        <TopBar />
        <div className="mainchrome_content">{this.props.children}</div>
      </div>
    );
  }
}

export default MainChrome;
