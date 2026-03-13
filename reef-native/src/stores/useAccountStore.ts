import {create} from 'zustand';
import {
  ReefAccount,
  StatusDataObject,
  createLoadingStatus,
  StoredAccount,
} from '../types';

interface AccountState {
  selectedAddress: string | null;
  accounts: StatusDataObject<ReefAccount[]>;

  setSelectedAddress: (address: string) => void;
  setAccounts: (accounts: StatusDataObject<ReefAccount[]>) => void;
  addAccount: (account: ReefAccount) => void;
  removeAccount: (address: string) => void;
  updateAccount: (address: string, updates: Partial<ReefAccount>) => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  selectedAddress: null,
  accounts: createLoadingStatus(),

  setSelectedAddress: (address: string) => set({selectedAddress: address}),

  setAccounts: (accounts: StatusDataObject<ReefAccount[]>) => set({accounts}),

  addAccount: (account: ReefAccount) =>
    set(state => {
      const current = state.accounts.data ?? [];
      return {
        accounts: {
          ...state.accounts,
          data: [...current, account],
        },
      };
    }),

  removeAccount: (address: string) =>
    set(state => {
      const current = state.accounts.data ?? [];
      return {
        accounts: {
          ...state.accounts,
          data: current.filter(a => a.address !== address),
        },
      };
    }),

  updateAccount: (address: string, updates: Partial<ReefAccount>) =>
    set(state => {
      const current = state.accounts.data ?? [];
      return {
        accounts: {
          ...state.accounts,
          data: current.map(a =>
            a.address === address ? {...a, ...updates} : a,
          ),
        },
      };
    }),
}));
