import { DataStoreConfig, DataStoreType } from "../store/config";

import { DataStore } from "./baseDatastore";
import { FirebaseDataStore } from "./firestore";
import { RestDataStore } from "./maishaDatastore";

export let dataStore: DataStore;

export async function initializeStore(
  config: DataStoreConfig
): Promise<DataStore> {
  switch (config.type) {
    case DataStoreType.FIREBASE:
      const firebaseDataStore = new FirebaseDataStore();
      await firebaseDataStore.initializeStore();
      dataStore = firebaseDataStore;
      return dataStore;
    case DataStoreType.REST:
      dataStore = new RestDataStore(config.endpointRoot);
      return dataStore;
  }
}
