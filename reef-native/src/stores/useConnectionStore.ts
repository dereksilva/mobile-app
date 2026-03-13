import {create} from 'zustand';

interface ConnectionState {
  jsConn: boolean;
  providerConn: boolean;
  indexerConn: boolean;

  isFullyConnected: () => boolean;
  setJsConn: (connected: boolean) => void;
  setProviderConn: (connected: boolean) => void;
  setIndexerConn: (connected: boolean) => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  jsConn: false,
  providerConn: false,
  indexerConn: false,

  isFullyConnected: () => {
    const s = get();
    return s.jsConn && s.providerConn && s.indexerConn;
  },

  setJsConn: (connected: boolean) => set({jsConn: connected}),
  setProviderConn: (connected: boolean) => set({providerConn: connected}),
  setIndexerConn: (connected: boolean) => set({indexerConn: connected}),
}));
