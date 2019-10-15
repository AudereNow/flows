import firebase from "firebase/app";
import "firebase/firestore";

const REFRESH_MSEC = 60 * 60 * 1000; // Refresh settings once an hour

type Config = {
  enableRealPayments: boolean;
};

const DEFAULT_CONFIG: Config = {
  enableRealPayments: false
};

let lastAccessTime: number = 0;
let config: Config = DEFAULT_CONFIG;

// This entire thing is only needed because Firebase Remote Config isn't
// supported in Node.js yet, and we don't want to pull the whole web JS SDK
// in just for this feature.
export async function getConfig(key: string) {
  const now = Date.now();
  if (now - lastAccessTime >= REFRESH_MSEC) {
    const snap = await firebase
      .firestore()
      .collection("metadata")
      .doc("remoteConfig")
      .get();

    if (snap.exists) {
      lastAccessTime = now;
      config = snap.data() as Config;
    } else {
      console.log(
        "Didn't find /metadata/remoteConfig on server. Using defaults."
      );
    }
  }
  if (key in config) {
    // @ts-ignore
    return config[key];
  }
  console.error(`Didn't find key ${key} in remoteConfig!`);
}
