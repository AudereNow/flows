import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import "firebase/functions";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCspibVcd3GcAk01xHndZEJX8zuxwPIt-Y",
  authDomain: "flows-app-staging.firebaseapp.com",
  databaseURL: "https://flows-app-staging.firebaseio.com",
  projectId: "flows-app-staging",
  storageBucket: "flows-app-staging.appspot.com",
  messagingSenderId: "785605389839",
  appId: "1:785605389839:web:dedec19abb81b7df8a3d7a"
};
const AUDITOR_TODO_COLLECTION = "auditor_todo";
const OPERATOR_TASK_COLLECTION = "operator_task";
const PAYOR_TASK_COLLECTION = "payor_task";
const PAYMENT_COMPLETE_TASK_COLLECTION = "payment_complete_task";
const ACTIVE_TASK_COLLECTION = "actively_viewed_tasks";
const REJECTED_TASK_COLLECTION = "rejected_task";

type AuditorTodo = {
  batchID: string;
  pharmacyID: string;
  data: any;
};

export enum UserRole {
  AUDITOR = "Auditor",
  PAYOR = "Payor",
  OPERATOR = "Operator",
  ADMIN = "Admin"
}

export enum TaskDecision {
  DECLINE_AUDIT = "Decline Audit",
  APPROVE_AUDIT = "Approve Audit",
  DECLINE_PAYMENT = "Decline Payment",
  PAYMENT_COMPLETE = "Payment Complete",
  TASK_REJECTED = "Task Rejected"
}

export type Site = {
  name: string;
  phone?: string;
};

export type ClaimEntry = {
  patientAge?: number;
  patientFirstName: string;
  patientLastName: string;
  patientSex?: string;
  patientID?: string;
  phone?: string;
  item: string;
  totalCost: number;
  claimedCost: number;
  photoIDUri?: string;
  photoMedUri?: string;
  photoMedBatchUri?: string;
  timestamp: number;
  reviewed?: boolean;
};

export type ClaimTask = {
  entries: ClaimEntry[];
  site: Site;
};

export type TaskChangeMetadata = {
  timestamp: number;
  by: string;
  desc?: string;
  notes?: string;
};

export type Task = ClaimTask & {
  id: string;
  flow?: TaskDecision;
  changes: TaskChangeMetadata[];
};

export type PaymentRecipient = {
  name?: string;
  phoneNumber: string;
  currencyCode: string;
  amount: number;
  reason?: string;
  metadata: {
    [key: string]: any;
  };
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

export async function declineAudit(task: Task, notes?: string) {
  await saveDeclinedTask(
    task,
    TaskDecision.DECLINE_AUDIT,
    AUDITOR_TODO_COLLECTION,
    notes
  );
}

export async function declinePayment(task: Task, notes?: string) {
  await saveDeclinedTask(
    task,
    TaskDecision.DECLINE_PAYMENT,
    PAYOR_TASK_COLLECTION,
    notes
  );
}

async function saveDeclinedTask(
  task: Task,
  decision: TaskDecision,
  fromCollection: string,
  notes?: string
) {
  task.flow = decision;
  task.changes.push({
    timestamp: Date.now(),
    by: getBestUserName(),
    desc: decision as string,
    notes
  });
  removeEmptyFieldsInPlace(task);

  return Promise.all([
    firebase
      .firestore()
      .collection(OPERATOR_TASK_COLLECTION)
      .doc(task.id)
      .set(task),
    firebase
      .firestore()
      .collection(fromCollection)
      .doc(task.id)
      .delete()
  ]);
}

export async function saveAuditorApprovedTask(
  task: Task,
  notes: string,
  samplesReviewed: number
) {
  task.flow = TaskDecision.APPROVE_AUDIT;
  task.changes.push({
    timestamp: Date.now(),
    by: getBestUserName(),
    desc: TaskDecision.APPROVE_AUDIT,
    notes
  });
  task.entries = task.entries.map((entry, index) => {
    if (index < samplesReviewed) {
      return {
        ...entry,
        reviewed: true
      };
    }
    return entry;
  });
  removeEmptyFieldsInPlace(task);

  return Promise.all([
    firebase
      .firestore()
      .collection(PAYOR_TASK_COLLECTION)
      .doc(task.id)
      .set(task),
    firebase
      .firestore()
      .collection(AUDITOR_TODO_COLLECTION)
      .doc(task.id)
      .delete()
  ]);
}

export async function saveOperatorApprovedTask(task: Task, notes?: string) {
  task.flow = TaskDecision.APPROVE_AUDIT;
  task.changes.push({
    timestamp: Date.now(),
    by: getBestUserName(),
    desc: TaskDecision.APPROVE_AUDIT,
    notes
  });
  removeEmptyFieldsInPlace(task);

  return Promise.all([
    firebase
      .firestore()
      .collection(PAYOR_TASK_COLLECTION)
      .doc(task.id)
      .set(task),
    firebase
      .firestore()
      .collection(OPERATOR_TASK_COLLECTION)
      .doc(task.id)
      .delete()
  ]);
}

export async function saveOperatorRejectedTask(task: Task, notes?: string) {
  task.flow = TaskDecision.TASK_REJECTED;
  task.changes.push({
    timestamp: Date.now(),
    by: getBestUserName(),
    desc: TaskDecision.TASK_REJECTED,
    notes
  });
  removeEmptyFieldsInPlace(task);

  return Promise.all([
    firebase
      .firestore()
      .collection(REJECTED_TASK_COLLECTION)
      .doc(task.id)
      .set(task),
    firebase
      .firestore()
      .collection(OPERATOR_TASK_COLLECTION)
      .doc(task.id)
      .delete()
  ]);
}

export async function savePaymentCompletedTask(task: Task, notes?: string) {
  task.flow = TaskDecision.PAYMENT_COMPLETE;
  task.changes.push({
    timestamp: Date.now(),
    by: getBestUserName(),
    desc: TaskDecision.PAYMENT_COMPLETE,
    notes
  });
  removeEmptyFieldsInPlace(task);

  return Promise.all([
    firebase
      .firestore()
      .collection(PAYMENT_COMPLETE_TASK_COLLECTION)
      .doc(task.id)
      .set(task),
    firebase
      .firestore()
      .collection(PAYOR_TASK_COLLECTION)
      .doc(task.id)
      .delete()
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
  taskCollection: string,
  callback: (tasks: Task[]) => void
): () => void {
  return firebase
    .firestore()
    .collection(taskCollection)
    .onSnapshot(snapshot =>
      callback(snapshot.docs.map(doc => (doc.data() as unknown) as Task))
    );
}

export async function loadOperatorTasks(): Promise<Task[]> {
  const taskSnapshot = await firebase
    .firestore()
    .collection(OPERATOR_TASK_COLLECTION)
    .get();
  return taskSnapshot.docs.map(doc => (doc.data() as unknown) as Task);
}

export async function loadAuditorTasks(): Promise<Task[]> {
  const todoSnapshot = await firebase
    .firestore()
    .collection(AUDITOR_TODO_COLLECTION)
    .get();
  const todos = todoSnapshot.docs.map(doc => {
    const todo = (doc.data() as unknown) as AuditorTodo;
    return {
      ...todo,
      id: doc.id
    };
  });

  return todos
    .filter(t => t && t.data && t.data.length > 0)
    .map(t => {
      const d = t.data;
      const patients = t.data.map((d: any) => ({
        patientAge: d["g2:A12 Age"],
        patientFirstName: d["g2:A10 First Name"],
        patientLastName: d["g2:A11 Last Name"],
        patientSex:
          d["g2:A13 Male or Female (0 male, 1 female)"] === "0" ? "M" : "F",
        patientID: d["g4:B02"]["1 ID number on voucher"],
        phone: d["g2:A14 Phone Number"],
        photoIDUri: d["g4:B03"]["1 Photo of ID card"],
        photoMedUri: d["g5:B04 (Medication)"],
        photoMedBatchUri: d["g5:B05 (Medication batch)"],
        item: d["Type received"],
        totalCost: parseFloat(d["Total med price covered by SPIDER"]),
        claimedCost: parseFloat(d["Total reimbursement"]),
        timestamp: new Date(d["YYYY"], d["MM"] - 1, d["DD"]).getTime()
      }));
      return {
        id: t.id,
        entries: patients,
        site: {
          name: d[0]["g3:B01 Pharmacy name"]
        },
        changes: []
      };
    });
}

export async function loadCompletedPaymentTasks(): Promise<Task[]> {
  const taskSnapshot = await firebase
    .firestore()
    .collection(PAYMENT_COMPLETE_TASK_COLLECTION)
    .get();
  return taskSnapshot.docs.map(doc => (doc.data() as unknown) as Task);
}

export async function loadRejectedTasks(): Promise<Task[]> {
  const taskSnapshot = await firebase
    .firestore()
    .collection(REJECTED_TASK_COLLECTION)
    .get();
  return taskSnapshot.docs.map(doc => (doc.data() as unknown) as Task);
}

export async function setRoles(email: string, roles: UserRole[]) {
  const serverSetRoles = firebase.functions().httpsCallable("setRoles");
  const result = await serverSetRoles({ email, roles });

  if (!result.data) {
    console.log("Unexpected empty result from setRoles on server");
  }
  if (result.data.error) {
    console.log(`Error from server setRole: ${result.data.error}`);
  }
  if (result.data.result) {
    console.log(`Server setRole successful: ${result.data.result}`);
  }
}

export async function issuePayments(recipients: PaymentRecipient[]) {
  // You need a big timeout on this (e.g. 300,000 msec), because Africa's
  // Talking can sometimes go 1-2 minutes before responding back with a result.
  const serverIssuePayments = firebase
    .functions()
    .httpsCallable("issuePayments", { timeout: 300000 });

  return await serverIssuePayments({
    recipients
  });
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

// https://stackoverflow.com/questions/286141/remove-blank-attributes-from-an-object-in-javascript
function removeEmptyFieldsInPlace(obj: { [key: string]: any }) {
  Object.keys(obj).forEach(key => {
    if (obj[key] && typeof obj[key] === "object") {
      removeEmptyFieldsInPlace(obj[key]);
    } else if (obj[key] == null) {
      // Note this captures undefined as well!
      delete obj[key];
    }
  });
}
