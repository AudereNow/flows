import "./LabelWrapper.css";

import React, { Component, Fragment } from "react";

interface Props {
  label?: string;
  postLabelElement?: JSX.Element;
  className?: string;
  renderLabelItems?: () => JSX.Element;
  searchPanel?: JSX.Element;
  disableScroll?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  collapsedDisplay?: React.ReactNode;
}

class LabelWrapper extends Component<Props> {
  _toggleCollapse = () => {
    this.props.onCollapse && this.props.onCollapse(!this.props.collapsed);
  };

  render() {
    const {
      children,
      className,
      label,
      postLabelElement,
      renderLabelItems,
      searchPanel,
      disableScroll,
      collapsible,
      collapsed,
    } = this.props;
    return (
      <div className={`labelwrapper_container ${className || ""}`}>
        {collapsible && (
          <div
            className="labelwrapper_collapser"
            onClick={this._toggleCollapse}
          >
            <span className="labelwrapper_collapser_arrow">
              {collapsed ? "▸" : "▾"}
            </span>
            {collapsed && this.props.collapsedDisplay}
          </div>
        )}
        {!collapsed && (
          <>
            <div className="labelwrapper_header">
              {!!label && (
                <span className="labelwrapper_label">
                  {label} {postLabelElement}
                </span>
              )}
              <div className="labelwrapper_header_item">
                {!!renderLabelItems && renderLabelItems()}
              </div>
            </div>
            {!!searchPanel && searchPanel}
            <div className={disableScroll ? "" : "labelwrapper_inner"}>
              {children}
            </div>
          </>
        )}
      </div>
    );
  }
}

export default LabelWrapper;
