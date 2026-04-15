/**
 * Reef chain configuration — network endpoints, contract addresses, ABIs.
 * Mirrors the JS bundle's AVAILABLE_NETWORKS and contract constants.
 */

import {NetworkName} from '../types';

export interface NetworkConfig {
  name: NetworkName;
  rpcUrl: string;
  reefscanUrl: string;
  graphqlExplorerUrl: string;
  eventsUrl: string;
  genesisHash: string;
  routerAddress: string;
  factoryAddress: string;
}

export const NETWORK_CONFIG: Record<NetworkName, NetworkConfig> = {
  [NetworkName.MAINNET]: {
    name: NetworkName.MAINNET,
    rpcUrl: 'wss://rpc.reefscan.com/ws',
    reefscanUrl: 'https://reefscan.com',
    graphqlExplorerUrl: 'wss://squid.subsquid.io/reef-explorer/graphql',
    eventsUrl: 'wss://events.reefscan.info',
    genesisHash:
      '0x7834781d38e4798d548e34ec947d19deea29df148a7bf32484b7b24dacf8d4b7',
    // Canonical Reefswap mainnet router (EIP-55 checksummed).
    // Source: https://docs.reef.io + on-chain verification of working swaps.
    // The previous address '0x641e34931C03751bFeD14c4E0e0ea77A3B037E2d' was
    // a typo that had been present since the initial port — same prefix but
    // different suffix, so swaps silently hit the wrong (or no) contract.
    routerAddress: '0x641e34931C03751BFED14C4087bA395303bEd1A5',
    factoryAddress: '0x380a9033500154872813F6E1120a81ed6c0760a8',
  },
  [NetworkName.TESTNET]: {
    name: NetworkName.TESTNET,
    rpcUrl: 'wss://rpc-testnet.reefscan.com/ws',
    reefscanUrl: 'https://testnet.reefscan.com',
    graphqlExplorerUrl:
      'wss://squid.subsquid.io/reef-explorer-testnet/graphql',
    eventsUrl: 'wss://events-testnet.reefscan.info',
    genesisHash:
      '0xb414a8602b2251fa538d38a9322391500bd0324bc7ac6048845f6f31f1e1b948',
    routerAddress: '0x0Bc239E5eCcDF84598b1DfDE0e560E3daA1173ea',
    factoryAddress: '0xcA36Ba38f2776184242d3DB56294683685E3a2eA',
  },
};

/** Native REEF token contract address */
export const REEF_TOKEN_ADDRESS =
  '0x0000000000000000000000000000000001000000';

/** SS58 format for Reef network addresses */
export const SS58_FORMAT = 42;

/** Default auto-reconnect interval in ms */
export const AUTO_CONNECT_MS = 5000;

/** EVM storage limit for transactions */
export const STORAGE_LIMIT = 2000;

/** Keypair type for Reef accounts */
export const KEYPAIR_TYPE = 'sr25519';
