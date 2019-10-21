import React, { ChangeEvent, Component } from "react";
import "./LabelTextInput.css";

interface Props {
  label?: string;
  value: string;
  onTextChange: (text: string) => void;
}

class LabelTextInput extends Component<Props> {
  _onTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    this.props.onTextChange(event.target.value);
  };

  render() {
    const { value, label } = this.props;
    return (
      <div className="labeltextinput_container">
        {!!label && (
          <span className="labeltextinput_label">{label + ": "}</span>
        )}
        <textarea
          className="labeltextinput_input"
          value={value}
          onChange={this._onTextChange}
        />
      </div>
    );
  }
}

export default LabelTextInput;
