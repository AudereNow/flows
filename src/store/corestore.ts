import * as firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import "firebase/functions";
import {
  UserRole,
  Task,
  TaskState,
  PaymentRecipient,
  ACTIVE_TASK_COLLECTION,
  removeEmptyFieldsInPlace,
  TASK_CHANGE_COLLECTION,
  TaskChangeRecord,
  TASKS_COLLECTION,
  ADMIN_LOG_EVENT_COLLECTION,
  AdminLogEvent
} from "../sharedtypes";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCspibVcd3GcAk01xHndZEJX8zuxwPIt-Y",
  authDomain: "flows-app-staging.firebaseapp.com",
  databaseURL: "https://flows-app-staging.firebaseio.com",
  projectId: "flows-app-staging",
  storageBucket: "flows-app-staging.appspot.com",
  messagingSenderId: "785605389839",
  appId: "1:785605389839:web:dedec19abb81b7df8a3d7a"
};

export type ActiveTask = {
  id: string;
  name: string;
  since: firebase.firestore.Timestamp;
};

export function initializeStore() {
  firebase.initializeApp(FIREBASE_CONFIG);
}

export async function userRoles(): Promise<UserRole[]> {
  // Uncomment next line to force a refresh of custom claims
  // await firebase.auth().currentUser!.getIdToken(true);

  const token = await firebase.auth().currentUser!.getIdTokenResult();

  if (!token.claims.roles) {
    console.log("User has no roles assigned");
    return [];
  }
  return token.claims.roles;
}

export async function changeTaskState(
  task: Task,
  newState: TaskState,
  notes?: string
) {
  const change: TaskChangeRecord = {
    taskID: task.id,
    state: newState,
    fromState: task.state,
    timestamp: Date.now(),
    by: getBestUserName(),
    notes
  };
  const updatedTask = {
    ...task,
    state: newState
  };
  removeEmptyFieldsInPlace(updatedTask);

  return Promise.all([
    firebase
      .firestore()
      .collection(TASKS_COLLECTION)
      .doc(task.id)
      .set(updatedTask),
    firebase
      .firestore()
      .collection(TASK_CHANGE_COLLECTION)
      .doc()
      .set(change)
  ]);
}

export function getBestUserName(): string {
  return (
    firebase.auth().currentUser!.displayName ||
    firebase.auth().currentUser!.email ||
    firebase.auth().currentUser!.uid
  );
}

export function subscribeToTasks(
  state: TaskState,
  callback: (tasks: Task[]) => void
): () => void {
  return (
    firebase
      .firestore()
      .collection(TASKS_COLLECTION)
      .where("state", "==", state)
      //.orderBy("updatedAt", "desc")
      .onSnapshot(snapshot =>
        callback(snapshot.docs.map(doc => (doc.data() as unknown) as Task))
      )
  );
}

export async function getChanges(taskID: string) {
  const changes = await firebase
    .firestore()
    .collection(TASK_CHANGE_COLLECTION)
    .where("taskID", "==", taskID)
    .orderBy("timestamp")
    .get();
  return changes.docs.map(d => d.data() as TaskChangeRecord);
}

export async function getAllChanges(): Promise<TaskChangeRecord[]> {
  const snap = await firebase
    .firestore()
    .collection(TASK_CHANGE_COLLECTION)
    .orderBy("timestamp")
    .get();

  return snap.docs.map(doc => doc.data() as TaskChangeRecord);
}

export async function getAdminLogs(): Promise<AdminLogEvent[]> {
  const snap = await firebase
    .firestore()
    .collection(ADMIN_LOG_EVENT_COLLECTION)
    .orderBy("timestamp")
    .get();

  return snap.docs.map(doc => doc.data() as AdminLogEvent);
}

export async function loadTasks(taskState: TaskState): Promise<Task[]> {
  const taskSnapshot = await firebase
    .firestore()
    .collection(TASKS_COLLECTION)
    .where("state", "==", taskState)
    .get();
  return taskSnapshot.docs.map(doc => (doc.data() as unknown) as Task);
}

export async function loadPreviousTasks(
  siteName: string,
  currentId: string
): Promise<Task[]> {
  const states = Object.values(TaskState);
  return (await firebase
    .firestore()
    .collection(TASKS_COLLECTION)
    .where("site.name", "==", siteName)
    .get()).docs
    .map(doc => doc.data() as Task)
    .sort((t1, t2) => states.indexOf(t1.state) - states.indexOf(t2.state))
    .filter(t => t.id !== currentId);
}

export async function setRoles(
  email: string,
  roles: UserRole[]
): Promise<string> {
  const serverSetRoles = firebase.functions().httpsCallable("setRoles");
  try {
    const result = await serverSetRoles({ email, roles });

    if (!result.data) {
      return "Unexpected empty result from setRoles on server";
    }
    if (result.data.error) {
      return `Error from server setRole: ${result.data.error}`;
    }
    if (result.data.result) {
      return result.data.result;
    }
    return "Unexpected error from server while setting roles";
  } catch (e) {
    return `Server error: ${e.message || e.error || JSON.stringify(e)}`;
  }
}

export async function issuePayments(recipients: PaymentRecipient[]) {
  // You need a big timeout on this (e.g. 300,000 msec), because Africa's
  // Talking can sometimes go 1-2 minutes before responding back with a result.
  const serverIssuePayments = firebase
    .functions()
    .httpsCallable("issuePayments", { timeout: 300000 });

  try {
    return await serverIssuePayments({
      recipients
    });
  } catch (e) {
    return {
      data: {
        error: `Server error: ${e.message || e.error || JSON.stringify(e)}`
      }
    };
  }
}

export async function uploadCSV(content: any) {
  const serverUploadCSV = firebase.functions().httpsCallable("uploadCSV");

  try {
    return await serverUploadCSV({
      content
    });
  } catch (e) {
    return {
      data: {
        error: `Server error: ${e.message || e.error || JSON.stringify(e)}`
      }
    };
  }
}

export function toServerTimestamp(date: Date): firebase.firestore.Timestamp {
  return firebase.firestore.Timestamp.fromDate(date);
}

export function dateFromServerTimestamp(
  timestamp: firebase.firestore.Timestamp
): Date {
  return timestamp.toDate();
}

export const CurrencyType: string = "KSh";

export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} ${CurrencyType}`;
}

export async function logActiveTaskView(taskID: string) {
  const userID = firebase.auth().currentUser!.uid;
  const activeTask: ActiveTask = {
    id: taskID,
    name: getBestUserName(),
    since: toServerTimestamp(new Date())
  };
  await firebase
    .firestore()
    .collection(ACTIVE_TASK_COLLECTION)
    .doc(userID)
    .set(activeTask);
}

export function subscribeActiveTasks(
  onActiveTasksChanged: (tasks: ActiveTask[]) => void
) {
  const unsubscriber = firebase
    .firestore()
    .collection(ACTIVE_TASK_COLLECTION)
    .onSnapshot(snap => {
      const actives = snap.docs.map(d => d.data() as ActiveTask);
      onActiveTasksChanged(actives);
    });
  return unsubscriber;
}
