import {create} from 'zustand';
import {NetworkName, NETWORKS, Network} from '../types';

interface NetworkState {
  selectedNetworkName: NetworkName;
  isSwitching: boolean;
  isLocked: boolean; // prevents switching during active tx

  getNetwork: () => Network;
  setNetwork: (name: NetworkName) => void;
  setIsSwitching: (switching: boolean) => void;
  setLocked: (locked: boolean) => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  selectedNetworkName: NetworkName.MAINNET,
  isSwitching: false,
  isLocked: false,

  getNetwork: () => NETWORKS[get().selectedNetworkName],

  setNetwork: (name: NetworkName) => {
    if (get().isLocked) return;
    set({selectedNetworkName: name, isSwitching: true});
  },

  setIsSwitching: (switching: boolean) => set({isSwitching: switching}),
  setLocked: (locked: boolean) => set({isLocked: locked}),
}));
