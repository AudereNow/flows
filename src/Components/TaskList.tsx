import React from "react";
import {
  Task,
  ActiveTask,
  dateFromServerTimestamp,
  subscribeActiveTasks,
  logActiveTaskView,
  getBestUserName
} from "../store/corestore";
import LabelWrapper from "./LabelWrapper";
import "./TaskList.css";
import ReactTooltip from "react-tooltip";

const MAX_ACTIVE_MSEC = 5 * 60 * 1000; // 5 mins is considered "active"

type Props = {
  tasks: Task[];
  renderItem: (task: Task, isSelected: boolean) => JSX.Element;
  className?: string;
  onSelect?: (index: number) => void;
};

type State = {
  selectedIndex: number | null;
  activeTasks: ActiveTask[];
};

class TaskList extends React.Component<Props, State> {
  state: State = {
    selectedIndex: null,
    activeTasks: []
  };
  _unsubscribeActives: (() => void) | null = null;

  componentDidMount() {
    this._unsubscribeActives = subscribeActiveTasks(tasks =>
      this.setState({ activeTasks: tasks })
    );
  }

  componentWillUnmount() {
    if (this._unsubscribeActives) {
      this._unsubscribeActives();
      this._unsubscribeActives = null;
    }
  }

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

    // Let this drift by without await because nothing after it depends on it
    logActiveTaskView(this.props.tasks[index].id);

    this.setState({ selectedIndex: index });
  };

  _isActiveTask(task: Task) {
    const activeTask = this.state.activeTasks.find(t => t.id === task.id);
    const recentlyActive =
      activeTask &&
      Date.now() - dateFromServerTimestamp(activeTask.since).getTime() <=
        MAX_ACTIVE_MSEC;
    if (recentlyActive && activeTask!.name !== getBestUserName()) {
      return activeTask;
    }
    return null;
  }

  render() {
    return (
      <LabelWrapper className={this.props.className} label={"Items to Review"}>
        <div>
          {this.props.tasks.map((task, index) => {
            const activeTask = this._isActiveTask(task);
            const activeClass = activeTask ? "tasklist_active" : undefined;
            const activeDataTip = activeTask
              ? `${activeTask!.name} also working on this task`
              : undefined;

            return (
              <div
                className={activeClass}
                key={index}
                data-tip={activeDataTip}
                data-name={index}
                onClick={this._onItemPressed}
              >
                {this.props.renderItem(
                  task,
                  index === this.state.selectedIndex
                )}
                <ReactTooltip key={activeDataTip} />
              </div>
            );
          })}
        </div>
      </LabelWrapper>
    );
  }
}

export default TaskList;
