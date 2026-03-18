/**
 * @format
 */

// Polyfill TextDecoder/TextEncoder for Hermes runtime.
// Must load before any module that uses them (e.g. @reef-chain/util-lib).
import 'text-encoding';

// Polyfill global crypto.getRandomValues for Hermes runtime.
// Libraries like @polkadot/util-crypto check the global `crypto` object.
import QuickCrypto from 'react-native-quick-crypto';
if (typeof global.crypto === 'undefined') {
  global.crypto = QuickCrypto;
} else if (typeof global.crypto.getRandomValues === 'undefined') {
  global.crypto.getRandomValues = QuickCrypto.getRandomValues;
}

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
