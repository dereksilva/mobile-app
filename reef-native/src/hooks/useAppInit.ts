/**
 * App initialization hook.
 * Orchestrates the startup flow: check first launch, load settings,
 * connect to blockchain, authenticate user.
 */

import {useState, useEffect, useCallback} from 'react';
import {
  InitState,
  NetworkName,
  StorageKey,
  ReefAccount,
  createCompleteStatus,
} from '../types';
import {useInitStore} from '../stores/useInitStore';
import {useAppConfigStore} from '../stores/useAppConfigStore';
import {useLocaleStore} from '../stores/useLocaleStore';
import {useNetworkStore} from '../stores/useNetworkStore';
import {useAccountStore} from '../stores/useAccountStore';
import {useThemeStore} from '../stores/useThemeStore';
import * as Storage from '../services/StorageService';
import {initReefState} from '../reef-chain/initReefState';
import {reefState} from '@reef-chain/util-lib';

export function useAppInit() {
  const {initState, error, setInitState, setError} = useInitStore();
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [hasPassword, setHasPassword] = useState(false);

  const bootstrap = useCallback(async () => {
    try {
      setInitState(InitState.LOADING);

      // 1. Load persisted settings
      useAppConfigStore.getState().loadFromStorage();
      useLocaleStore.getState().loadFromStorage();
      useThemeStore.getState().loadFromStorage();

      // 2. Check first launch
      const firstLaunchValue = Storage.getValue(StorageKey.FIRST_LAUNCH);
      const firstLaunch = firstLaunchValue === undefined || firstLaunchValue === 'true';
      setIsFirstLaunch(firstLaunch);

      // 3. Check if password is set
      const passwordSet = await Storage.hasPasswordSet();
      setHasPassword(passwordSet);

      // 4. Determine stored network
      const storedNetwork = Storage.getValue(StorageKey.NETWORK);
      const network =
        storedNetwork === NetworkName.TESTNET
          ? NetworkName.TESTNET
          : NetworkName.MAINNET;
      useNetworkStore.getState().setNetwork(network);

      // 5. Load accounts from storage into the store BEFORE initializing
      //    reef state, so util-lib knows about them and can fetch balances.
      const storedAccounts = await Storage.getAllAccounts();
      const reefAccounts: ReefAccount[] = storedAccounts.map(a => ({
        ...a,
        balance: '0',
        evmAddress: undefined,
      }));
      useAccountStore.getState().setAccounts(createCompleteStatus(reefAccounts));

      // Restore selected address
      const savedAddress = Storage.getValue(StorageKey.SELECTED_ADDRESS);
      if (savedAddress && storedAccounts.some(a => a.address === savedAddress)) {
        useAccountStore.getState().setSelectedAddress(savedAddress);
      } else if (storedAccounts.length > 0) {
        useAccountStore.getState().setSelectedAddress(storedAccounts[0].address);
      }

      // 6. Initialize reef chain connection (util-lib reads accounts from store)
      await initReefState(network);

      // 7. Tell util-lib which account is selected so it filters data streams
      const selectedAddr = useAccountStore.getState().selectedAddress;
      if (selectedAddr) {
        reefState.setSelectedAddress(selectedAddr);
      }

      // 8. Determine init state
      if (firstLaunch) {
        setInitState(InitState.FIRST_LAUNCH);
      } else if (passwordSet) {
        setInitState(InitState.AUTH_REQUIRED);
      } else {
        setInitState(InitState.READY);
      }
    } catch (err: any) {
      setError(err.message ?? 'Initialization failed');
    }
  }, [setInitState, setError]);

  const retry = useCallback(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return {
    initState,
    error,
    isFirstLaunch,
    hasPassword,
    retry,
    markFirstLaunchDone: () => {
      Storage.setValue(StorageKey.FIRST_LAUNCH, 'false');
      setIsFirstLaunch(false);
    },
    markAuthenticated: () => {
      setInitState(InitState.READY);
    },
  };
}
