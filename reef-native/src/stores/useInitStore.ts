import {create} from 'zustand';
import {InitState} from '../types';

interface InitStoreState {
  initState: InitState;
  error: string | null;

  setInitState: (state: InitState) => void;
  setError: (error: string | null) => void;
}

export const useInitStore = create<InitStoreState>(set => ({
  initState: InitState.NOT_STARTED,
  error: null,

  setInitState: (initState: InitState) => set({initState, error: null}),
  setError: (error: string | null) =>
    set({initState: InitState.ERROR, error}),
}));
