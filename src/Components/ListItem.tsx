import "./ListItem.css";

import React from "react";
import { Task } from "../sharedtypes";

export class ListItem extends React.Component<{
  tasks: Task[];
  isSelected: boolean;
}> {
  render() {
    const { tasks, isSelected } = this.props;
    const previewName = "listitem" + (isSelected ? " selected" : "");
    const claimCount = tasks
      .map(task => task.entries.length)
      .reduce((a, b) => a + b, 0);
    return (
      <div className={previewName}>
        <div className="listitem_header">
          <span>{tasks[0].site.name}</span>
        </div>
        <div>
          {claimCount} Claim{claimCount !== 1 ? "s" : ""}
        </div>
      </div>
    );
  }
}
