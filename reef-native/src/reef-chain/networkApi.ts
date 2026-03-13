/**
 * Network/Provider connection service.
 *
 * Replaces the WebView-based WsProvider with a DIRECT Polkadot.js
 * connection running natively in Hermes. No WebView intermediary.
 *
 * This is what eliminates the fragile Dart↔WebView↔JS↔WebSocket bridge.
 */

import {ApiPromise, WsProvider} from '@polkadot/api';
import {Provider} from '@reef-chain/evm-provider';
import {BehaviorSubject, Observable} from 'rxjs';
import {NetworkName} from '../types';
import {NETWORK_CONFIG, AUTO_CONNECT_MS} from './config';
import type {NetworkConfig} from './config';
import {useConnectionStore} from '../stores/useConnectionStore';

let currentProvider: Provider | null = null;
let currentWsProvider: WsProvider | null = null;
let currentApi: ApiPromise | null = null;
let currentNetwork: NetworkName = NetworkName.MAINNET;

const providerConnSubject = new BehaviorSubject<boolean>(false);
const indexerConnSubject = new BehaviorSubject<boolean>(false);

/** Observable streams for connection state */
export const providerConn$: Observable<boolean> =
  providerConnSubject.asObservable();
export const indexerConn$: Observable<boolean> =
  indexerConnSubject.asObservable();

/**
 * Initialize the blockchain provider — direct WebSocket, no WebView.
 */
export async function initProvider(
  networkName: NetworkName,
): Promise<Provider> {
  const config = NETWORK_CONFIG[networkName];
  currentNetwork = networkName;

  // Disconnect existing if switching networks
  if (currentProvider) {
    await disconnectProvider();
  }

  // Direct WsProvider — runs natively in Hermes runtime
  currentWsProvider = new WsProvider(config.rpcUrl, AUTO_CONNECT_MS);

  // Listen for connection state changes
  currentWsProvider.on('connected', () => {
    providerConnSubject.next(true);
    useConnectionStore.getState().setProviderConn(true);
  });

  currentWsProvider.on('disconnected', () => {
    providerConnSubject.next(false);
    useConnectionStore.getState().setProviderConn(false);
  });

  currentWsProvider.on('error', () => {
    providerConnSubject.next(false);
    useConnectionStore.getState().setProviderConn(false);
  });

  // Create Reef EVM Provider
  currentProvider = new Provider({provider: currentWsProvider});

  // Wait for the API to be ready (with timeout)
  currentApi = currentProvider.api;

  await Promise.race([
    currentApi.isReadyOrError,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Provider connection timed out (30s)')),
        30000,
      ),
    ),
  ]);

  providerConnSubject.next(true);
  useConnectionStore.getState().setProviderConn(true);
  useConnectionStore.getState().setJsConn(true); // No JS bridge needed — we ARE the JS runtime

  return currentProvider;
}

/**
 * Disconnect the current provider.
 */
export async function disconnectProvider(): Promise<void> {
  if (currentWsProvider) {
    await currentWsProvider.disconnect();
    currentWsProvider = null;
  }
  currentProvider = null;
  currentApi = null;
  providerConnSubject.next(false);
  useConnectionStore.getState().setProviderConn(false);
}

/**
 * Reconnect to the current network. Exponential backoff handled by WsProvider.
 */
export async function reconnectProvider(): Promise<void> {
  if (currentWsProvider) {
    await currentWsProvider.connect();
  } else {
    await initProvider(currentNetwork);
  }
}

/**
 * Switch to a different network.
 */
export async function switchNetwork(
  networkName: NetworkName,
): Promise<Provider> {
  return initProvider(networkName);
}

/** Get the current Provider instance */
export function getProvider(): Provider | null {
  return currentProvider;
}

/** Get the current ApiPromise instance */
export function getApi(): ApiPromise | null {
  return currentApi;
}

/** Get the current network config */
export function getNetworkConfig(): NetworkConfig {
  return NETWORK_CONFIG[currentNetwork];
}

/** Get the current network name */
export function getCurrentNetwork(): NetworkName {
  return currentNetwork;
}

/**
 * Set indexer connection state.
 * Called by the indexer subscription when events connect/disconnect.
 */
export function setIndexerConnected(connected: boolean): void {
  indexerConnSubject.next(connected);
  useConnectionStore.getState().setIndexerConn(connected);
}
