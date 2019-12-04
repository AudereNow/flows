import axios, { AxiosResponse } from "axios";
import csvtojson from "csvtojson";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { UserRecord } from "firebase-functions/lib/providers/auth";
import africasTalkingOptions from "./africas-talking-options.json";
import {
  AdminLogEvent,
  ADMIN_LOG_EVENT_COLLECTION,
  DEFAULT_REMOTE_CONFIG,
  METADATA_COLLECTION,
  Patient,
  PATIENTS_COLLECTION,
  PaymentRecipient,
  RemoteConfig,
  REMOTE_CONFIG_DOC,
  removeEmptyFieldsInPlace,
  Task,
  TaskChangeRecord,
  TaskState,
  TASKS_COLLECTION,
  TASK_CHANGE_COLLECTION,
  User,
  UserRole
} from "./sharedtypes";

// You're going to need this file on your local machine.  It's stored in our
// team's LastPass ServerInfrastructure section.
const serviceAccount = require("../flows-app-staging-key.json");

const UPLOADED_RECORDS_COLLECTION = "uploaded_records";

const ROW_GROUP_BY_KEY = "Pharmacy Name FULL";
const RECORD_ID_FIELD = "meta:instanceID";

const TASKS_LOOP_PAGE_SIZE = 100;

type RecordUploadLog = {
  csvID: string;
  batchID: string;
  by: string;
  timestamp: number;
};

// Needed for access to Storage.  If there's a way to actually pull files from
// there without credentials (but securely, given we're in the same Firebase
// project), that'd be best.
const adminConfig = JSON.parse(process.env.FIREBASE_CONFIG!);
adminConfig.credential = admin.credential.cert(serviceAccount);
admin.initializeApp(adminConfig);

type CallResult =
  | {
      error: string;
    }
  | {
      result: string;
    };

exports.issuePayments = functions.runWith({ timeoutSeconds: 300 }).https.onCall(
  async (data, context): Promise<AxiosResponse> => {
    if (!hasRole(context, UserRole.PAYOR)) {
      throw Error(`User ${context.auth && context.auth.uid} isn't a Payor`);
    }
    if (!data || !data.recipients) {
      throw Error("No recipients specified");
    }

    data.recipients = data.recipients.map((recipient: PaymentRecipient) => ({
      ...recipient,
      phoneNumber: canonicalizePhoneNumber(recipient.phoneNumber)
    }));

    const response = await axios.post(
      africasTalkingOptions.endpoint,
      {
        username: africasTalkingOptions.username,
        productName: africasTalkingOptions.productName,
        recipients: data.recipients
      },
      {
        headers: {
          "Content-Type": "application/json",
          apikey: africasTalkingOptions.apiKey,
          Accept: "application/json"
        }
      }
    );
    if (response.status < 200 || response.status > 299) {
      throw Error(`Status ${response.status}, ${response.statusText}`);
    }
    return response.data;
  }
);

exports.setRoles = functions.https.onCall(
  async (data, context): Promise<CallResult> => {
    if (!hasRole(context, UserRole.ADMIN)) {
      return {
        error: "Request not authorized"
      };
    }

    if (!data || !data.email || !data.roles || !data.roles.length) {
      return {
        error:
          "Request did not include valid email and/or roles: " +
          JSON.stringify(data)
      };
    }

    return await setRoles(data.email, data.roles);
  }
);

function hasRole(
  context: functions.https.CallableContext,
  role: UserRole
): boolean {
  return (
    context.auth &&
    context.auth.token &&
    context.auth.token.roles &&
    context.auth.token.roles.includes(role as string)
  );
}

async function setRoles(email: string, roles: UserRole[]): Promise<CallResult> {
  const user = await admin.auth().getUserByEmail(email);

  if (!user || !user.uid) {
    return {
      error: "Unable to find user " + email
    };
  }

  await admin.auth().setCustomUserClaims(user.uid, { roles });
  await admin.auth().revokeRefreshTokens(user.uid);
  return {
    result: "Roles successfully set for " + email + ": " + JSON.stringify(roles)
  };
}

function getBestUserName(user: UserRecord) {
  return user.displayName || user.email || user.uid;
}

exports.uploadCSV = functions.https.onCall(
  async (data, context): Promise<CallResult> => {
    const authUser = await admin.auth().getUser(context.auth!.uid);
    const user: User = {
      name: getBestUserName(authUser),
      id: authUser.uid
    };
    if (!data.content) {
      return { error: "Empty file uploaded" };
    }

    await LogAdminEvent(user, `Processing CSV upload from ${user.name}`);
    const cache: any[] = [];

    try {
      const result: CallResult = await new Promise((res, rej) =>
        csvtojson({ needEmitAll: true })
          .fromString(data.content)
          .subscribe(
            row => {
              cache.push(row);
            },
            async err => {
              await LogAdminEvent(user, `CSV parsing error: ${err.err}`);
              rej({ error: err.err });
            },
            async () => {
              try {
                res(await completeCSVProcessing(cache, user));
              } catch (e) {
                rej({ error: e.err || e.message || e });
              }
            }
          )
      );
      return result;
    } catch (e) {
      console.error(e.message || e.error || JSON.stringify(e));
      return {
        error: `CSV processing error: ${e.message ||
          e.error ||
          JSON.stringify(e)}`
      };
    }
  }
);

exports.onUpdateTask = functions.firestore
  .document(TASKS_COLLECTION + "/{taskID}")
  .onWrite((change, context) => {
    if (
      change.after.exists &&
      (!change.before.exists ||
        change.after.data()!.updatedAt === change.before.data()!.updatedAt)
    ) {
      const timestamp = Date.now();
      return change.after.ref.set({ updatedAt: timestamp }, { merge: true });
    }
    return null;
  });

exports.updatePatientsTaskLists = functions.https.onCall(
  async (data, context): Promise<CallResult> => {
    await forAllTasks(tasks => Promise.all(tasks.map(updatePatientsForTask)));
    return { result: "" };
  }
);

async function forAllTasks(callback: (tasks: Task[]) => Promise<any>) {
  let tasks = await admin
    .firestore()
    .collection(TASKS_COLLECTION)
    .orderBy("id")
    .limit(TASKS_LOOP_PAGE_SIZE)
    .get();
  while (tasks.docs.length > 0) {
    console.log(`Processing tasks from ${tasks.docs[0].id}...`);
    await callback(tasks.docs.map(doc => doc.data() as Task));
    tasks = await admin
      .firestore()
      .collection(TASKS_COLLECTION)
      .orderBy("id")
      .startAfter(tasks.docs[tasks.docs.length - 1])
      .limit(TASKS_LOOP_PAGE_SIZE)
      .get();
  }
}

async function updatePatientsForTask(task: Task) {
  await Promise.all(
    task.entries.map(async entry => {
      if (!entry.patientID) {
        return;
      }
      let patient: Patient = (
        await admin
          .firestore()
          .collection(PATIENTS_COLLECTION)
          .doc(entry.patientID)
          .get()
      ).data() as Patient;
      if (!patient) {
        patient = { id: entry.patientID, taskIds: [task.id] };
      } else {
        if (patient.taskIds.includes(task.id)) {
          return;
        }
        patient.taskIds.push(task.id);
      }
      await admin
        .firestore()
        .collection(PATIENTS_COLLECTION)
        .doc(entry.patientID)
        .set(patient);
    })
  );
}

async function LogAdminEvent(user: User, desc: string) {
  const dateString = `${new Date().toISOString()} ${Math.random()}`;
  const event: AdminLogEvent = {
    timestamp: Date.now(),
    user,
    desc
  };
  console.log(desc);
  await admin
    .firestore()
    .collection(ADMIN_LOG_EVENT_COLLECTION)
    .doc(dateString)
    .set(event);
}

async function logUploadedRecords(cache: any[], batchID: string, user: User) {
  const logs = admin.firestore().collection(UPLOADED_RECORDS_COLLECTION);
  const timestamp = Date.now();

  await Promise.all(
    cache.map(r => {
      const csvID = r[RECORD_ID_FIELD];
      const log: RecordUploadLog = {
        csvID,
        batchID,
        timestamp,
        by: user.name
      };
      return logs.doc(csvID).set(log);
    })
  );
}

async function createAuditorTasks(cache: any[], batchID: string, user: User) {
  const rowsByPharmacy = groupBy(cache, ROW_GROUP_BY_KEY);
  const shuffledRowsByPharmacy = rowsByPharmacy.map(pharm => ({
    key: pharm.key,
    values: shuffleArray(pharm.values)
  }));
  const changeTemplate = {
    timestamp: Date.now(),
    by: user.name
  };

  // Now generate Auditor work items representing each sampled row.
  await Promise.all(
    shuffledRowsByPharmacy.map(async pharm => {
      const doc = admin
        .firestore()
        .collection(TASKS_COLLECTION)
        .doc();
      const patients = pharm.values.map((d: any) => ({
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
      const task: Task = {
        id: doc.id,
        state: TaskState.AUDIT,
        entries: patients,
        createdAt: Date.now(),
        site: {
          name: pharm.values[0]["Pharmacy Name FULL"],
          phone: pharm.values[0]["Pharmacy Contact and MPESA"]
        }
      };
      const record: TaskChangeRecord = {
        ...changeTemplate,
        taskID: doc.id,
        state: TaskState.AUDIT,
        fromState: TaskState.CSV
      };
      removeEmptyFieldsInPlace(task);
      await Promise.all([
        doc.set(task),
        admin
          .firestore()
          .collection(TASK_CHANGE_COLLECTION)
          .doc()
          .set(record),
        updatePatientsForTask(task)
      ]);
    })
  );
  console.log(
    `Seem to have processed ${shuffledRowsByPharmacy.length} pharmacies`
  );
}

async function findDuplicateRecords(cache: any[]): Promise<string[]> {
  if (cache.length === 0) {
    return [];
  }

  const logs = admin.firestore().collection(UPLOADED_RECORDS_COLLECTION);
  const snaps = await Promise.all(
    cache.map(c => logs.doc(c[RECORD_ID_FIELD]).get())
  );
  const dupeSnaps = snaps.filter(s => s.exists);

  return dupeSnaps.map(d => d.id);
}

async function completeCSVProcessing(
  cache: any[],
  user: User
): Promise<CallResult> {
  const validCache = cache.filter(c => c[RECORD_ID_FIELD]);
  let dedupedCache = validCache;
  console.log(`Full CSV parsed with ${validCache.length} lines`);
  let result = "";

  console.error(JSON.stringify(cache.filter(c => !c[RECORD_ID_FIELD])));

  const allowDupes = await getConfig("allowDuplicateUploads");
  if (!allowDupes) {
    const dupes = await findDuplicateRecords(validCache);

    if (dupes.length > 0) {
      result = `Ignored ${dupes.length} duplicate CSV records: ${JSON.stringify(
        dupes
      )}\n\n`;
      await LogAdminEvent(user, result);

      dedupedCache = validCache.filter(
        c => !dupes.includes(c[RECORD_ID_FIELD])
      );
    }
  }

  if (dedupedCache.length > 0) {
    const batchID = new Date().toISOString();
    await Promise.all([
      logUploadedRecords(dedupedCache, batchID, user),
      createAuditorTasks(dedupedCache, batchID, user)
    ]);
    result += `Successfully imported ${dedupedCache.length} records`;
  } else {
    result += `This file was previously uploaded`;
  }
  return { result };
}

// Copied and modified from the main app because we didn't want to inherit
// a dependency on the non-admin version of Firebase
async function getConfig(key: string) {
  const snap = await admin
    .firestore()
    .collection(METADATA_COLLECTION)
    .doc(REMOTE_CONFIG_DOC)
    .get();

  if (snap.exists) {
    const config = snap.data() as RemoteConfig;
    if (key in config) {
      // @ts-ignore
      return config[key];
    }
  }
  console.log("Didn't find /metadata/remoteConfig on server. Using defaults.");
  // @ts-ignore
  return DEFAULT_REMOTE_CONFIG[key];
}

// Groups an array of things by a string key in each element, or by a
// key-extraction function run on each element.
// https://stackoverflow.com/questions/14446511/most-efficient-method-to-groupby-on-an-array-of-objects#comment64856953_34890276
function groupBy(
  xs: any[],
  key: Function | string
): { key: string; values: any[] }[] {
  return xs.reduce(function(rv: any[], x) {
    const v = key instanceof Function ? key(x) : x[key];
    const el = rv.find(r => r && r.key === v);
    if (el) {
      el.values.push(x);
    } else {
      rv.push({ key: v, values: [x] });
    }
    return rv;
  }, []);
}

// Taken from https://stackoverflow.com/a/46545530/12071652
function shuffleArray(arr: any[]): any[] {
  return arr
    .map(a => ({ sort: Math.random(), value: a }))
    .sort((a, b) => a.sort - b.sort)
    .map(a => a.value);
}

function canonicalizePhoneNumber(phone: string): string {
  if (phone.length === 9) {
    return `+254${phone}`;
  }
  if (phone.length === 12) {
    return `+${phone}`;
  }
  return phone;
}
