import React, { Component, Fragment } from "react";
import "./LabelWrapper.css";

interface Props {
  label?: string;
  postLabelElement?: JSX.Element;
  className?: string;
  renderLabelItems?: () => JSX.Element;
  searchPanel?: JSX.Element;
}

class LabelWrapper extends Component<Props> {
  render() {
    const {
      children,
      className,
      label,
      postLabelElement,
      renderLabelItems,
      searchPanel
    } = this.props;
    return (
      <div className={`labelwrapper_container ${className}`}>
        {
          <Fragment>
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
            <div className="labelwrapper_inner">{children}</div>
          </Fragment>
        }
      </div>
    );
  }
}

export default LabelWrapper;
