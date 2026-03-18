/**
 * Reef state initialization — replaces initFlutterApi.ts.
 *
 * This is the main entry point for the reef-chain module.
 * Instead of setting up a Flutter↔WebView bridge, it directly
 * initializes the Polkadot.js API in the Hermes runtime and
 * bootstraps @reef-chain/util-lib's observable data streams.
 */

import {NetworkName} from '../types';
import {useConnectionStore} from '../stores/useConnectionStore';
import {useInitStore} from '../stores/useInitStore';
import {useAccountStore} from '../stores/useAccountStore';
import {InitState} from '../types';
import {initKeyring} from './accountApi';
import {initProvider} from './networkApi';
import {reefSigner} from './signer';
import {reefState, network} from '@reef-chain/util-lib';
import type {InjectedAccountWithMeta} from '@polkadot/extension-inject/types';

const {AVAILABLE_NETWORKS} = network;

/** Map our NetworkName enum to util-lib's AVAILABLE_NETWORKS key */
function getUtilLibNetwork(
  networkName: NetworkName,
): (typeof AVAILABLE_NETWORKS)[keyof typeof AVAILABLE_NETWORKS] {
  return networkName === NetworkName.TESTNET
    ? AVAILABLE_NETWORKS.testnet
    : AVAILABLE_NETWORKS.mainnet;
}

/** IPFS hash resolver — same as the old Flutter JS bundle */
const resolveIpfsHash = (hash: string): string =>
  `https://reef.infura-ipfs.io/ipfs/${hash}`;

/** Cleanup function returned by reefState.initReefState */
let destroyReefState: (() => void) | null = null;

/**
 * Initialize the Reef blockchain state.
 * Called once on app startup after auth.
 *
 * This replaces the complex chain:
 *   Flutter → ReefChainApi() → WebView → loadHtmlString → JS bundle →
 *   initFlutterApi → initReefState → WsProvider
 *
 * With simply:
 *   React Native → initReefState → WsProvider (direct)
 *   + @reef-chain/util-lib observable streams for live data
 */
export async function initReefState(
  networkName: NetworkName,
): Promise<void> {
  const initStore = useInitStore.getState();

  try {
    initStore.setInitState(InitState.LOADING);

    // Mark JS as connected — we ARE the JS runtime, no bridge needed
    useConnectionStore.getState().setJsConn(true);

    // 1. Initialize WASM crypto for keyring operations
    await initKeyring();

    // 2. Connect to the blockchain (direct WebSocket, no WebView)
    await initProvider(networkName);

    // 3. Initialize @reef-chain/util-lib's reef state.
    //    This bootstraps all the RxJS observable streams for token data,
    //    NFTs, prices, tx history, etc. — the same streams the old
    //    Flutter WebView JS bundle subscribed to.
    await initUtilLibReefState(networkName);

    initStore.setInitState(InitState.READY);
  } catch (error: any) {
    initStore.setError(error.message ?? 'Failed to initialize Reef state');
    throw error;
  }
}

/**
 * Initialize @reef-chain/util-lib observable state.
 * Passes accounts + signer so the library can set up data subscriptions.
 */
async function initUtilLibReefState(
  networkName: NetworkName,
): Promise<void> {
  // Clean up previous state if switching networks
  if (destroyReefState) {
    destroyReefState();
    destroyReefState = null;
  }

  // Build InjectedAccountWithMeta[] from our stored accounts
  const storedAccounts = useAccountStore.getState().accounts.data ?? [];
  const accounts: InjectedAccountWithMeta[] = storedAccounts.map(a => ({
    address: a.address,
    meta: {
      name: a.name,
      source: 'reef-native',
    },
  }));

  // Initialize util-lib — this sets up all observable streams
  destroyReefState = reefState.initReefState({
    network: getUtilLibNetwork(networkName),
    jsonAccounts: {
      accounts,
      injectedSigner: reefSigner,
    },
    ipfsHashResolverFn: resolveIpfsHash,
    rpcConfig: {autoConnectMs: 5000},
    // Reefscan indexer events — required for pool data, live updates, etc.
    // Same config the old Flutter JS bundle used.
    reefscanEventsConfig: {
      host: 'events.reefscan.info',
      port: 443,
      secure: true,
    },
  }) as unknown as (() => void) | null;
}

/**
 * Reinitialize with a different network (for network switching).
 */
export async function reinitReefState(
  networkName: NetworkName,
): Promise<void> {
  await initReefState(networkName);
}

/**
 * Update util-lib with current accounts (call after adding/removing accounts).
 */
export function syncAccountsToUtilLib(): void {
  const storedAccounts = useAccountStore.getState().accounts.data ?? [];
  const accounts: InjectedAccountWithMeta[] = storedAccounts.map(a => ({
    address: a.address,
    meta: {
      name: a.name,
      source: 'reef-native',
    },
  }));
  reefState.setAccounts(accounts);
}
