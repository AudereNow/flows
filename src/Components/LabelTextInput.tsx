import React, { ChangeEvent, Component } from "react";
import "./LabelTextInput.css";

interface Props {
  label?: string;
  onTextChange: (text: string) => void;
}

class LabelTextInput extends Component<Props> {
  _onTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    this.props.onTextChange(event.target.value);
  };

  render() {
    return (
      <div className="labeltextinput_container">
        {!!this.props.label && (
          <span className="labeltextinput_label">
            {this.props.label + ": "}
          </span>
        )}
        <textarea
          className="labeltextinput_input"
          onChange={this._onTextChange}
        />
      </div>
    );
  }
}

export default LabelTextInput;
