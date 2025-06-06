import { Action, action, Thunk, thunk, Computed, computed } from "easy-peasy";

import { StorageItem, getItemObject, setItemObject } from "../storage/app";
import { Alert } from "react-native";

import logger from "./../utils/log";
const log = logger("Security");

export enum LoginMethods {
  pincode = "pincode",
  fingerprint = "fingerprint",
}

export interface ISecurityModel {
  initialize: Thunk<ISecurityModel>;
  checkPincode: Thunk<ISecurityModel, string>;
  loginPincode: Thunk<ISecurityModel, string>;
  getSeed: Thunk<ISecurityModel, void, any, any, Promise<string[] | null>>;
  deleteSeedFromDevice: Thunk<ISecurityModel>;
  storeSeed: Thunk<ISecurityModel, string[]>;
  setPincode: Thunk<ISecurityModel, string>;
  removePincode: Thunk<ISecurityModel, string>;
  setFingerprintEnabled: Thunk<ISecurityModel, boolean>;
  fingerprintStartScan: Thunk<ISecurityModel>;
  fingerprintStopScan: Thunk<ISecurityModel>;

  setLoggedIn: Action<ISecurityModel, boolean>;
  setLoginMethods: Action<ISecurityModel, Set<LoginMethods>>;
  setSeedAvailable: Action<ISecurityModel, boolean>;
  setSensor: Action<ISecurityModel, any>;

  loggedIn: boolean;
  loginMethods: Set<LoginMethods>;
  seedAvailable: boolean;
  fingerprintAvailable: Computed<ISecurityModel, boolean>;
  fingerprintEnabled: Computed<ISecurityModel, boolean>;
  sensor: any | null;
}

export const security: ISecurityModel = {
  initialize: thunk(async (actions, _, { getState }) => {
    log.d("Initializing");
    const loginMethods: Set<LoginMethods> = new Set(await getItemObject(StorageItem.loginMethods));
    actions.setLoginMethods(loginMethods);
    actions.setLoggedIn(loginMethods.size === 0);
    actions.setSeedAvailable((await getItemObject(StorageItem.seedStored)) || false);
    try {
      // const sensor = await FingerprintScanner.isSensorAvailable();
      // actions.setSensor(sensor);
    } catch (e) {
      log.d("Error checking fingerprint availability", [e]);
    }
    log.d("Done");

    // AppState.addEventListener("change", (state) => {
    //   if (state === "background" && getState().loginMethods.size > 0) {
    //     actions.setLoggedIn(false);
    //   }
    // });
  }),

  checkPincode: thunk(async (actions, pincodeAttempt) => {
    const pincode = ""; //await getPin();
    if (pincode === pincodeAttempt) {
      return true;
    }
    return false;
  }),

  loginPincode: thunk(async (actions, pincodeAttempt) => {
    if (await actions.checkPincode(pincodeAttempt)) {
      actions.setLoggedIn(true);
      return true;
    }
    return false;
  }),

  getSeed: thunk(async (_, _2, { getState }) => {
    if (getState().loggedIn) {
      return []; //await keystoreGetSeed();
    }
    return null;
  }),

  deleteSeedFromDevice: thunk(async (actions) => {
    // await removeSeed();
    await setItemObject(StorageItem.seedStored, false);
    actions.setSeedAvailable(false);
  }),

  storeSeed: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.seedStored, true);
    // await setSeed(payload);
    actions.setSeedAvailable(true);
  }),

  setPincode: thunk(async (actions, payload, { getState }) => {
    const loginMethods = new Set(getState().loginMethods.values());
    loginMethods.add(LoginMethods.pincode);
    // await setPin(payload);
    await setItemObject(StorageItem.loginMethods, Array.from(loginMethods));
    actions.setLoginMethods(loginMethods);
  }),

  removePincode: thunk(async (actions, pincodeAttempt, { getState }) => {
    if (await actions.checkPincode(pincodeAttempt)) {
      const loginMethods = new Set(getState().loginMethods.values());
      loginMethods.delete(LoginMethods.pincode);
      // await removePin();
      await setItemObject(StorageItem.loginMethods, Array.from(loginMethods));
      actions.setLoginMethods(loginMethods);
      return true;
    }
    return false;
  }),

  setFingerprintEnabled: thunk(async (actions, enable, { getState }) => {
    const loginMethods = new Set(getState().loginMethods.values());
    enable
      ? loginMethods.add(LoginMethods.fingerprint)
      : loginMethods.delete(LoginMethods.fingerprint);
    await setItemObject(StorageItem.loginMethods, Array.from(loginMethods));
    actions.setLoginMethods(loginMethods);
  }),

  fingerprintStartScan: thunk(async (actions) => {
    try {
      // const r = await FingerprintScanner.authenticate({ onAttempt: () => {}});
      actions.setLoggedIn(true);
      return true;
    } catch (e: any) {
      if (e.name !== "UserCancel" && e.name !== "UserFallback") {
        log.e("Error while fingerprint scanning", [e]);
        Alert.alert(e.message);
      }
    }
    return false;
  }),

  fingerprintStopScan: thunk(async () => {
    // FingerprintScanner.release();
  }),

  setLoggedIn: action((store, payload) => {
    store.loggedIn = payload;
  }),
  setLoginMethods: action((store, payload) => {
    store.loginMethods = payload;
  }),
  setSeedAvailable: action((store, payload) => {
    store.seedAvailable = payload;
  }),
  setSensor: action((store, payload) => {
    store.sensor = payload;
  }),

  loginMethods: new Set<LoginMethods>([]),
  loggedIn: false,
  seedAvailable: false,
  fingerprintAvailable: computed((store) => store.sensor !== null),
  fingerprintEnabled: computed((store) => store.loginMethods.has(LoginMethods.fingerprint)),
  sensor: null,
};
