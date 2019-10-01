import React from "react";
import { Task } from "../store/corestore";
import LabelWrapper from "./LabelWrapper";
import "./TaskList.css";

type Props = {
  tasks: Task[];
  renderItem: (task: Task, isSelected: boolean) => JSX.Element;
  className?: string;
  onSelect?: (index: number) => void;
};

type State = {
  selectedIndex: number | null;
};

class TaskList extends React.Component<Props, State> {
  state: State = {
    selectedIndex: null
  };

  _onItemPressed = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const dataName = event.currentTarget.getAttribute("data-name");
    if (dataName === null) {
      return;
    }
    const index = parseInt(dataName);
    if (isNaN(index)) {
      return;
    }
    if (!!this.props.onSelect) {
      this.props.onSelect(index);
    }

    this.setState({ selectedIndex: index });
  };

  render() {
    return (
      <LabelWrapper className={this.props.className} label={"Items to Review"}>
        <div>
          {this.props.tasks.map((task, index) => {
            return (
              <div key={index} data-name={index} onClick={this._onItemPressed}>
                {this.props.renderItem(
                  task,
                  index === this.state.selectedIndex
                )}
              </div>
            );
          })}
        </div>
      </LabelWrapper>
    );
  }
}

export default TaskList;
