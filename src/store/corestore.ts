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
type AuditorTodo = {
  batchID: string;
  pharmacyID: string;
  data: any;
};

export enum UserRole {
  AUDITOR = "Auditor",
  PAYOR = "Payor",
  ADMIN = "Admin"
}

// Whether a task should move forward (GO == "move to the next workflow step")
// or be halted (STOP = "declined or decided this task should halt")
export enum TaskDecision {
  GO,
  STOP
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
}

export type ClaimTask = {
  entries: ClaimEntry[]
  site: Site;
  notes?: string;
};

export type ReimbursementTask = {
  claim: Task;
  notes?: string;
};

export type TaskChangeMetadata = {
  timestamp: number;
  by: string;
  desc?: string;
};

export type Task = (ClaimTask | ReimbursementTask) & {
  flow?: TaskDecision;
  changes: TaskChangeMetadata[];
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

export async function tasksForRole(role: UserRole): Promise<Task[]> {
  switch (role) {
    case UserRole.AUDITOR:
      return loadAuditorTasks();
    case UserRole.PAYOR:
      return [
        {
          site: auditorSampleTasks[0].site,
          claim: approveClaims(auditorSampleTasks[0]),
          notes:
            "Called on 24 Sept, and they asked us to hold payment until later",
          changes: []
        },
        {
          site: auditorSampleTasks[1].site,
          claim: approveClaims(auditorSampleTasks[1]),
          changes: []
        }
      ];
    case UserRole.ADMIN:
      return [];
  }
}

async function loadAuditorTasks(): Promise<Task[]> {
  const todoSnapshot = await firebase
    .firestore()
    .collection(AUDITOR_TODO_COLLECTION)
    .get();
  const todos = todoSnapshot.docs.map(
    doc => (doc.data() as unknown) as AuditorTodo
  );

  return todos.filter(t => t && t.data && t.data.length > 0).map(t => {
    const d = t.data;
    const patients = t.data.map((d:any) =>( {
      patientAge: d["g2:A12 Age"],
      patientFirstName: d["g2:A10 First Name"],
      patientLastName: d["g2:A11 Last Name"],
      patientSex:
        d["g2:A13 Male or Female (0 male, 1 female)"] === "0" ? "M" : "F",
      patientID: d["g4:B02"]["1 ID number on voucher"],
      phone: d["g2:A14 Phone Number"],
      photoIDUri: d["g4:B03.1 Photo of ID card"],
      photoMedUri: d["g5:B04 (Medication)"],
      photoMedBatchUri: d["g5:B05 (Medication batch)"],
      item: d["Type received"],
      totalCost: parseFloat(d["Total med price covered by SPIDER"]),
      claimedCost: parseFloat(d["Total reimbursement"]),
      timestamp: new Date(d["YYYY"], d["MM"], d["DD"]).getTime(),
    }));
    return {
      entries: patients,
      site: {
        name: d[0]["g3:B01 Pharmacy name"],
      },
      changes: []
    };
  });
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

const auditorSampleTasks: ClaimTask[] = [
  {
    entries: [
      {
        patientAge: 20,
        patientFirstName: "Zawadi",
        patientLastName: "Mwangi",
        patientSex: "F",
        item: "E-Pill",
        totalCost: 81.72,
        claimedCost: 57.95,
        timestamp: new Date(2019, 9, 14).getTime(),
      },
      {
        patientAge: 37,
        patientFirstName: "Makena",
        patientLastName: "Maina",
        patientSex: "F",
        item: "Pregnancy Test",
        totalCost: 57.78,
        claimedCost: 51.95,
        timestamp: new Date(2019, 9, 12).getTime(),
      },
    ],
    site: {
      name: "Haltons Store #34",
      phone: "+254 739 994489"
    },
    notes:
      "This looks reasonable, but I'd ask them to make sure to focus the " +
      "ID card photo in the future"
  },
  {
    entries: [
      {
        patientAge: 42,
        patientFirstName: "Jimiyu",
        patientLastName: "Mwangi",
        patientSex: "M",
        item: "Condom",
        totalCost: 119.41,
        claimedCost: 67.4,
        timestamp: new Date(2019, 9, 17).getTime(),
      },
      {
        patientAge: 11,
        patientFirstName: "Okeyo",
        patientLastName: "Otieno",
        patientSex: "M",
        item: "Condom",
        totalCost: 188.82,
        claimedCost: 84.79,
        timestamp: new Date(2019, 9, 15).getTime(),
      }
    ],
    site: {
      name: "Mimosa #5",
      phone: "+254 739 994400"
    }
  }
];

const MSEC_IN_DAY = 1000 * 60 * 60 * 24;

// Only for faking data -- essentially mark claims as having been approved.
function approveClaims(task: ClaimTask): Task {
  return {
    ...task,
    flow: TaskDecision.GO,
    changes: [
      {
        timestamp: Date.now() - 3 * MSEC_IN_DAY,
        by: firebase.auth().currentUser!.displayName || "Peekaboo Street",
        desc: "Approved claim"
      }
    ]
  };
}
