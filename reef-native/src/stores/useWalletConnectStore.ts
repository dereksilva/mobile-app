/**
 * WalletConnect Zustand store — manages WC session state.
 *
 * Tracks:
 * - Active sessions list
 * - Pending session proposals (for approval UI)
 * - Service initialization status
 */

import {create} from 'zustand';
import {WCSession} from '../types';

export interface WCSessionProposal {
  id: number;
  proposerName: string;
  proposerUrl: string;
  proposerIcon?: string;
  requiredChains: string[];
  sessionExists: boolean;
  resolve: (approved: boolean) => void;
}

interface WalletConnectState {
  sessions: WCSession[];
  pendingProposal: WCSessionProposal | null;
  isInitialized: boolean;

  setSessions: (sessions: WCSession[]) => void;
  addSession: (session: WCSession) => void;
  removeSession: (topic: string) => void;
  setPendingProposal: (proposal: WCSessionProposal | null) => void;
  setInitialized: (initialized: boolean) => void;
}

export const useWalletConnectStore = create<WalletConnectState>(set => ({
  sessions: [],
  pendingProposal: null,
  isInitialized: false,

  setSessions: (sessions: WCSession[]) => set({sessions}),

  addSession: (session: WCSession) =>
    set(state => ({sessions: [...state.sessions, session]})),

  removeSession: (topic: string) =>
    set(state => ({
      sessions: state.sessions.filter(s => s.topic !== topic),
    })),

  setPendingProposal: (proposal: WCSessionProposal | null) =>
    set({pendingProposal: proposal}),

  setInitialized: (initialized: boolean) => set({isInitialized: initialized}),
}));
