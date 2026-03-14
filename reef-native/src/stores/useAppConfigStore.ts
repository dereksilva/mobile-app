import {create} from 'zustand';
import * as Storage from '../services/StorageService';
import {StorageKey} from '../types';

interface AppConfigState {
  displayBalance: boolean;
  biometricAuth: boolean;
  navigateOnAccountSwitch: boolean;
  developerMode: boolean;

  toggleDisplayBalance: () => void;
  toggleBiometricAuth: () => void;
  setBiometricAuth: (enabled: boolean) => void;
  toggleNavigateOnAccountSwitch: () => void;
  setDeveloperMode: (enabled: boolean) => void;
  loadFromStorage: () => void;
}

export const useAppConfigStore = create<AppConfigState>((set, get) => ({
  displayBalance: true,
  biometricAuth: false,
  navigateOnAccountSwitch: true,
  developerMode: false,

  toggleDisplayBalance: () => {
    const next = !get().displayBalance;
    Storage.setBoolValue(StorageKey.DISPLAY_BALANCE, next);
    set({displayBalance: next});
  },

  toggleBiometricAuth: () => {
    const next = !get().biometricAuth;
    Storage.setBoolValue(StorageKey.BIOMETRIC_AUTH, next);
    set({biometricAuth: next});
  },

  setBiometricAuth: (enabled: boolean) => {
    Storage.setBoolValue(StorageKey.BIOMETRIC_AUTH, enabled);
    set({biometricAuth: enabled});
  },

  toggleNavigateOnAccountSwitch: () => {
    const next = !get().navigateOnAccountSwitch;
    Storage.setBoolValue(StorageKey.NAVIGATE_ON_ACCOUNT_SWITCH, next);
    set({navigateOnAccountSwitch: next});
  },

  setDeveloperMode: (enabled: boolean) => {
    Storage.setBoolValue(StorageKey.DEVELOPER_MODE, enabled);
    set({developerMode: enabled});
  },

  loadFromStorage: () => {
    set({
      displayBalance:
        Storage.getBoolValue(StorageKey.DISPLAY_BALANCE) ?? true,
      biometricAuth: Storage.getBoolValue(StorageKey.BIOMETRIC_AUTH),
      navigateOnAccountSwitch:
        Storage.getBoolValue(StorageKey.NAVIGATE_ON_ACCOUNT_SWITCH) ?? true,
      developerMode: Storage.getBoolValue(StorageKey.DEVELOPER_MODE),
    });
  },
}));
