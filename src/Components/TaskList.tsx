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
  tasks: Task[][];
  renderItem: (tasks: Task[], isSelected: boolean) => JSX.Element;
  className?: string;
  onSelect?: (index: number) => boolean;
  selectedItem?: number;
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
      logActiveTaskView(this.props.tasks[index][0].id);

      this.setState({ selectedIndex: index });
    }
  };

  _getActiveViewers(tasks: Task[]) {
    const now = Date.now();
    const activeViewers = this.state.activeTasks
      .filter(
        t =>
          tasks.some(task => t.id === task.id) &&
          now - dateFromServerTimestamp(t.since).getTime() <= MAX_ACTIVE_MSEC &&
          t.name !== getBestUserName()
      )
      .map(t => t.name);
    return activeViewers;
  }

  render() {
    const { renderItem, tasks } = this.props;
    return (
      <div className={this.props.className}>
        {tasks.map((task, index) => {
          let activeClass, activeDataTip;
          const activeViewers = this._getActiveViewers(task);
          if (activeViewers.length > 0) {
            activeClass = "tasklist_active";
            activeDataTip = `${activeViewers.join(", ")} ${
              index === this.state.selectedIndex ? " also" : ""
            } working on this task`;
          }
          return (
            <div
              className={activeClass}
              key={task[0].id}
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
