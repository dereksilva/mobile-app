/**
 * Types specific to the reef-chain module.
 */

import type {Signer as InjectedSigner} from '@polkadot/api/types';
import type {KeyringPair, KeyringPair$Json} from '@polkadot/keyring/types';

/** Account info passed to initReefState */
export interface ReefChainAccount {
  name: string;
  address: string;
}

/** Token with amount for swap/transfer operations */
export interface TokenWithAmount {
  address: string;
  decimals: number;
  amount: string;
}

/** Swap settings */
export interface SwapSettings {
  deadline: number; // minutes
  slippageTolerance: number; // percentage (e.g. 0.8 = 0.8%)
}

/** Transaction status updates */
export type TxStatusType =
  | 'broadcast'
  | 'included-in-block'
  | 'finalized'
  | 'not-finalized'
  | 'signing'
  | 'sending'
  | 'error';

export interface TxStatusUpdate {
  status: TxStatusType;
  blockHash?: string;
  txHash?: string;
  error?: string;
}

/** Swap status updates (superset of TxStatusUpdate) */
export type SwapStatusType =
  | 'approving'
  | 'approve-started'
  | 'approved'
  | TxStatusType;

export interface SwapStatusUpdate {
  status: SwapStatusType;
  txHash?: string;
  error?: string;
}

/** Transaction info from indexer */
export interface TxInfo {
  from: string;
  to: string;
  block_number: string;
  age: string;
  extrinsic: string;
  token_name: string;
  token_address: string;
  amount: string;
  fee: string;
  status: string;
  timestamp: string;
  nftId: string;
  extrinsicIdx: string;
  eventIdx: string;
}

/** Pool info from indexer */
export interface PoolInfo {
  id: string;
  iconUrl1: string;
  iconUrl2: string;
  name1: string;
  name2: string;
  symbol1: string;
  symbol2: string;
  reserved1: string;
  reserved2: string;
  decimals1: number;
  decimals2: number;
  tvl: string;
  volume24h: string;
  volumeChange24h: string;
  userLockedAmount1: string;
  userLockedAmount2: string;
}

/** Chain metadata */
export interface ChainMetadata {
  chain: string;
  chainType: string;
  color: string;
  genesisHash: string;
  icon: string;
  metaCalls: string;
  specVersion: number;
  ss58Format: number;
  tokenDecimals: number;
  tokenSymbol: string;
  types: Record<string, string>;
}

/** Re-export polkadot types for convenience */
export type {InjectedSigner, KeyringPair, KeyringPair$Json};
