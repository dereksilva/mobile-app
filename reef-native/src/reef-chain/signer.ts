/**
 * Promise-based Signer for React Native.
 *
 * Replaces the Flutter bridge Signer. When a transaction needs signing,
 * it pushes a SignatureRequest to the Zustand signing store. The
 * <SigningOverlay> component renders the approval modal. User approve →
 * resolves the Promise; user reject → rejects the Promise.
 *
 * This is THE key architectural change from the Flutter app.
 */

import type {
  SignerPayloadJSON,
  SignerPayloadRaw,
  SignerResult,
} from '@polkadot/types/types';
import type {Signer as InjectedSigner} from '@polkadot/api/types';
import {v4 as uuid} from 'uuid';
import {useSigningStore} from '../stores/useSigningStore';

let nextId = 1;

export class ReefSigner implements InjectedSigner {
  /**
   * Sign an extrinsic payload.
   * Creates a Promise that is resolved/rejected by the signing UI.
   */
  async signPayload(payload: SignerPayloadJSON): Promise<SignerResult> {
    const id = nextId++;

    return new Promise<SignerResult>((resolve, reject) => {
      const requestId = uuid();

      useSigningStore.getState().addRequest({
        id: requestId,
        payload: {
          type: 'extrinsic',
          data: payload,
        },
        description: `Sign extrinsic for ${payload.address.slice(0, 8)}...`,
        resolve: (signature: string) => {
          resolve({id, signature: signature as `0x${string}`});
        },
        reject: (error: Error) => {
          reject(error);
        },
      });
    });
  }

  /**
   * Sign a raw message (bytes).
   * Same Promise pattern as signPayload.
   */
  async signRaw(payload: SignerPayloadRaw): Promise<SignerResult> {
    const id = nextId++;

    return new Promise<SignerResult>((resolve, reject) => {
      const requestId = uuid();

      useSigningStore.getState().addRequest({
        id: requestId,
        payload: {
          type: 'bytes',
          data: payload,
        },
        description: `Sign message for ${payload.address.slice(0, 8)}...`,
        resolve: (signature: string) => {
          resolve({id, signature: signature as `0x${string}`});
        },
        reject: (error: Error) => {
          reject(error);
        },
      });
    });
  }
}

/** Singleton signer instance */
export const reefSigner = new ReefSigner();
