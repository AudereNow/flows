import React from "react";
import { Task } from "../sharedtypes";
import { formatCurrency } from "../store/corestore";
import "./ListItem.css";

export class ListItem extends React.Component<{
  task: Task;
  isSelected: boolean;
}> {
  render() {
    const { task, isSelected } = this.props;
    const previewName = "listitem" + (isSelected ? " selected" : "");
    const claimAmounts = task.entries.map(entry => {
      return entry.claimedCost;
    });
    const claimsTotal = claimAmounts.reduce(
      (sum, claimedCost) => sum + claimedCost
    );
    return (
      <div className={previewName}>
        <div className="listitem_header">
          <span>{task.site.name}</span>
          <span>
            {task.entries.length} Claim{task.entries.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div>{"Total Reimbursement: " + formatCurrency(claimsTotal)}</div>
      </div>
    );
  }
}
