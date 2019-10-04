import React, { PureComponent } from "react";
import "./Dropdown.css";
import HamburgerIcon from "./HamburgerIcon";

interface dropdownConfig {
  label?: string;
  onSelect?: () => void;
}

interface Props {
  config: dropdownConfig[];
  labelURI?: string;
}

interface State {
  open: boolean;
}

export default class Dropdown extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { open: false };
  }

  _toggleDropdown = () => {
    this.setState({ open: !this.state.open });
  };

  render() {
    if (this.props.config.length === 0) {
      return null;
    }
    const { open } = this.state;
    const { labelURI } = this.props;

    return (
      <div
        className="dropdown_container"
        onMouseEnter={this._toggleDropdown}
        onMouseLeave={this._toggleDropdown}
      >
        {!!labelURI ? (
          <img src={labelURI} alt={labelURI} />
        ) : (
          <HamburgerIcon active={open} height={20} width={20} />
        )}
        {!!open && (
          <div className="dropdown_content">
            {this.props.config.map(item => {
              return (
                <div
                  key={item.label}
                  className="dropdown_item"
                  onClick={item.onSelect}
                >
                  <span>{item.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}
