import "firebase/auth";
import "firebase/firestore";
import "firebase/functions";

import * as firebase from "firebase/app";

import {
  ACTIVE_TASK_COLLECTION,
  ADMIN_LOG_EVENT_COLLECTION,
  AdminLogEvent,
  CANNED_NOTES_COLLECTION,
  PATIENTS_COLLECTION,
  PHARMACY_COLLECTION,
  Patient,
  PaymentRecipient,
  PaymentRecord,
  Pharmacy,
  TASKS_COLLECTION,
  TASK_CHANGE_COLLECTION,
  Task,
  TaskChangeRecord,
  TaskState,
  User,
  UserRole,
  removeEmptyFieldsInPlace,
} from "../sharedtypes";
import { ActiveTask, DataStore, PatientHistory } from "./baseDatastore";

import { formatCurrency } from "../util/currency";

export class FirebaseDataStore extends DataStore {
  async initializeStore() {
    firebase.initializeApp((await fetch("/__/firebase/init.json")).json());
  }

  onAuthStateChanged(callback: (authenticated: boolean) => void) {
    firebase.auth().onAuthStateChanged(user => callback(!!user));
  }

  async logout() {
    await firebase.auth().signOut();
  }

  async userRoles(): Promise<UserRole[]> {
    // Uncomment next line to force a refresh of custom claims
    // await firebase.auth().currentUser!.getIdToken(true);

    const token = await firebase.auth().currentUser!.getIdTokenResult();

    if (!token.claims.roles) {
      console.log("User has no roles assigned");
      return [];
    }
    return token.claims.roles;
  }

  async changeTaskState(
    tasks: Task[],
    reviewedTasks: Task[],
    flaggedTasks: Task[],
    newState: TaskState,
    notes: string,
    payment?: PaymentRecord
  ) {
    await Promise.all(
      tasks.map(async task => {
        const change: TaskChangeRecord = {
          taskID: task.id,
          state: newState,
          fromState: task.state,
          timestamp: Date.now(),
          by: this.getBestUserName(),
          notes,
        };
        if (payment) {
          change.payment = payment;
        }

        task.updatedAt = new Date().getMilliseconds();

        const updatedTask = {
          ...task,
          state: newState,
        };
        removeEmptyFieldsInPlace(updatedTask);
        await Promise.all([
          this.saveTask(updatedTask, task.id),
          firebase
            .firestore()
            .collection(TASK_CHANGE_COLLECTION)
            .doc()
            .set(change),
        ]);
      })
    );
  }

  getUserEmail(): string {
    return firebase.auth().currentUser!.email!;
  }

  getBestUserName(): string {
    return (
      firebase.auth().currentUser!.displayName ||
      firebase.auth().currentUser!.email ||
      firebase.auth().currentUser!.uid
    );
  }

  subscribeToTasks(
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

  async getChanges(taskID: string) {
    const changes = await firebase
      .firestore()
      .collection(TASK_CHANGE_COLLECTION)
      .where("taskID", "==", taskID)
      .orderBy("timestamp")
      .get();
    return changes.docs.map(d => d.data() as TaskChangeRecord);
  }

  async getAllChanges(): Promise<TaskChangeRecord[]> {
    const snap = await firebase
      .firestore()
      .collection(TASK_CHANGE_COLLECTION)
      .orderBy("timestamp")
      .get();

    return snap.docs.map(doc => doc.data() as TaskChangeRecord);
  }

  async getAdminLogs(): Promise<AdminLogEvent[]> {
    const snap = await firebase
      .firestore()
      .collection(ADMIN_LOG_EVENT_COLLECTION)
      .orderBy("timestamp")
      .get();

    return snap.docs.map(doc => doc.data() as AdminLogEvent);
  }

  async loadTasks(taskState: TaskState): Promise<Task[]> {
    const taskSnapshot = await firebase
      .firestore()
      .collection(TASKS_COLLECTION)
      .where("state", "==", taskState)
      .get();
    return taskSnapshot.docs.map(doc => (doc.data() as unknown) as Task);
  }

  async loadFlags(tasks: Task[]) {
    console.warn("Load flags not implemented");
    return {};
  }

  async loadPreviousTasks(
    siteName: string,
    currentIds: string[]
  ): Promise<Task[]> {
    const states = Object.values(TaskState);
    return (
      await firebase
        .firestore()
        .collection(TASKS_COLLECTION)
        .where("site.name", "==", siteName)
        .get()
    ).docs
      .map(doc => doc.data() as Task)
      .sort((t1, t2) => states.indexOf(t1.state) - states.indexOf(t2.state))
      .filter(t => !currentIds.includes(t.id));
  }

  async setRoles(email: string, roles: UserRole[]): Promise<string> {
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

  async issuePayments(
    recipients: PaymentRecipient[]
  ): Promise<firebase.functions.HttpsCallableResult> {
    // You need a big timeout on this (e.g. 300,000 msec), because Africa's
    // Talking can sometimes go 1-2 minutes before responding back with a result.
    const serverIssuePayments = firebase
      .functions()
      .httpsCallable("issuePayments", { timeout: 300000 });
    const totalPayment = recipients.reduce(
      (total, recipient) => total + recipient.amount,
      0
    );

    try {
      this.logAdminEvent(
        `${recipients.length} payments issued totalling ${totalPayment}`
      );
      return await serverIssuePayments({
        recipients,
      });
    } catch (e) {
      this.logAdminEvent(
        `${recipients.length} payments failed totalling ${totalPayment}`
      );
      return {
        data: {
          error: `Server error: ${e.message || e.error || JSON.stringify(e)}`,
        },
      };
    }
  }

  async logAdminEvent(desc: string) {
    const authUser = await firebase.auth().currentUser;
    const user: User = {
      name: this.getBestUserName(),
      id: authUser ? authUser.uid : "",
    };
    const dateString = `${new Date().toISOString()} ${Math.random()}`;
    const event: AdminLogEvent = {
      timestamp: Date.now(),
      user,
      desc,
    };

    await firebase
      .firestore()
      .collection(ADMIN_LOG_EVENT_COLLECTION)
      .doc(dateString)
      .set(event);
  }

  async updatePatientsTaskLists() {
    const serverUpdatePatientsTaskLists = firebase
      .functions()
      .httpsCallable("updatePatientsTaskLists");
    try {
      return await serverUpdatePatientsTaskLists();
    } catch (e) {
      return {
        data: {
          error: `Server error: ${e.message || e.error || JSON.stringify(e)}`,
        },
      };
    }
  }

  async uploadCSV(content: any) {
    const serverUploadCSV = firebase.functions().httpsCallable("uploadCSV");

    try {
      return await serverUploadCSV({
        content,
      });
    } catch (e) {
      return {
        data: {
          error: `Server error: ${e.message || e.error || JSON.stringify(e)}`,
        },
      };
    }
  }

  toServerTimestamp(date: Date): firebase.firestore.Timestamp {
    return firebase.firestore.Timestamp.fromDate(date);
  }

  dateFromServerTimestamp(timestamp: firebase.firestore.Timestamp): Date {
    return timestamp.toDate();
  }

  async logActiveTaskView(taskID: string) {
    const userID = firebase.auth().currentUser!.uid;
    const activeTask: ActiveTask = {
      id: taskID,
      name: this.getBestUserName(),
      since: this.toServerTimestamp(new Date()),
    };
    await firebase
      .firestore()
      .collection(ACTIVE_TASK_COLLECTION)
      .doc(userID)
      .set(activeTask);
  }

  subscribeActiveTasks(onActiveTasksChanged: (tasks: ActiveTask[]) => void) {
    const unsubscriber = firebase
      .firestore()
      .collection(ACTIVE_TASK_COLLECTION)
      .onSnapshot(snap => {
        const actives = snap.docs.map(d => d.data() as ActiveTask);
        onActiveTasksChanged(actives);
      });
    return unsubscriber;
  }

  subscribeToPharmacyDetails(
    pharmacyId: string,
    callback: (pharmacy: Pharmacy) => void
  ): () => void {
    return firebase
      .firestore()
      .collection(PHARMACY_COLLECTION)
      .doc(pharmacyId)
      .onSnapshot(snapshot => {
        callback(snapshot.data() as Pharmacy);
      });
  }

  async getPharmacyDetails(pharmacyId: string): Promise<Pharmacy> {
    return (
      await firebase
        .firestore()
        .collection(PHARMACY_COLLECTION)
        .doc(pharmacyId)
        .get()
    ).data() as Pharmacy;
  }

  async setPharmacyDetails(pharmacyId: string, pharmacy: Pharmacy) {
    await firebase
      .firestore()
      .collection(PHARMACY_COLLECTION)
      .doc(pharmacyId)
      .set(pharmacy);
  }

  async getAllDocsIn<T>(
    collection: string,
    attribute: string,
    attributeValues: string[]
  ): Promise<T[]> {
    if (attributeValues.length === 0) {
      return [];
    }

    return (
      await Promise.all(
        new Array(Math.ceil(attributeValues.length / 10)).fill(0).map(
          async (_, index) =>
            (
              await firebase
                .firestore()
                .collection(collection)
                .where(
                  attribute,
                  //@ts-ignore
                  "in",
                  attributeValues.slice(index * 10, (index + 1) * 10)
                )
                .get()
            ).docs.map((doc: any) => doc.data()) as T[]
        )
      )
    ).flat();
  }

  getAllTasks(taskIds: string[]): Promise<Task[]> {
    return this.getAllDocsIn<Task>(TASKS_COLLECTION, "id", taskIds);
  }

  async getPatientHistories(patientIds: string[]) {
    const patients = await this.getAllDocsIn<Patient>(
      PATIENTS_COLLECTION,
      "id",
      patientIds
    );
    const patientHistories: { [id: string]: PatientHistory } = {};
    await Promise.all(
      patients.map(async patient => {
        const tasks = (
          await this.getAllDocsIn<Task>(TASKS_COLLECTION, "id", patient.taskIds)
        )
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 5);
        const history = tasks.map(task => {
          const entries = task.entries.filter(
            entry => entry.patientID === patient.id
          );
          const sum = entries
            .map(entry => entry.claimedCost)
            .reduce((a, b) => a + b, 0);
          return {
            taskId: task.id,
            date: new Date(task.createdAt).toLocaleDateString(),
            totalAmount: formatCurrency(sum),
            claimCount: entries.length,
          };
        });
        patientHistories[patient.id] = {
          tasks: history,
        };
      })
    );
    return patientHistories;
  }

  async getPharmacyClaims(siteName: string): Promise<Task[]> {
    return await firebase
      .firestore()
      .collection(TASKS_COLLECTION)
      .where("site.name", "==", siteName)
      .get()
      .then(snapshot => {
        let data: Task[] = [];
        snapshot.docs.forEach(snap => {
          data.push(snap.data() as Task);
        });
        return data;
      });
  }

  saveNotes(categoryName: string, notes: string[]) {
    return firebase
      .firestore()
      .collection(CANNED_NOTES_COLLECTION)
      .doc(categoryName)
      .set({ notes });
  }

  async getNotes(categoryName: string): Promise<string[]> {
    const data = (
      await firebase
        .firestore()
        .collection(CANNED_NOTES_COLLECTION)
        .doc(categoryName)
        .get()
    ).data();
    return data ? data.notes : [];
  }

  subscribeToNotes(
    categoryName: string,
    callback: (notes: string[]) => void
  ): () => void {
    return firebase
      .firestore()
      .collection(CANNED_NOTES_COLLECTION)
      .doc(categoryName)
      .onSnapshot(snapshot => {
        const data = snapshot.data();
        callback(data ? data.notes : []);
      });
  }

  async setClaimNotes(task: Task, claimIndex: number, notes: string) {
    task.entries[claimIndex].notes?.push(notes);
    return await this.saveTask(task, task.id);
  }

  async setRejectedClaim(task: Task, claimIndex: number, rejected: boolean) {
    task.entries[claimIndex].rejected = rejected;
    removeEmptyFieldsInPlace(task);
    return await this.saveTask(task, task.id);
  }

  saveTask(task: Task, id: string) {
    const { foundCount, ...cleanedTask } = task as any;
    return firebase
      .firestore()
      .collection(TASKS_COLLECTION)
      .doc(id)
      .set(cleanedTask);
  }
}
