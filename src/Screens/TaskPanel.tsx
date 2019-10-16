import React from "react";
import "react-tabs/style/react-tabs.css";
import TaskList from "../Components/TaskList";
import { loadTasks, Task } from "../store/corestore";
import "./MainView.css";

type Props = {
  taskCollection: string;
  itemComponent: React.ComponentClass<{ task: Task; isSelected: boolean }>;
  detailsComponent: React.ComponentClass<{ task: Task }>;
};

type State = {
  tasks: Task[];
  selectedTaskIndex: number;
};

export default class TaskPanel extends React.Component<Props, State> {
  state: State = {
    tasks: [],
    selectedTaskIndex: -1
  };

  async componentDidMount() {
    const tasks = await loadTasks(this.props.taskCollection);
    this.setState({ tasks });
    if (tasks.length > 0) {
      this._onTaskSelect(0);
    }
  }

  _onTaskSelect = (index: number) => {
    this.setState({ selectedTaskIndex: index });
  };

  _renderTaskListItem = (task: Task, isSelected: boolean) => {
    return <this.props.itemComponent task={task} isSelected={isSelected} />;
  };

  render() {
    const { selectedTaskIndex } = this.state;
    return (
      <div className="mainview_content">
        <TaskList
          onSelect={this._onTaskSelect}
          tasks={this.state.tasks}
          renderItem={this._renderTaskListItem}
          selectedItem={selectedTaskIndex}
          className="mainview_tasklist"
        />
        <div style={{ width: "100%" }}>
          {selectedTaskIndex >= 0 && (
            <this.props.detailsComponent
              task={this.state.tasks[selectedTaskIndex]}
            />
          )}
        </div>
      </div>
    );
  }
}
