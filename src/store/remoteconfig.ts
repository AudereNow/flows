import firebase from "firebase/app";
import "firebase/firestore";
import {
  DEFAULT_REMOTE_CONFIG,
  METADATA_COLLECTION,
  RemoteConfig,
  REMOTE_CONFIG_DOC
} from "../sharedtypes";

const REFRESH_MSEC = 60 * 60 * 1000; // Refresh settings once an hour

let lastAccessTime: number = 0;
let config: RemoteConfig = DEFAULT_REMOTE_CONFIG;

// This entire thing is only needed because Firebase Remote Config isn't
// supported in Node.js yet, and we don't want to pull the whole web JS SDK
// in just for this feature.
export async function getConfig(key: string) {
  const now = Date.now();
  if (now - lastAccessTime >= REFRESH_MSEC) {
    const snap = await firebase
      .firestore()
      .collection(METADATA_COLLECTION)
      .doc(REMOTE_CONFIG_DOC)
      .get();

    if (snap.exists) {
      lastAccessTime = now;
      config = snap.data() as RemoteConfig;
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

export async function setConfig<K extends keyof RemoteConfig>(
  key: K,
  value: RemoteConfig[K]
) {
  config[key] = value;

  const snap = await firebase
    .firestore()
    .collection(METADATA_COLLECTION)
    .doc(REMOTE_CONFIG_DOC)
    .get();
  const doc = snap.data() as RemoteConfig;
  doc[key] = value;
  await firebase
    .firestore()
    .collection(METADATA_COLLECTION)
    .doc(REMOTE_CONFIG_DOC)
    .set(doc);
}

export function subscribeToConfigs(
  callback: (config: RemoteConfig) => void
): () => void {
  return firebase
    .firestore()
    .collection(METADATA_COLLECTION)
    .doc(REMOTE_CONFIG_DOC)
    .onSnapshot(snapshot => callback(snapshot.data() as RemoteConfig));
}
