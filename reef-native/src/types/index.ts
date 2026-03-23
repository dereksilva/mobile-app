// --- Status wrapper for async data ---

export enum StatusCode {
  LOADING = 'loading',
  ERROR = 'error',
  COMPLETE = 'complete',
}

export interface StatusDataObject<T> {
  data: T | null;
  status: StatusCode;
  error?: string;
}

export function createLoadingStatus<T>(): StatusDataObject<T> {
  return {data: null, status: StatusCode.LOADING};
}

export function createCompleteStatus<T>(data: T): StatusDataObject<T> {
  return {data, status: StatusCode.COMPLETE};
}

export function createErrorStatus<T>(error: string): StatusDataObject<T> {
  return {data: null, status: StatusCode.ERROR, error};
}

// --- Network ---

export enum NetworkName {
  MAINNET = 'mainnet',
  TESTNET = 'testnet',
}

export interface Network {
  name: NetworkName;
  rpcUrl: string;
  reefscanUrl: string;
  graphqlExplorerUrl: string;
  genesisHash: string;
}

export const NETWORKS: Record<NetworkName, Network> = {
  [NetworkName.MAINNET]: {
    name: NetworkName.MAINNET,
    rpcUrl: 'wss://rpc.reefscan.com/ws',
    reefscanUrl: 'https://reefscan.com',
    graphqlExplorerUrl: 'wss://squid.subsquid.io/reef-explorer/graphql',
    genesisHash:
      '0x7834781d38e4798d548e34ec947d19deea29df148a7bf32484b7b24dacf8d4b7',
  },
  [NetworkName.TESTNET]: {
    name: NetworkName.TESTNET,
    rpcUrl: 'wss://rpc-testnet.reefscan.com/ws',
    reefscanUrl: 'https://testnet.reefscan.com',
    graphqlExplorerUrl:
      'wss://squid.subsquid.io/reef-explorer-testnet/graphql',
    genesisHash:
      '0xb414a8602b2251fa538d38a9322391500bd0324bc7ac6048845f6f31f1e1b948',
  },
};

// --- Account ---

export interface StoredAccount {
  address: string;
  name: string;
  svg: string; // identicon SVG
  isEvmClaimed: boolean;
  mnemonic?: string; // encrypted
  json?: string; // encrypted JSON backup
}

export interface ReefAccount extends StoredAccount {
  balance: string;
  evmAddress?: string;
}

// --- Token ---

export interface TokenBalance {
  address: string; // contract address
  name: string;
  symbol: string;
  decimals: number;
  balance: string;
  price: number;
  iconUrl: string;
}

export interface NFT {
  contractAddress: string;
  nftId: string;
  name: string;
  iconUrl: string;
  balance: number;
  mimetype?: string;
}

// --- Transaction ---

export interface TransactionRecord {
  hash: string;
  type: 'transfer' | 'swap' | 'bind' | 'approve' | 'other';
  timestamp: number;
  token?: TokenBalance;
  toAddress?: string;
  fromAddress?: string;
  amount?: string;
  inbound?: boolean;
  status: 'pending' | 'success' | 'error';
  blockNumber?: number;
}

// --- Signing ---

export interface SignatureRequest {
  id: string;
  payload: any; // SignerPayloadJSON from @polkadot/types
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  description?: string;
}

// --- Pool ---

export interface Pool {
  address: string;
  token1: TokenBalance;
  token2: TokenBalance;
  reserve1: string;
  reserve2: string;
  totalSupply: string;
  userPoolBalance?: string;
}

// --- WalletConnect ---

export interface WCSession {
  topic: string;
  peerMeta: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
  chainId: string;
  connected: boolean;
}

// --- App Init ---

export enum InitState {
  NOT_STARTED = 'not_started',
  LOADING = 'loading',
  FIRST_LAUNCH = 'first_launch',
  AUTH_REQUIRED = 'auth_required',
  READY = 'ready',
  ERROR = 'error',
}

// --- Constants ---

export const Constants = {
  REEF_TOKEN_ADDRESS: '0x0000000000000000000000000000000001000000',
  REEF_MAINNET_GENESIS_HASH:
    '0x7834781d38e4798d548e34ec947d19deea29df148a7bf32484b7b24dacf8d4b7',
  REEF_TESTNET_GENESIS_HASH:
    '0xb414a8602b2251fa538d38a9322391500bd0324bc7ac6048845d57c37dd83fe6',
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  REEF_TOKEN: {
    name: 'Reef',
    address: '0x0000000000000000000000000000000001000000',
    iconUrl: '',
    symbol: 'REEF',
    decimals: 18,
  },
} as const;

// --- Storage Keys ---

export enum StorageKey {
  SELECTED_ADDRESS = 'selected_address',
  PASSWORD_HASH = 'password_hash',
  NETWORK = 'network',
  LANGUAGE = 'language',
  DISPLAY_BALANCE = 'display_balance',
  BIOMETRIC_AUTH = 'biometric_auth',
  FIRST_LAUNCH = 'first_launch',
  NAVIGATE_ON_ACCOUNT_SWITCH = 'navigate_on_account_switch',
  DEVELOPER_MODE = 'developer_mode',
}
