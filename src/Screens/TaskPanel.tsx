import React from "react";
import "react-tabs/style/react-tabs.css";
import TaskList from "../Components/TaskList";
import { subscribeToTasks } from "../store/corestore";
import "./MainView.css";
import { Task } from "../sharedtypes";

type Props = {
  taskCollection: string;
  itemComponent: React.ComponentClass<{ task: Task; isSelected: boolean }>;
  detailsComponent: React.ComponentClass<{ task: Task }>;
};

type State = {
  tasks: Task[];
  selectedTaskIndex: number;
  selectedTaskId?: string;
};

export default class TaskPanel extends React.Component<Props, State> {
  state: State = {
    tasks: [],
    selectedTaskIndex: -1
  };

  async componentDidMount() {
    subscribeToTasks(this.props.taskCollection, this._onTasksChanged);
  }

  _onTasksChanged = (tasks: Task[]) => {
    this.setState({ tasks });
    if (tasks.length === 0) {
      this.setState({ selectedTaskIndex: -1, selectedTaskId: undefined });
      return;
    }
    if (this.state.selectedTaskIndex === -1) {
      this._onTaskSelect(0, tasks);
      return;
    }
    let newIndex = tasks.findIndex(
      task => task.id === this.state.selectedTaskId
    );
    if (newIndex === -1) {
      newIndex = Math.min(this.state.selectedTaskIndex, tasks.length - 1);
    }
    this._onTaskSelect(newIndex, tasks);
  };

  _onTaskSelect = (index: number, tasks: Task[] = this.state.tasks) => {
    this.setState({
      selectedTaskIndex: index,
      selectedTaskId: index === -1 ? undefined : tasks[index].id
    });
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
