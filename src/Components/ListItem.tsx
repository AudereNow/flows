import "./ListItem.css";

import React from "react";
import { Task } from "../sharedtypes";
import { dataStore } from "../transport/datastore";

export class ListItem extends React.Component<{
  tasks: Task[];
  isSelected: boolean;
}> {
  render() {
    const { tasks, isSelected } = this.props;
    const previewName = "listitem" + (isSelected ? " selected" : "");
    const claimAmounts = tasks
      .map(task =>
        task.entries.map(entry => {
          return !entry.rejected ? entry.claimedCost : 0;
        })
      )
      .flat();
    const claimsTotal = claimAmounts.reduce(
      (sum, claimedCost) => sum + claimedCost
    );
    const claimCount = tasks
      .map(task => task.entries.length)
      .reduce((a, b) => a + b, 0);
    return (
      <div className={previewName}>
        <div className="listitem_header">
          <span>{tasks[0].site.name}</span>
          <span>
            {claimCount} Claim{claimCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div>
          {"Total Reimbursement: " + dataStore.formatCurrency(claimsTotal)}
        </div>
      </div>
    );
  }
}
