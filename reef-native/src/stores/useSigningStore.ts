import {create} from 'zustand';
import {SignatureRequest} from '../types';

interface SigningState {
  requests: SignatureRequest[];

  addRequest: (request: SignatureRequest) => void;
  removeRequest: (id: string) => void;
  resolveRequest: (id: string, result: any) => void;
  rejectRequest: (id: string, error?: string) => void;
}

export const useSigningStore = create<SigningState>((set, get) => ({
  requests: [],

  addRequest: (request: SignatureRequest) =>
    set(state => ({requests: [...state.requests, request]})),

  removeRequest: (id: string) =>
    set(state => ({requests: state.requests.filter(r => r.id !== id)})),

  resolveRequest: (id: string, result: any) => {
    const request = get().requests.find(r => r.id === id);
    if (request) {
      request.resolve(result);
      set(state => ({requests: state.requests.filter(r => r.id !== id)}));
    }
  },

  rejectRequest: (id: string, error?: string) => {
    const request = get().requests.find(r => r.id === id);
    if (request) {
      request.reject(new Error(error ?? 'User rejected'));
      set(state => ({requests: state.requests.filter(r => r.id !== id)}));
    }
  },
}));
