import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import csvtojson from "csvtojson";
import axios, { AxiosResponse } from "axios";
import africasTalkingOptions from "./africas-talking-options.json";
import {
  AdminLogEvent,
  ADMIN_LOG_EVENT_COLLECTION,
  AUDITOR_TASK_COLLECTION,
  DEFAULT_REMOTE_CONFIG,
  METADATA_COLLECTION,
  REMOTE_CONFIG_DOC,
  RemoteConfig,
  removeEmptyFieldsInPlace,
  Task,
  TaskChangeMetadata,
  UploaderInfo,
  User,
  UserRole
} from "./sharedtypes";

// You're going to need this file on your local machine.  It's stored in our
// team's LastPass ServerInfrastructure section.
const serviceAccount = require("../flows-app-staging-key.json");

const CSV_UPLOAD_COLLECTION = "csv_uploads";
const CSV_UPLOAD_RECORDS_COLLECTION = "records";

const ROW_GROUP_BY_KEY = "g3:B01 Pharmacy name";
const RECORD_ID_FIELD = "meta:instanceID";

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

exports.parseCSV = functions.storage.object().onFinalize(async object => {
  const filePath = object.name; // File path in the bucket.
  const contentType = object.contentType; // File content type.
  const uploader = (object.metadata || {
    uploaderName: "Unknown Person",
    uploaderID: "unknown"
  }) as UploaderInfo;
  const user: User = {
    name: uploader.uploaderName,
    id: uploader.uploaderID
  };

  if (
    !filePath ||
    !filePath.startsWith("csvuploads/") ||
    contentType !== "text/csv"
  ) {
    return LogAdminEvent(user, `Skipping unrecognized file ${filePath}`);
  }
  await LogAdminEvent(user, `Processing CSV upload: ${filePath}`);

  const stream = admin
    .storage()
    .bucket(object.bucket)
    .file(filePath)
    .createReadStream();
  const cache: any[] = [];

  await new Promise((res, rej) =>
    csvtojson({ needEmitAll: true })
      .fromStream(stream)
      .subscribe(
        row => {
          cache.push(row);
        },
        async err => {
          await LogAdminEvent(user, `CSV parsing error: ${err.err}`);
          rej(err);
        },
        async () => {
          try {
            await completeCSVProcessing(cache, user);
          } catch (e) {
            rej(e);
            return;
          }
          res();
        }
      )
  );
});

async function LogAdminEvent(user: User, desc: string) {
  const dateString = `${new Date().toUTCString()} ${Math.random()}`;
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

async function addToCSVUploads(cache: any[], batchID: string) {
  const records = admin
    .firestore()
    .collection(CSV_UPLOAD_COLLECTION)
    .doc(batchID)
    .collection(CSV_UPLOAD_RECORDS_COLLECTION);

  await Promise.all(cache.map(r => records.doc(r[RECORD_ID_FIELD]).set(r)));
  console.log(
    `Set ${cache.length} records into ${CSV_UPLOAD_COLLECTION}/${batchID}`
  );
}

async function createAuditorTasks(cache: any[], batchID: string, user: User) {
  const rowsByPharmacy = groupBy(cache, ROW_GROUP_BY_KEY);
  const shuffledRowsByPharmacy = rowsByPharmacy.map(pharm => ({
    key: pharm.key,
    values: shuffleArray(pharm.values)
  }));
  const change: TaskChangeMetadata = {
    timestamp: Date.now(),
    by: user.name,
    desc: `Uploaded CSV containing ${shuffledRowsByPharmacy.length} pharmacies`
  };

  // Now generate Auditor work items representing each sampled row.
  await Promise.all(
    shuffledRowsByPharmacy.map(async pharm => {
      const doc = admin
        .firestore()
        .collection(AUDITOR_TASK_COLLECTION)
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
        batchID,
        entries: patients,
        site: {
          name: pharm.values[0]["g3:B01 Pharmacy name"]
        },
        changes: [change]
      };
      removeEmptyFieldsInPlace(task);
      await doc.set(task);
    })
  );
  console.log(
    `Seem to have processed ${shuffledRowsByPharmacy.length} pharmacies`
  );
}

async function isDuplicateUpload(cache: any[]): Promise<boolean> {
  if (cache.length === 0) {
    return false;
  }

  const firstItemID = cache[0][RECORD_ID_FIELD];
  if (!firstItemID) {
    // It's a matter of opinion how "safe" we want to be here.  To be
    // conservative, we assume that if the first record doesn't even have
    // an ID, it's a duplicate CSV.
    console.log(`Ignoring CSV with a first record missing ${RECORD_ID_FIELD}`);
    return true;
  }

  const items = await admin
    .firestore()
    .collectionGroup(CSV_UPLOAD_RECORDS_COLLECTION)
    .where(RECORD_ID_FIELD, "==", firstItemID)
    .get();

  console.log(
    `Searched for ${firstItemID} and found ${items.docs.length} matches`
  );

  return !items.empty;
}

async function completeCSVProcessing(cache: any[], user: User) {
  console.log(`Full CSV parsed with ${cache.length} lines`);

  const allowDupes = await getConfig("allowDuplicateUploads");
  if (!allowDupes) {
    const dupeExists = await isDuplicateUpload(cache);

    if (dupeExists) {
      return LogAdminEvent(user, `Duplicate CSV upload ignored`);
    }
  }

  const batchID = new Date().toISOString();
  await Promise.all([
    addToCSVUploads(cache, batchID),
    createAuditorTasks(cache, batchID, user)
  ]);
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
