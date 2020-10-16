import "./ListItem.css";

import BarLoader from "react-spinners/BarLoader";
import { PharmacyLoadingState } from "../transport/baseDatastore";
import React from "react";
import { TaskGroup } from "./TaskList";
import { formatCurrency } from "../util/currency";

export class ListItem extends React.Component<{
  tasks: TaskGroup;
  isSelected: boolean;
}> {
  render() {
    const { tasks, isSelected } = this.props;
    const previewName = "listitem" + (isSelected ? " selected" : "");
    const claimCount = tasks.stats
      ? tasks.stats.claimCount
      : tasks.tasks.map(task => task.entries.length).reduce((a, b) => a + b, 0);
    const totalReimbursement = tasks.stats?.totalReimbursement;
    const loading = tasks.stats?.loadingState === PharmacyLoadingState.LOADING;
    return (
      <div>
        <div className={previewName}>
          <div className="listitem_header">
            <span>{tasks.site.name}</span>
          </div>
          <div>
            {claimCount} Claim{claimCount !== 1 ? "s" : ""}
          </div>
          {totalReimbursement !== undefined && (
            <div>
              Total Reimbursement:{" "}
              <span style={{ whiteSpace: "nowrap" }}>
                {formatCurrency(totalReimbursement)}
              </span>
            </div>
          )}
        </div>
        {loading && <BarLoader css="width: auto" color="#275d5f" />}
      </div>
    );
  }
}
