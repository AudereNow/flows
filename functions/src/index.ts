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
const MIN_PHARMACY_SAMPLE_FRACTION = 0.2; // What % of pharm rows to sample

// Needed for access to Storage.  If there's a way to actually pull files from
// there without credentials (but securely, given we're in the same Firebase
// project), that'd be best.
const adminConfig = JSON.parse(process.env.FIREBASE_CONFIG!);
adminConfig.credential = admin.credential.cert(serviceAccount);
admin.initializeApp(adminConfig);

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

  csvtojson({ needEmitAll: true })
    .fromStream(stream)
    .subscribe(
      row => {
        cache.push(row);
      },
      err => console.log("CSV parsing error", err),
      completeCSVProcessing.bind(null, cache)
    );
});

async function completeCSVProcessing(cache: any[]) {
  const batchID = new Date().toISOString();

  console.log(`Full CSV parsed with ${cache.length} lines`);

  const records = admin
    .firestore()
    .collection(CSV_UPLOAD_COLLECTION)
    .doc(batchID)
    .collection(CSV_UPLOAD_RECORDS_COLLECTION);

  // Ok to let these complete without awaiting while we proceed to select a
  // subset to sample for audit.
  cache.forEach(r => records.doc(r["meta:instanceID"]).set(r));
  console.log(
    `Set ${cache.length} records into ${CSV_UPLOAD_COLLECTION}/${batchID}`
  );

  const rowsByPharmacy = groupBy(cache, ROW_GROUP_BY_KEY);
  const sampledRowsByPharmacy = rowsByPharmacy.map(pharm => {
    const shuffled = shuffleArray(pharm.values);
    const numToSample = Math.max(
      1,
      Math.ceil(pharm.values.length * MIN_PHARMACY_SAMPLE_FRACTION)
    );

    return {
      key: pharm.key,
      values: shuffled.slice(0, numToSample)
    };
  });

  // Now generate Auditor work items representing each sampled row.
  await Promise.all(sampledRowsByPharmacy.map(async pharm => {
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
    `Seem to have processed ${sampledRowsByPharmacy.length} pharmacies`
  );
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
