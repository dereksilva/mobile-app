/**
 * Account management hook.
 * Bridges between reef-chain accountApi, StorageService, and Zustand store.
 */

import {useCallback} from 'react';
import {useAccountStore} from '../stores/useAccountStore';
import {useNetworkStore} from '../stores/useNetworkStore';
import * as Storage from '../services/StorageService';
import * as AccountApi from '../reef-chain/accountApi';
import {syncAccountsToUtilLib} from '../reef-chain/initReefState';
import {reefState} from '@reef-chain/util-lib';
import {
  StoredAccount,
  ReefAccount,
  StorageKey,
  createCompleteStatus,
  createErrorStatus,
} from '../types';

export function useAccounts() {
  const {selectedAddress, accounts, setSelectedAddress, setAccounts} =
    useAccountStore();
  const selectedNetworkName = useNetworkStore(s => s.selectedNetworkName);

  /**
   * Load all stored accounts from keychain into the store.
   */
  const loadAccounts = useCallback(async () => {
    try {
      const stored = await Storage.getAllAccounts();

      // Preserve existing balances from the store so non-selected accounts
      // don't get reset to '0' every time this is called.
      const existingAccounts = useAccountStore.getState().accounts.data ?? [];
      const balanceMap = new Map(
        existingAccounts.map(a => [a.address, {balance: a.balance, evmAddress: a.evmAddress, isEvmClaimed: a.isEvmClaimed}]),
      );

      const reefAccounts: ReefAccount[] = stored.map(a => {
        const existing = balanceMap.get(a.address);
        return {
          ...a,
          balance: existing?.balance ?? '0',
          evmAddress: existing?.evmAddress,
          isEvmClaimed: existing?.isEvmClaimed ?? a.isEvmClaimed,
        };
      });
      setAccounts(createCompleteStatus(reefAccounts));

      // Restore selected address
      const savedAddress = Storage.getValue(StorageKey.SELECTED_ADDRESS);
      if (savedAddress && stored.some(a => a.address === savedAddress)) {
        setSelectedAddress(savedAddress);
      } else if (stored.length > 0) {
        setSelectedAddress(stored[0].address);
        Storage.setValue(StorageKey.SELECTED_ADDRESS, stored[0].address);
      }

      // Sync accounts to util-lib so it can fetch balances/tokens
      syncAccountsToUtilLib();
    } catch (err: any) {
      setAccounts(createErrorStatus(err.message));
    }
  }, [setAccounts, setSelectedAddress]);

  /**
   * Generate a new account with a fresh mnemonic.
   */
  const generateNewAccount = useCallback(async () => {
    const generated = await AccountApi.generateAccount();
    return generated;
  }, []);

  /**
   * Import an account from an existing mnemonic.
   */
  const importFromMnemonic = useCallback(
    async (mnemonic: string, name: string, password: string) => {
      const result = await AccountApi.accountFromMnemonic(mnemonic);
      if (!result) {
        throw new Error('Invalid mnemonic');
      }

      // Check duplicate
      const existing = await Storage.getAccount(result.address);
      if (existing) {
        throw new Error('Account already added');
      }

      const storedAccount: StoredAccount = {
        address: result.address,
        name,
        svg: '',
        isEvmClaimed: false,
        mnemonic, // Will be stored encrypted in keychain
      };

      await Storage.saveAccount(storedAccount);

      const reefAccount: ReefAccount = {
        ...storedAccount,
        balance: '0',
      };

      useAccountStore.getState().addAccount(reefAccount);
      syncAccountsToUtilLib();
      return reefAccount;
    },
    [],
  );

  /**
   * Create a brand new account (generate mnemonic + save).
   */
  const createAccount = useCallback(
    async (name: string, password: string) => {
      const generated = await AccountApi.generateAccount();

      const storedAccount: StoredAccount = {
        address: generated.address,
        name,
        svg: '',
        isEvmClaimed: false,
        mnemonic: generated.mnemonic,
      };

      await Storage.saveAccount(storedAccount);

      const reefAccount: ReefAccount = {
        ...storedAccount,
        balance: '0',
      };

      useAccountStore.getState().addAccount(reefAccount);
      syncAccountsToUtilLib();
      return {account: reefAccount, mnemonic: generated.mnemonic};
    },
    [],
  );

  /**
   * Import from encrypted JSON backup.
   */
  const importFromJson = useCallback(
    async (json: any, password: string, name: string) => {
      const result = await AccountApi.restoreFromJson(json, password);
      if (!result) {
        throw new Error('Invalid password or corrupt JSON');
      }

      const existing = await Storage.getAccount(result.address);
      if (existing) {
        throw new Error('Account already added');
      }

      const storedAccount: StoredAccount = {
        address: result.address,
        name: name || result.name,
        svg: '',
        isEvmClaimed: false,
        json: JSON.stringify(json),
      };

      await Storage.saveAccount(storedAccount);

      const reefAccount: ReefAccount = {
        ...storedAccount,
        balance: '0',
      };

      useAccountStore.getState().addAccount(reefAccount);
      syncAccountsToUtilLib();
      return reefAccount;
    },
    [],
  );

  /**
   * Delete an account.
   */
  const deleteAccount = useCallback(
    async (address: string) => {
      await Storage.deleteAccount(address);
      useAccountStore.getState().removeAccount(address);

      // If deleting selected account, switch to another
      if (selectedAddress === address) {
        const remaining = useAccountStore.getState().accounts.data ?? [];
        if (remaining.length > 0) {
          setSelectedAddress(remaining[0].address);
          Storage.setValue(StorageKey.SELECTED_ADDRESS, remaining[0].address);
        } else {
          setSelectedAddress('');
          Storage.deleteValue(StorageKey.SELECTED_ADDRESS);
        }
      }

      syncAccountsToUtilLib();
    },
    [selectedAddress, setSelectedAddress],
  );

  /**
   * Select a different account.
   */
  const selectAccount = useCallback(
    (address: string) => {
      setSelectedAddress(address);
      Storage.setValue(StorageKey.SELECTED_ADDRESS, address);
      // Notify util-lib so it switches its observable streams to the new account
      reefState.setSelectedAddress(address);
    },
    [setSelectedAddress],
  );

  /**
   * Rename an account.
   */
  const renameAccount = useCallback(async (address: string, newName: string) => {
    const stored = await Storage.getAccount(address);
    if (stored) {
      stored.name = newName;
      await Storage.saveAccount(stored);
      useAccountStore.getState().updateAccount(address, {name: newName});
    }
  }, []);

  /**
   * Export account as encrypted JSON.
   */
  const exportAccount = useCallback(
    (address: string, password: string) => {
      return AccountApi.exportAccountJson(address, password);
    },
    [],
  );

  /**
   * Claim EVM address for an account.
   */
  const claimEvm = useCallback(async (address: string) => {
    const success = await AccountApi.claimEvmAccount(address);
    if (success) {
      const evmAddress = await AccountApi.resolveEvmAddress(address);
      if (evmAddress) {
        useAccountStore.getState().updateAccount(address, {
          isEvmClaimed: true,
          evmAddress,
        });
        const stored = await Storage.getAccount(address);
        if (stored) {
          stored.isEvmClaimed = true;
          await Storage.saveAccount(stored);
        }
      }
    }
    return success;
  }, []);

  const getSelectedAccount = useCallback((): ReefAccount | null => {
    const accts = accounts.data ?? [];
    return accts.find(a => a.address === selectedAddress) ?? null;
  }, [accounts.data, selectedAddress]);

  return {
    accounts: accounts.data ?? [],
    selectedAddress,
    selectedAccount: getSelectedAccount(),
    loadAccounts,
    generateNewAccount,
    importFromMnemonic,
    createAccount,
    importFromJson,
    deleteAccount,
    selectAccount,
    renameAccount,
    exportAccount,
    claimEvm,
  };
}
