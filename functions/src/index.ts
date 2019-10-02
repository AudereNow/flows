import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as csvtojson from "csvtojson";

// You're going to need this file on your local machine.  It's stored in our
// team's LastPass ServerInfrastructure section.
const serviceAccount = require("../flows-app-staging-key.json");

const CSV_UPLOAD_COLLECTION = "csv_uploads";
const CSV_UPLOAD_RECORDS_COLLECTION = "records";
const AUDITOR_TODO_COLLECTION = "auditor_todo";

const ROW_GROUP_BY_KEY = "g3:B01 Pharmacy name";

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

exports.setRoles = functions.https.onCall(
  (data, context): Promise<CallResult> => {
    if (
      !context.auth ||
      !context.auth.token ||
      !context.auth.token.roles ||
      !context.auth.token.roles.includes(UserRole.ADMIN as string)
    ) {
      return new Promise(resolve =>
        resolve({
          error: "Request not authorized"
        })
      );
    }

    if (!data || !data.email || !data.roles || !data.roles.length) {
      return new Promise(resolve =>
        resolve({
          error:
            "Request did not include valid email and/or roles: " +
            JSON.stringify(data)
        })
      );
    }

    // Deliberately not awaiting here, because onCall is defined to require a
    // Promise back, which it'll resolove itself.
    return setRoles(data.email, data.roles);
  }
);

// Copied from corestore.ts in the main app for now.  Once we factor real
// backend APIs out, shared types like this should be consumed directly and
// correctly (via npms, shared libs, or some such).
enum UserRole {
  AUDITOR = "Auditor",
  PAYOR = "Payor",
  ADMIN = "Admin"
}

async function setRoles(email: string, roles: UserRole[]): Promise<CallResult> {
  const user = await admin.auth().getUserByEmail(email);

  if (!user || !user.uid) {
    return {
      error: "Unable to find user " + email
    };
  }

  await admin.auth().setCustomUserClaims(user.uid, { roles });
  return {
    result: "Roles successfully set for " + email + ": " + JSON.stringify(roles)
  };
}

exports.parseCSV = functions.storage.object().onFinalize(async object => {
  const filePath = object.name; // File path in the bucket.
  const contentType = object.contentType; // File content type.

  if (
    !filePath ||
    !filePath.startsWith("csvuploads/") ||
    contentType !== "text/csv"
  ) {
    console.log(`Skipping unrecognized file ${filePath}`);
    return;
  }
  console.log(`Processing ${filePath} of type ${contentType}`);

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
        err => {
          console.log("CSV parsing error", err);
          rej(err);
        },
        async () => {
          await completeCSVProcessing(cache);
          res();
        }
      )
  );
});

async function addToCSVUploads(cache: any[], batchID: string) {
  const records = admin
    .firestore()
    .collection(CSV_UPLOAD_COLLECTION)
    .doc(batchID)
    .collection(CSV_UPLOAD_RECORDS_COLLECTION);

  await Promise.all(cache.map(r => records.doc(r["meta:instanceID"]).set(r)));
  console.log(
    `Set ${cache.length} records into ${CSV_UPLOAD_COLLECTION}/${batchID}`
  );
}

async function createAuditorTodos(cache: any[], batchID: string) {
  const rowsByPharmacy = groupBy(cache, ROW_GROUP_BY_KEY);

  // Now generate Auditor work items representing each sampled row.
  await Promise.all(rowsByPharmacy.map(async pharm => {
    console.log(`Pharmacy ${pharm.key} has ${pharm.values.length} rows`);
    await admin
      .firestore()
      .collection(AUDITOR_TODO_COLLECTION)
      .doc()
      .set({
        batchID,
        pharmacyID: pharm.key,
        data: pharm.values
      })
  }));
  console.log(
    `Seem to have processed ${rowsByPharmacy.length} pharmacies`
  );
}

async function completeCSVProcessing(cache: any[]) {
  console.log(`Full CSV parsed with ${cache.length} lines`);

  const batchID = new Date().toISOString();
  await Promise.all([
    addToCSVUploads(cache, batchID),
    createAuditorTodos(cache, batchID),
  ]);
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
