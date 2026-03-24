/**
 * WalletConnectService — manages WC v2 (Reown) wallet sessions.
 * Ports WalletConnectService.dart from Flutter.
 *
 * Architecture:
 * - Uses @reown/walletkit for session management
 * - Pushes signing requests to useSigningStore (same flow as internal signing)
 * - Session state lives in useWalletConnectStore (Zustand)
 * - Session deduplication: only most recent session per dApp URL kept
 *
 * Supported methods:
 * - reef_signTransaction: sign extrinsic payloads
 * - reef_signMessage: sign raw messages
 */

import {WalletKit, IWalletKit} from '@reown/walletkit';
import {Core} from '@walletconnect/core';
import type {
  SessionTypes,
  SignClientTypes,
  PendingRequestTypes,
} from '@walletconnect/types';
import {getSdkError} from '@walletconnect/utils';
import {WCSession, Constants} from '../types';
import {useWalletConnectStore} from '../stores/useWalletConnectStore';
import {useAccountStore} from '../stores/useAccountStore';
import {useNetworkStore} from '../stores/useNetworkStore';
import {useSigningStore} from '../stores/useSigningStore';
import {v4 as uuid} from 'uuid';

// --- Constants ---

const PROJECT_ID = 'b20768c469f63321e52923a168155240';

const SIGN_TX_METHOD = 'reef_signTransaction';
const SIGN_MSG_METHOD = 'reef_signMessage';
const SUPPORTED_METHODS = [SIGN_TX_METHOD, SIGN_MSG_METHOD];
const SUPPORTED_EVENTS: string[] = [];

// Chain IDs derived from genesis hashes: "reef:" + hash.substring(2, 34)
export const MAINNET_CHAIN_ID =
  'reef:' + Constants.REEF_MAINNET_GENESIS_HASH.substring(2, 34);
export const TESTNET_CHAIN_ID =
  'reef:' + Constants.REEF_TESTNET_GENESIS_HASH.substring(2, 34);

const METADATA = {
  name: 'Reef Mobile App',
  description: 'Use Reef chain on mobile phone',
  url: 'https://reef.io/',
  icons: ['https://reef.io/favicons/apple-touch-icon.png'],
};

// --- Service ---

let walletKit: IWalletKit | null = null;
const disconnectingTopics = new Set<string>();

/**
 * Initialize the WalletConnect service.
 * Call once on app startup after stores are ready.
 */
export async function initWalletConnect(): Promise<void> {
  try {
    const core = new Core({projectId: PROJECT_ID});

    walletKit = await WalletKit.init({
      core,
      metadata: METADATA,
    });

    // Remove any stale listeners before subscribing (prevents duplicates on re-init)
    walletKit.off('session_proposal', onSessionProposal);
    walletKit.off('session_request', onSessionRequest);
    walletKit.off('session_delete', onSessionDelete);

    // Subscribe to lifecycle events
    walletKit.on('session_proposal', onSessionProposal);
    walletKit.on('session_request', onSessionRequest);
    walletKit.on('session_delete', onSessionDelete);

    // Load existing sessions
    const activeSessions = walletKit.getActiveSessions();
    const sessionList = Object.values(activeSessions);
    const deduped = dedupSessions(sessionList);
    useWalletConnectStore.getState().setSessions(deduped.keep);
    disconnectTopicsLater(deduped.toDisconnect);

    useWalletConnectStore.getState().setInitialized(true);
  } catch (err) {
    console.error('[WC] Init failed:', err);
  }
}

/**
 * Pair with a dApp via WalletConnect URI (from QR scan).
 */
export async function pair(uri: string): Promise<void> {
  if (!walletKit) {
    console.warn('[WC] Not initialized');
    return;
  }
  try {
    await walletKit.pair({uri});
  } catch (err) {
    console.error('[WC] Pair failed:', err);
    throw err;
  }
}

/**
 * Disconnect a session by topic.
 */
export async function disconnectSession(topic: string): Promise<void> {
  if (!walletKit) return;
  try {
    await walletKit.disconnectSession({
      topic,
      reason: getSdkError('USER_DISCONNECTED'),
    });
    useWalletConnectStore.getState().removeSession(topic);
  } catch (err) {
    console.error('[WC] Disconnect failed:', err);
    // Remove from store anyway
    useWalletConnectStore.getState().removeSession(topic);
  }
}

/**
 * Get the current chain ID based on selected network.
 */
export function getCurrentChainId(): string {
  const network = useNetworkStore.getState().selectedNetworkName;
  return network === 'mainnet' ? MAINNET_CHAIN_ID : TESTNET_CHAIN_ID;
}

// --- Event Handlers ---

function onSessionProposal(
  event: SignClientTypes.EventArguments['session_proposal'],
): void {
  if (!walletKit) return;

  const {id, params} = event;
  const proposer = params.proposer.metadata;
  const selectedAddress = useAccountStore.getState().selectedAddress;

  // Must have a selected account
  if (!selectedAddress) {
    walletKit.rejectSession({
      id,
      reason: getSdkError('USER_REJECTED'),
    });
    return;
  }

  // Check if session already exists for this dApp
  const existingSessions = useWalletConnectStore.getState().sessions;
  const sessionExists = existingSessions.some(
    s => s.peerMeta.url === proposer.url,
  );

  // Extract required chains from proposal
  const requiredNamespace = params.requiredNamespaces?.reef;
  const requiredChains = requiredNamespace?.chains ?? [getCurrentChainId()];

  // Push proposal to store for UI approval
  useWalletConnectStore.getState().setPendingProposal({
    id,
    proposerName: proposer.name,
    proposerUrl: proposer.url,
    proposerIcon: proposer.icons?.[0],
    requiredChains,
    sessionExists,
    resolve: (approved: boolean) => {
      if (approved) {
        approveProposal(id, selectedAddress, requiredChains);
      } else {
        rejectProposal(id);
      }
      useWalletConnectStore.getState().setPendingProposal(null);
    },
  });
}

async function approveProposal(
  id: number,
  address: string,
  chains: string[],
): Promise<void> {
  if (!walletKit) return;

  const chainId = getCurrentChainId();

  // Build accounts list: chain:address for each chain
  const accounts = chains.map(chain => `${chain}:${address}`);

  // Ensure selected chain's account is first
  const selectedAccount = `${chainId}:${address}`;
  const selectedIdx = accounts.indexOf(selectedAccount);
  if (selectedIdx > 0) {
    accounts.splice(selectedIdx, 1);
    accounts.unshift(selectedAccount);
  } else if (selectedIdx === -1) {
    accounts.unshift(selectedAccount);
  }

  try {
    const session = await walletKit.approveSession({
      id,
      namespaces: {
        reef: {
          accounts,
          methods: SUPPORTED_METHODS,
          events: SUPPORTED_EVENTS,
          chains,
        },
      },
    });

    // Add to store with dedup
    const wcSession = sessionDataToWCSession(session);
    const currentSessions = useWalletConnectStore.getState().sessions;
    const merged = [...currentSessions, wcSession];
    const deduped = dedupWCSessions(merged);
    useWalletConnectStore.getState().setSessions(deduped.keep);
  } catch (err) {
    console.error('[WC] Approve session failed:', err);
  }
}

async function rejectProposal(id: number): Promise<void> {
  if (!walletKit) return;
  try {
    await walletKit.rejectSession({
      id,
      reason: getSdkError('USER_REJECTED'),
    });
  } catch (err) {
    console.error('[WC] Reject session failed:', err);
  }
}

async function onSessionRequest(
  event: SignClientTypes.EventArguments['session_request'],
): Promise<void> {
  if (!walletKit) return;

  const {id, topic, params} = event;
  const {request, chainId} = params;

  // Validate chain ID
  if (chainId !== MAINNET_CHAIN_ID && chainId !== TESTNET_CHAIN_ID) {
    await walletKit.respondSessionRequest({
      topic,
      response: {
        id,
        jsonrpc: '2.0',
        error: getSdkError('UNSUPPORTED_CHAINS'),
      },
    });
    return;
  }

  const method = request.method;
  const requestParams = request.params as Record<string, unknown>;

  try {
    let signature: string | undefined;

    if (method === SIGN_TX_METHOD) {
      signature = await handleSignTransaction(requestParams);
    } else if (method === SIGN_MSG_METHOD) {
      signature = await handleSignMessage(requestParams);
    } else {
      await walletKit.respondSessionRequest({
        topic,
        response: {
          id,
          jsonrpc: '2.0',
          error: getSdkError('UNSUPPORTED_METHODS'),
        },
      });
      return;
    }

    // Send success response
    await walletKit.respondSessionRequest({
      topic,
      response: {
        id,
        jsonrpc: '2.0',
        result: {signature},
      },
    });
  } catch (err) {
    // User rejected or signing error
    await walletKit.respondSessionRequest({
      topic,
      response: {
        id,
        jsonrpc: '2.0',
        error: {code: 5001, message: 'User rejected'},
      },
    });
  }
}

/**
 * Handle reef_signTransaction — route through signing store.
 */
async function handleSignTransaction(
  params: Record<string, unknown>,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const payload = params.transactionPayload as Record<string, unknown>;
    const requestId = uuid();

    useSigningStore.getState().addRequest({
      id: requestId,
      payload,
      description: `WalletConnect: ${SIGN_TX_METHOD}`,
      resolve: (result: {signature: string}) => {
        resolve(result.signature);
      },
      reject: (error: Error) => {
        reject(error);
      },
    });
  });
}

/**
 * Handle reef_signMessage — route through signing store.
 */
async function handleSignMessage(
  params: Record<string, unknown>,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const message = params.message as string;
    const requestId = uuid();

    // For raw message signing, pack it as a "raw" payload
    useSigningStore.getState().addRequest({
      id: requestId,
      payload: {type: 'raw', data: message, address: params.address as string},
      description: `WalletConnect: ${SIGN_MSG_METHOD}`,
      resolve: (result: {signature: string}) => {
        resolve(result.signature);
      },
      reject: (error: Error) => {
        reject(error);
      },
    });
  });
}

function onSessionDelete(
  event: SignClientTypes.EventArguments['session_delete'],
): void {
  const {topic} = event;
  useWalletConnectStore.getState().removeSession(topic);
}

// --- Session Dedup ---

interface DedupResult<T> {
  keep: T[];
  toDisconnect: string[];
}

function dedupSessions(
  sessions: SessionTypes.Struct[],
): DedupResult<WCSession> {
  const seenUrls = new Set<string>();
  const keep: WCSession[] = [];
  const toDisconnect: string[] = [];

  // Iterate in reverse (most recent first)
  for (let i = sessions.length - 1; i >= 0; i--) {
    const session = sessions[i];
    const url = session.peer?.metadata?.url ?? '';

    if (seenUrls.has(url)) {
      toDisconnect.push(session.topic);
    } else {
      seenUrls.add(url);
      keep.unshift(sessionDataToWCSession(session));
    }
  }

  return {keep, toDisconnect};
}

function dedupWCSessions(sessions: WCSession[]): DedupResult<WCSession> {
  const seenUrls = new Set<string>();
  const keep: WCSession[] = [];
  const toDisconnect: string[] = [];

  for (let i = sessions.length - 1; i >= 0; i--) {
    const session = sessions[i];
    const url = session.peerMeta.url;

    if (seenUrls.has(url)) {
      toDisconnect.push(session.topic);
    } else {
      seenUrls.add(url);
      keep.unshift(session);
    }
  }

  return {keep, toDisconnect};
}

function disconnectTopicsLater(topics: string[]): void {
  for (const topic of topics) {
    if (disconnectingTopics.has(topic)) continue;
    disconnectingTopics.add(topic);

    disconnectSession(topic)
      .catch(err => console.warn('[WC] Dedup disconnect error:', err))
      .finally(() => disconnectingTopics.delete(topic));
  }
}

// --- Helpers ---

function sessionDataToWCSession(session: SessionTypes.Struct): WCSession {
  const meta = session.peer?.metadata;
  const reefNamespace = session.namespaces?.reef;
  const chainId =
    reefNamespace?.chains?.[0] ??
    (reefNamespace?.accounts?.[0]?.split(':').slice(0, 2).join(':') || '');

  return {
    topic: session.topic,
    peerMeta: {
      name: meta?.name ?? 'Unknown',
      description: meta?.description ?? '',
      url: meta?.url ?? '',
      icons: meta?.icons ?? [],
    },
    chainId,
    connected: true,
  };
}
