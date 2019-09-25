import firebase from "firebase/app";

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

export function initializeStore() {
  firebase.initializeApp(FIREBASE_CONFIG);
}

// At some point, when we're ready, we might want to store a user's allowed
// roles into Firebase Auth's "Custom Claims":
// https://www.youtube.com/watch?v=3hj_r_N0qMs.  For now, we hardcode.
export async function userRoles(): Promise<UserRole[]> {
  return [UserRole.AUDITOR, UserRole.PAYOR];
}
