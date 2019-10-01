import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";

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
  AUDITOR,
  PAYOR
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

export type ClaimTask = {
  patientAge?: number;
  patientFirstName: string;
  patientLastName: string;
  patientSex?: string;
  patientID?: string;
  phone?: string;
  item: string;
  totalCost: number;
  claimedCost: number;
  site: Site;
  photoIDUri?: string;
  photoMedUri?: string;
  photoMedBatchUri?: string;
  timestamp: number;
  notes?: string;
};

export type ReimbursementTask = {
  site: Site;
  claims: Task[];
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

// At some point, when we're ready, we might want to store a user's allowed
// roles into Firebase Auth's "Custom Claims":
// https://www.youtube.com/watch?v=3hj_r_N0qMs.  For now, we hardcode.
export async function userRoles(): Promise<UserRole[]> {
  return [UserRole.AUDITOR, UserRole.PAYOR];
}

export async function tasksForRole(role: UserRole): Promise<Task[]> {
  switch (role) {
    case UserRole.AUDITOR:
      return loadAuditorTasks();
    case UserRole.PAYOR:
      return [
        {
          site: auditorSampleTasks[0].site,
          claims: approveClaims(auditorSampleTasks.slice(0, 2)),
          notes:
            "Called on 24 Sept, and they asked us to hold payment until later",
          changes: []
        },
        {
          site: auditorSampleTasks[2].site,
          claims: approveClaims(auditorSampleTasks.slice(2)),
          changes: []
        }
      ];
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

  return todos.map(t => {
    const d = t.data;
    return {
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
      totalCost: d["Total med price covered by SPIDER"],
      claimedCost: d["Total reimbursement"],
      timestamp: new Date(d["YYYY"], d["MM"], d["DD"]).getTime(),
      site: {
        name: d["g3:B01 Pharmacy name"],
        phone: "+254 867 5309"
      },
      changes: []
    };
  });
}

const auditorSampleTasks: ClaimTask[] = [
  {
    patientAge: 20,
    patientFirstName: "Zawadi",
    patientLastName: "Mwangi",
    patientSex: "F",
    item: "E-Pill",
    totalCost: 81.72,
    claimedCost: 57.95,
    timestamp: new Date(2019, 9, 14).getTime(),
    site: {
      name: "Haltons Store #34",
      phone: "+254 739 994489"
    }
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
    site: {
      name: "Haltons Store #34",
      phone: "+254 739 994489"
    },
    notes:
      "This looks reasonable, but I'd ask them to make sure to focus the " +
      "ID card photo in the future"
  },
  {
    patientAge: 42,
    patientFirstName: "Jimiyu",
    patientLastName: "Mwangi",
    patientSex: "M",
    item: "Condom",
    totalCost: 119.41,
    claimedCost: 67.4,
    timestamp: new Date(2019, 9, 17).getTime(),
    site: {
      name: "Mimosa #5",
      phone: "+254 739 994400"
    }
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
    site: {
      name: "Mimosa #5",
      phone: "+254 739 994400"
    }
  }
];

const MSEC_IN_DAY = 1000 * 60 * 60 * 24;

// Only for faking data -- essentially mark claims as having been approved.
function approveClaims(tasks: ClaimTask[]): Task[] {
  return tasks.map(t => {
    return {
      ...t,
      flow: TaskDecision.GO,
      changes: [
        {
          timestamp: Date.now() - 3 * MSEC_IN_DAY,
          by: firebase.auth().currentUser!.displayName || "Peekaboo Street",
          desc: "Approved claim"
        }
      ]
    };
  });
}
