import { DataStoreConfig, DataStoreType } from "../store/config";

import { DataStore } from "./baseDatastore";
import { FirebaseDataStore } from "./firestore";
import { RestDataStore } from "./maishaDatastore";

export let dataStore: DataStore;

export function initializeStore(config: DataStoreConfig): DataStore {
  switch (config.type) {
    case DataStoreType.FIREBASE:
      const firebaseDataStore = new FirebaseDataStore();
      firebaseDataStore.initializeStore();
      dataStore = firebaseDataStore;
      return dataStore;
    case DataStoreType.REST:
      dataStore = new RestDataStore(config.endpointRoot);
      return dataStore;
  }
}
