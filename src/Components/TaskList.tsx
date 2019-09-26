import React from "react";
import { Task } from "../store/corestore";
import "./TaskList.css";

type Props = {
  tasks: Task[];
  renderItem: (task: Task, isSelected: boolean) => JSX.Element;
  className?: string;
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
    this.setState({ selectedIndex: index });
  };

  render() {
    return (
      <div className={this.props.className}>
        <div className="tasklist_header">Items to Review</div>
        <div className="tasklist_items">
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
      </div>
    );
  }
}

export default TaskList;
