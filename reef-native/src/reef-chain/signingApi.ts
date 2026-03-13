/**
 * Signing API — sign payloads and raw messages.
 * Ports signApi.ts from reef-mobile-js.
 *
 * Two modes:
 * 1. UI-based: Uses ReefSigner → pushes to signing store → user approves
 * 2. Direct: Uses mnemonic directly (for internal operations)
 */

import {Keyring} from '@polkadot/keyring';
import {u8aToHex, hexToU8a} from '@polkadot/util';
import {cryptoWaitReady} from '@polkadot/util-crypto';
import type {SignerPayloadJSON, SignerPayloadRaw} from '@polkadot/types/types';
import {SS58_FORMAT, KEYPAIR_TYPE} from './config';
import {getApi} from './networkApi';

/**
 * Sign an extrinsic payload using a mnemonic.
 * Returns the signature hex string.
 */
export async function signPayload(
  mnemonic: string,
  payload: SignerPayloadJSON,
): Promise<string> {
  await cryptoWaitReady();
  const keyring = new Keyring({type: KEYPAIR_TYPE, ss58Format: SS58_FORMAT});
  const pair = keyring.addFromMnemonic(mnemonic);

  const api = getApi();
  if (!api) throw new Error('API not connected');

  const registry = api.registry;
  registry.setSignedExtensions(payload.signedExtensions);

  const extrinsicPayload = registry.createType(
    'ExtrinsicPayload',
    payload,
    {version: payload.version},
  );

  const {signature} = extrinsicPayload.sign(pair);
  return signature;
}

/**
 * Sign a raw message using a mnemonic.
 * Returns the signature hex string.
 */
export async function signRaw(
  mnemonic: string,
  message: string,
): Promise<string> {
  await cryptoWaitReady();
  const keyring = new Keyring({type: KEYPAIR_TYPE, ss58Format: SS58_FORMAT});
  const pair = keyring.addFromMnemonic(mnemonic);

  const messageBytes = message.startsWith('0x')
    ? hexToU8a(message)
    : new TextEncoder().encode(message);

  const signature = pair.sign(messageBytes);
  return u8aToHex(signature);
}
