import "./ListItem.css";

import BarLoader from "react-spinners/BarLoader";
import { ItemComponentProps } from "../Screens/TaskPanel";
import { PharmacyLoadingState } from "../transport/baseDatastore";
import React from "react";
import { formatCurrency } from "../util/currency";
import { lastUpdatedTime } from "../util/tasks";

export class ListItem extends React.Component<ItemComponentProps> {
  render() {
    const { tasks, isSelected, showLastModified } = this.props;
    const previewName = "listitem" + (isSelected ? " selected" : "");
    const claimCount = tasks.stats
      ? tasks.stats.claimCount
      : tasks.tasks.map(task => task.entries.length).reduce((a, b) => a + b, 0);
    const totalReimbursement = tasks.stats?.totalReimbursement;
    const loading = tasks.stats?.loadingState === PharmacyLoadingState.LOADING;
    const lastModified = lastUpdatedTime(tasks.tasks);
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
          {showLastModified && lastModified !== 0 && (
            <div>
              Last Modified: {new Date(lastModified).toLocaleDateString()}
            </div>
          )}
        </div>
        {loading && <BarLoader css="width: auto" color="#275d5f" />}
      </div>
    );
  }
}
