/**
 * Reef state initialization — replaces initFlutterApi.ts.
 *
 * This is the main entry point for the reef-chain module.
 * Instead of setting up a Flutter↔WebView bridge, it directly
 * initializes the Polkadot.js API in the Hermes runtime.
 */

import {NetworkName} from '../types';
import {useConnectionStore} from '../stores/useConnectionStore';
import {useInitStore} from '../stores/useInitStore';
import {InitState} from '../types';
import {initKeyring} from './accountApi';
import {initProvider} from './networkApi';

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

    initStore.setInitState(InitState.READY);
  } catch (error: any) {
    initStore.setError(error.message ?? 'Failed to initialize Reef state');
    throw error;
  }
}

/**
 * Reinitialize with a different network (for network switching).
 */
export async function reinitReefState(
  networkName: NetworkName,
): Promise<void> {
  await initReefState(networkName);
}
