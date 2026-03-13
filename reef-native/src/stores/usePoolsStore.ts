import {create} from 'zustand';
import {Pool, StatusDataObject, createLoadingStatus} from '../types';

interface PoolsState {
  pools: StatusDataObject<Pool[]>;
  setPools: (pools: StatusDataObject<Pool[]>) => void;
}

export const usePoolsStore = create<PoolsState>(set => ({
  pools: createLoadingStatus(),
  setPools: (pools: StatusDataObject<Pool[]>) => set({pools}),
}));
