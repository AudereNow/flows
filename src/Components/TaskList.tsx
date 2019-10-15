import React from "react";
import ReactTooltip from "react-tooltip";
import {
  ActiveTask,
  dateFromServerTimestamp,
  getBestUserName,
  logActiveTaskView,
  subscribeActiveTasks,
  Task
} from "../store/corestore";
import { DateRange } from "../util/search";
import LabelWrapper from "./LabelWrapper";
import LabelWrapperWithSearch from "./LabelWrapperWithSearch";
import "./TaskList.css";

const MAX_ACTIVE_MSEC = 5 * 60 * 1000; // 5 mins is considered "active"

type Props = {
  tasks: Task[];
  renderItem: (task: Task, isSelected: boolean) => JSX.Element;
  className?: string;
  currentSearchDates?: DateRange | null;
  label?: string;
  onSelect?: (index: number) => void;
  selectedItem?: number;
  onSearchTermUpdate?: (searchTerm: string) => void;
  onSearchDatesUpdate?: (searchDates: DateRange) => void;
  filterItems?: string[];
  onFilterUpdate?: (filterItem: string) => void;
  onClear?: () => void;
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

  _onSearchTermUpdate = (searchTerm: string) => {
    this.props.onSearchTermUpdate!(searchTerm);
  };

  render() {
    const {
      className,
      filterItems,
      onFilterUpdate,
      onSearchTermUpdate
    } = this.props;
    const label = this.props.label || "ITEMS TO REVIEW";
    const innerResult = (
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
              {this.props.renderItem(task, index === this.state.selectedIndex)}
              <ReactTooltip key={activeDataTip} />
            </div>
          );
        })}
      </div>
    );
    return !!onSearchTermUpdate ? (
      <LabelWrapperWithSearch
        className={className}
        currentSearchDates={this.props.currentSearchDates}
        label={label}
        onSearchTermUpdate={this._onSearchTermUpdate}
        onSearchDatesUpdate={this.props.onSearchDatesUpdate}
        filterItems={filterItems}
        onFilterUpdate={onFilterUpdate}
        onClear={this.props.onClear}
      >
        {innerResult}
      </LabelWrapperWithSearch>
    ) : (
      <LabelWrapper className={className} label={label}>
        {innerResult}
      </LabelWrapper>
    );
  }
}

export default TaskList;
