import React, { PureComponent } from "react";
import "./Dropdown.css";
import HamburgerIcon from "./HamburgerIcon";

interface dropdownConfig {
  label?: string;
  onSelect?: () => void;
}

interface Props {
  labelURI?: string;
  pinned?: boolean;
}

interface State {
  open: boolean;
}

export default class Dropdown extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { open: false };
  }

  _showDropdown = () => {
    this.setState({ open: true });
  };

  _hideDropdown = () => {
    if (this.props.pinned) {
      return;
    }
    this.setState({ open: false });
  };

  render() {
    if (!this.props.children) {
      return null;
    }
    const { open } = this.state;
    const { labelURI } = this.props;

    return (
      <div
        className="dropdown_container"
        onMouseEnter={this._showDropdown}
        onMouseLeave={this._hideDropdown}
      >
        {!!labelURI ? (
          <img src={labelURI} alt={labelURI} />
        ) : (
          <HamburgerIcon active={open} height={20} width={20} />
        )}
        {!!open && (
          <div className="dropdown_content">
            {!!this.props.children &&
              React.Children.map(this.props.children, function(child) {
                return <div className="dropdown_item">{child}</div>;
              })}
          </div>
        )}
      </div>
    );
  }
}
