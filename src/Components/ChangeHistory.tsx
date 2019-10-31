import React from "react";
import { TaskChangeRecord } from "../sharedtypes";
import { getAllChanges } from "../store/corestore";
import DataTable from "./DataTable";

type Props = {};
type State = {
  changes: TaskChangeRecord[];
};

class ChangeHistory extends React.Component<Props, State> {
  state: State = {
    changes: []
  };

  async componentDidMount() {
    const changes = await getAllChanges();
    this.setState({ changes });
  }

  render() {
    const { changes } = this.state;
    return (
      <div>
        {changes.length === 0 ? (
          "No changes found"
        ) : (
          <DataTable data={changes} />
        )}
      </div>
    );
  }
}

export default ChangeHistory;
