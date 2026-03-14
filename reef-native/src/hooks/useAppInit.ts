/**
 * App initialization hook.
 * Orchestrates the startup flow: check first launch, load settings,
 * connect to blockchain, authenticate user.
 */

import {useState, useEffect, useCallback} from 'react';
import {InitState, NetworkName, StorageKey} from '../types';
import {useInitStore} from '../stores/useInitStore';
import {useAppConfigStore} from '../stores/useAppConfigStore';
import {useLocaleStore} from '../stores/useLocaleStore';
import {useNetworkStore} from '../stores/useNetworkStore';
import * as Storage from '../services/StorageService';
import {initReefState} from '../reef-chain/initReefState';

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

      // 5. Initialize reef chain connection
      await initReefState(network);

      // 6. Determine init state
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
