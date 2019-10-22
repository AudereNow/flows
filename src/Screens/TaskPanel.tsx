import React from "react";
import "react-tabs/style/react-tabs.css";
import LabelWrapper from "../Components/LabelWrapper";
import TaskList from "../Components/TaskList";
import { Task, TaskState, TaskChangeRecord } from "../sharedtypes";
import { subscribeToTasks, getChanges } from "../store/corestore";
import "./MainView.css";

type Props = {
  taskState: TaskState;
  itemComponent: React.ComponentClass<{ task: Task; isSelected: boolean }>;
  detailsComponent: React.ComponentClass<{
    task: Task;
    changes: TaskChangeRecord[];
  }>;
};

type State = {
  tasks: Task[];
  changes: TaskChangeRecord[][];
  selectedTaskIndex: number;
  selectedTaskId?: string;
};

export default class TaskPanel extends React.Component<Props, State> {
  state: State = {
    tasks: [],
    changes: [],
    selectedTaskIndex: -1
  };
  _unsubscribe = () => {};

  async componentDidMount() {
    this._unsubscribe = subscribeToTasks(
      this.props.taskState,
      this._onTasksChanged
    );
  }

  componentWillUnmount() {
    this._unsubscribe();
  }

  _onTasksChanged = async (tasks: Task[]) => {
    const changes = await Promise.all(tasks.map(t => getChanges(t.id)));
    let { selectedTaskIndex, selectedTaskId } = this.state;

    if (tasks.length === 0) {
      selectedTaskIndex = -1;
      selectedTaskId = undefined;
    } else {
      if (selectedTaskIndex === -1) {
        selectedTaskIndex = 0;
        selectedTaskId = tasks[0].id;
      } else {
        selectedTaskIndex = tasks.findIndex(task => task.id === selectedTaskId);
        if (selectedTaskIndex === -1) {
          selectedTaskIndex = Math.min(
            this.state.selectedTaskIndex,
            tasks.length - 1
          );
          selectedTaskId = tasks[selectedTaskIndex].id;
        }
      }
    }

    this.setState({ tasks, changes, selectedTaskIndex, selectedTaskId });
  };

  _onTaskSelect = (index: number) => {
    this.setState({
      selectedTaskIndex: index,
      selectedTaskId: index === -1 ? undefined : this.state.tasks[index].id
    });
  };

  _renderTaskListItem = (task: Task, isSelected: boolean) => {
    return <this.props.itemComponent task={task} isSelected={isSelected} />;
  };

  render() {
    const { selectedTaskIndex } = this.state;
    return (
      <div className="mainview_content">
        <LabelWrapper label="ITEMS TO REVIEW" className="mainview_tasklist">
          <TaskList
            onSelect={this._onTaskSelect}
            tasks={this.state.tasks}
            renderItem={this._renderTaskListItem}
            selectedItem={selectedTaskIndex}
            className="mainview_tasklist"
          />
        </LabelWrapper>
        <div style={{ width: "100%" }}>
          {selectedTaskIndex >= 0 && (
            <this.props.detailsComponent
              task={this.state.tasks[selectedTaskIndex]}
              changes={this.state.changes[selectedTaskIndex]}
            />
          )}
        </div>
      </div>
    );
  }
}
