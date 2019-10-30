import React from "react";
import ReactTooltip from "react-tooltip";
import { Task } from "../sharedtypes";
import {
  ActiveTask,
  dateFromServerTimestamp,
  getBestUserName,
  logActiveTaskView,
  subscribeActiveTasks
} from "../store/corestore";
import "./TaskList.css";

const MAX_ACTIVE_MSEC = 5 * 60 * 1000; // 5 mins is considered "active"

type Props = {
  tasks: Task[];
  renderItem: (task: Task, isSelected: boolean) => JSX.Element;
  className?: string;
  onSelect?: (index: number) => boolean;
  selectedItem?: number;
  searchPanel?: React.ReactElement;
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

  static getDerivedStateFromProps(props: Props, state: State) {
    if (
      props.selectedItem !== undefined &&
      state.selectedIndex !== props.selectedItem
    ) {
      return {
        selectedIndex: props.selectedItem
      };
    }
    return null;
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
    let okToSelect = true;
    if (!!this.props.onSelect) {
      okToSelect = this.props.onSelect(index);
    }

    if (okToSelect) {
      // Let this drift by without await because nothing after it depends on it
      logActiveTaskView(this.props.tasks[index].id);

      this.setState({ selectedIndex: index });
    }
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
    const { renderItem, searchPanel, tasks } = this.props;
    return (
      <div className={this.props.className}>
        {!!searchPanel && (
          <div className="tasklist_search_panel">{this.props.searchPanel}</div>
        )}
        {tasks.map((task, index) => {
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
              {renderItem(task, index === this.state.selectedIndex)}
              <ReactTooltip key={activeDataTip} />
            </div>
          );
        })}
      </div>
    );
  }
}

export default TaskList;
