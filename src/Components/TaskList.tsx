import "./TaskList.css";

import { ActiveTask, PharmacyLoadingState } from "../transport/baseDatastore";
import { Site, Task } from "../sharedtypes";

import React from "react";
import ReactTooltip from "react-tooltip";
import { dataStore } from "../transport/datastore";

const MAX_ACTIVE_MSEC = 5 * 60 * 1000; // 5 mins is considered "active"

export type TaskGroup = {
  site: Site;
  tasks: Task[];
  stats?: {
    claimCount: number;
    totalReimbursement: number;
    loadingState: PharmacyLoadingState;
  };
};

type Props = {
  taskGroups: TaskGroup[];
  renderItem: (tasks: TaskGroup, isSelected: boolean) => JSX.Element;
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
    activeTasks: [],
  };
  _unsubscribeActives: (() => void) | null = null;

  componentDidMount() {
    this._unsubscribeActives = dataStore.subscribeActiveTasks(tasks =>
      this.setState({ activeTasks: tasks })
    );
  }

  static getDerivedStateFromProps(props: Props, state: State) {
    if (
      props.selectedItem !== undefined &&
      state.selectedIndex !== props.selectedItem
    ) {
      return {
        selectedIndex: props.selectedItem,
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
      dataStore.logActiveTaskView(this.props.taskGroups[index].site.id);

      this.setState({ selectedIndex: index });
    }
  };

  _getActiveViewers(tasks: Task[]) {
    const now = Date.now();
    const activeViewers = this.state.activeTasks
      .filter(
        t =>
          tasks.some(task => t.id === task.id) &&
          now - dataStore.dateFromServerTimestamp(t.since).getTime() <=
            MAX_ACTIVE_MSEC &&
          t.name !== dataStore.getBestUserName()
      )
      .map(t => t.name);
    return activeViewers;
  }

  render() {
    const { renderItem, taskGroups: tasks } = this.props;
    return (
      <div className={this.props.className}>
        {tasks.map((taskGroup, index) => {
          let activeClass, activeDataTip;
          const activeViewers = this._getActiveViewers(taskGroup.tasks);
          if (activeViewers.length > 0) {
            activeClass = "tasklist_active";
            activeDataTip = `${activeViewers.join(", ")} ${
              index === this.state.selectedIndex ? " also" : ""
            } working on this task`;
          }
          return (
            <div
              className={activeClass}
              key={taskGroup.site.name}
              data-tip={activeDataTip}
              data-name={index}
              onClick={this._onItemPressed}
            >
              {renderItem(taskGroup, index === this.state.selectedIndex)}
              <ReactTooltip key={activeDataTip} />
            </div>
          );
        })}
      </div>
    );
  }
}

export default TaskList;
