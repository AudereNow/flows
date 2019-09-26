import firebase from "firebase/app";
import "firebase/auth";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCspibVcd3GcAk01xHndZEJX8zuxwPIt-Y",
  authDomain: "flows-app-staging.firebaseapp.com",
  databaseURL: "https://flows-app-staging.firebaseio.com",
  projectId: "flows-app-staging",
  storageBucket: "",
  messagingSenderId: "785605389839",
  appId: "1:785605389839:web:dedec19abb81b7df8a3d7a"
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
  patientFirstName: string;
  patientLastName: string;
  item: string;
  totalCost: number;
  claimedCost: number;
  site: Site;
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
      return auditorSampleTasks.map(c => {
        return { ...c, changes: [] };
      });
    case UserRole.PAYOR:
      return [
        {
          site: auditorSampleTasks[0].site,
          claims: approveClaims(auditorSampleTasks.slice(0, 2)),
          notes:
            "Called on 24 Sept, and they asked us to hold payment until later",
          changes: []
        }
      ];
  }
}

const auditorSampleTasks: ClaimTask[] = [
  {
    patientFirstName: "Zawadi",
    patientLastName: "Mwangi",
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
    patientFirstName: "Makena",
    patientLastName: "Maina",
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
    patientFirstName: "Jimiyu",
    patientLastName: "Mwangi",
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
    patientFirstName: "Okeyo",
    patientLastName: "Otieno",
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
