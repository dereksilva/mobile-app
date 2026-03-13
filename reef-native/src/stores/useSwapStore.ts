import {create} from 'zustand';
import {TokenBalance} from '../types';

interface SwapState {
  deadline: number; // minutes
  slippageTolerance: number; // percentage (e.g. 0.5 = 0.5%)
  tokenFrom: TokenBalance | null;
  tokenTo: TokenBalance | null;

  setDeadline: (deadline: number) => void;
  setSlippageTolerance: (tolerance: number) => void;
  setTokenFrom: (token: TokenBalance | null) => void;
  setTokenTo: (token: TokenBalance | null) => void;
  swapDirection: () => void;
}

export const useSwapStore = create<SwapState>((set, get) => ({
  deadline: 1,
  slippageTolerance: 0.5,
  tokenFrom: null,
  tokenTo: null,

  setDeadline: (deadline: number) => set({deadline}),
  setSlippageTolerance: (tolerance: number) =>
    set({slippageTolerance: tolerance}),
  setTokenFrom: (token: TokenBalance | null) => set({tokenFrom: token}),
  setTokenTo: (token: TokenBalance | null) => set({tokenTo: token}),
  swapDirection: () => {
    const {tokenFrom, tokenTo} = get();
    set({tokenFrom: tokenTo, tokenTo: tokenFrom});
  },
}));
