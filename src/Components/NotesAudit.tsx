import React, { Fragment, useState, useEffect } from "react";
import { RouteComponentProps, withRouter } from "react-router";
import { Link } from "react-router-dom";
import "./NotesAudit.css";
import { PaymentType, TaskChangeRecord, Task, TaskState } from "../sharedtypes";
import { formatCurrency, getAllTasks } from "../transport/firestore";
import ReactTooltip from "react-tooltip";
import moment from "moment";

interface Props {
  change: TaskChangeRecord;
}

const CHANGE_MESSAGES: {
  [from: string]: {
    [to: string]:
      | React.ReactNode
      | ((
          change: TaskChangeRecord,
          by: string,
          when: string,
          tasks: { [taskId: string]: Task }
        ) => React.ReactNode);
  };
} = {
  [TaskState.CSV]: {
    [TaskState.AUDIT]: "uploaded for primary review",
  },
  [TaskState.AUDIT]: {
    [TaskState.AUDIT]: "added a note",
    [TaskState.FOLLOWUP]: "sent for secondary followup",
    [TaskState.PAY]: "approved for payment",
  },
  [TaskState.FOLLOWUP]: {
    [TaskState.FOLLOWUP]: "added a note",
    [TaskState.REJECTED]: "rejected",
    [TaskState.PAY]: "approved for payment",
    [TaskState.AUDIT]: "sent back to primary review",
  },
  [TaskState.PAY]: {
    [TaskState.FOLLOWUP]: "sent back for secondary followup",
    [TaskState.COMPLETED]: (change, by, when, tasks) => {
      if (!change.payment) {
        return `${by} paid ${when}`;
      }
      if (change.payment.paymentType === PaymentType.BUNDLED) {
        const bundledTask =
          change.payment.bundledUnderTaskId &&
          tasks[change.payment.bundledUnderTaskId];
        return (
          <Fragment>
            {by} paid {when}. See:{" "}
            <TaskLink
              taskId={change.payment.bundledUnderTaskId!}
              state="completed"
            >
              Week of{" "}
              {bundledTask
                ? new Date(bundledTask.createdAt).toLocaleDateString()
                : change.payment.bundledUnderTaskId!.substring(0, 12)}
            </TaskLink>
          </Fragment>
        );
      }
      if (change.payment.paymentType === PaymentType.MANUAL) {
        return `${by} manually paid ${formatCurrency(
          change.payment.amount
        )} ${when}`;
      } else {
        return `${by} paid ${formatCurrency(change.payment.amount)} to ${
          change.payment.recipient!.phoneNumber
        } ${when}`;
      }
    },
  },
};

const TaskLink = withRouter(
  (
    props: RouteComponentProps & {
      taskId: string;
      state: string;
      children?: React.ReactNode;
    }
  ) => {
    return (
      <Link
        to={() => {
          ReactTooltip.hide();
          return `/${props.state}/${props.taskId}`;
        }}
        className="notesaudit_tasklink"
      >
        {props.children}
      </Link>
    );
  }
);

const NotesAudit = (props: Props) => {
  const { timestamp, by, notes } = props.change;
  const [tasks, setTasks] = useState({});
  const bundledTaskIds =
    props.change.payment && props.change.payment.bundledTaskIds;
  const bundledUnderTaskId =
    props.change.payment && props.change.payment.bundledUnderTaskId;
  useEffect(() => {
    (async () => {
      const otherTaskIds = bundledTaskIds || [];
      if (bundledUnderTaskId) {
        otherTaskIds.push(bundledUnderTaskId);
      }
      if (!otherTaskIds.length) {
        return;
      }
      const tasksById: { [id: string]: Task } = {};
      (await getAllTasks(otherTaskIds)).forEach(
        task => (tasksById[task.id] = task)
      );
      setTasks(tasksById);
    })();
  }, [bundledTaskIds, bundledUnderTaskId]);
  const notesClause = notes ? (
    <span>
      {": "}
      <strong>{notes}</strong>
    </span>
  ) : (
    ""
  );
  const desc = getDescription(
    props.change,
    by,
    moment(timestamp).fromNow(),
    tasks
  );
  const tip = new Date(timestamp).toLocaleString();
  return (
    <div
      className="notesaudit_row"
      key={`${props.change.timestamp}`}
      data-tip={tip}
    >
      {desc}
      {notesClause}
      <ReactTooltip key={tip} />
    </div>
  );
};

function getDescription(
  change: TaskChangeRecord,
  by: string,
  when: string,
  otherTasks: { [taskId: string]: Task }
) {
  const { fromState, state: toState } = change;
  let msg = "";
  if (CHANGE_MESSAGES[fromState] && CHANGE_MESSAGES[fromState][toState]) {
    const message = CHANGE_MESSAGES[fromState][toState];
    if (typeof message === "function") {
      msg = message(change, by, when, otherTasks);
    } else {
      msg = `${by} ${message} ${when}`;
    }
  } else {
    msg = `${by} moved from ${fromState} to ${toState} ${when}`;
  }
  if (change.payment && change.payment.bundledTaskIds) {
    return [
      msg,
      <div>This payment also covered:</div>,
      ...change.payment.bundledTaskIds.map(taskId => {
        const task = otherTasks[taskId];
        if (!task) {
          return null;
        }
        return (
          <div key={taskId}>
            <TaskLink taskId={taskId} state="completed">
              Week of {new Date(task.createdAt).toLocaleDateString()}
            </TaskLink>
          </div>
        );
      }),
    ];
  }
  return msg;
}

export default NotesAudit;
