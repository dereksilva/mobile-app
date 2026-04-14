/**
 * Transfer API — send tokens and NFTs.
 * Ports transferApi.ts from reef-mobile-js.
 */

import {Observable, Subject} from 'rxjs';
import {Contract} from 'ethers';
import {Signer as ReefEvmSigner} from '@reef-chain/evm-provider';
import {getApi, getProvider} from './networkApi';
import {reefSigner} from './signer';
import {REEF_TOKEN_ADDRESS, STORAGE_LIMIT} from './config';
import {ERC20_ABI, ERC1155_ABI} from './abi';
import type {TxStatusUpdate} from './types';

/**
 * Send tokens (REEF native or ERC20).
 * Returns an Observable that emits transaction status updates.
 */
export function sendToken(
  fromAddress: string,
  toAddress: string,
  amount: string,
  decimals: number,
  tokenAddress: string,
): Observable<TxStatusUpdate> {
  const subject = new Subject<TxStatusUpdate>();

  (async () => {
    try {
      if (
        tokenAddress.toLowerCase() === REEF_TOKEN_ADDRESS.toLowerCase()
      ) {
        // Native REEF transfer via Substrate
        await sendNativeReef(fromAddress, toAddress, amount, subject);
      } else {
        // ERC20 transfer via EVM
        await sendErc20(
          fromAddress,
          toAddress,
          amount,
          decimals,
          tokenAddress,
          subject,
        );
      }
    } catch (error: any) {
      subject.next({status: 'error', error: error.message});
      subject.complete();
    }
  })();

  return subject.asObservable();
}

/**
 * Send native REEF tokens via balances.transfer extrinsic.
 */
async function sendNativeReef(
  fromAddress: string,
  toAddress: string,
  amount: string,
  subject: Subject<TxStatusUpdate>,
): Promise<void> {
  const api = getApi();
  if (!api) throw new Error('API not connected');

  subject.next({status: 'signing'});

  const transfer = api.tx.balances.transfer(toAddress, amount);

  await transfer.signAndSend(
    fromAddress,
    {signer: reefSigner},
    ({status, txHash, dispatchError}) => {
      if (status.isBroadcast) {
        subject.next({
          status: 'broadcast',
          txHash: txHash.toHex(),
        });
      } else if (status.isInBlock) {
        subject.next({
          status: 'included-in-block',
          blockHash: status.asInBlock.toHex(),
          txHash: txHash.toHex(),
        });
      } else if (status.isFinalized) {
        if (dispatchError) {
          subject.next({
            status: 'error',
            error: dispatchError.toString(),
          });
        } else {
          subject.next({
            status: 'finalized',
            blockHash: status.asFinalized.toHex(),
            txHash: txHash.toHex(),
          });
        }
        subject.complete();
      }
    },
  );
}

/**
 * Send ERC20 tokens via EVM contract call.
 */
async function sendErc20(
  fromAddress: string,
  toAddress: string,
  amount: string,
  _decimals: number,
  tokenAddress: string,
  subject: Subject<TxStatusUpdate>,
): Promise<void> {
  const provider = getProvider();
  if (!provider) throw new Error('Provider not connected');

  subject.next({status: 'signing'});

  // Reef EVM signer wraps provider + substrate address + our promise-based
  // reefSigner (which routes approval through SigningOverlay).
  const evmSigner = new ReefEvmSigner(
    provider as any,
    fromAddress,
    reefSigner,
  );
  const contract = new Contract(tokenAddress, ERC20_ABI, evmSigner as any);

  subject.next({status: 'sending'});

  const tx = await contract.transfer(toAddress, amount, {
    customData: {
      storageLimit: STORAGE_LIMIT,
    },
  });

  subject.next({
    status: 'broadcast',
    txHash: tx.hash,
  });

  const receipt = await tx.wait();

  subject.next({
    status: 'finalized',
    txHash: tx.hash,
    blockHash: receipt.blockHash,
  });

  subject.complete();
}

/**
 * Send NFT (ERC1155) token.
 */
export function sendNft(
  fromEvmAddress: string,
  fromAddress: string,
  toAddress: string,
  amount: string,
  nftId: string,
  nftContractAddress: string,
): Observable<TxStatusUpdate> {
  const subject = new Subject<TxStatusUpdate>();

  (async () => {
    try {
      const provider = getProvider();
      if (!provider) throw new Error('Provider not connected');

      subject.next({status: 'signing'});

      // Reef EVM signer wraps provider + substrate address + our
      // promise-based reefSigner for contract write ops.
      const evmSigner = new ReefEvmSigner(
        provider as any,
        fromAddress,
        reefSigner,
      );

      const contract = new Contract(
        nftContractAddress,
        ERC1155_ABI,
        evmSigner as any,
      );

      subject.next({status: 'sending'});

      const tx = await contract.safeTransferFrom(
        fromEvmAddress,
        toAddress,
        nftId,
        amount,
        '0x',
        {customData: {storageLimit: STORAGE_LIMIT}},
      );

      subject.next({
        status: 'broadcast',
        txHash: tx.hash,
      });

      const receipt = await tx.wait();

      subject.next({
        status: 'finalized',
        txHash: tx.hash,
        blockHash: receipt.blockHash,
      });

      subject.complete();
    } catch (error: any) {
      subject.next({status: 'error', error: error.message});
      subject.complete();
    }
  })();

  return subject.asObservable();
}
