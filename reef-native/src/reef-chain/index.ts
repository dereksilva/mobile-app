/**
 * Reef Chain module — native blockchain integration.
 *
 * Replaces the entire WebView bridge architecture with direct
 * Polkadot.js connections running in the Hermes runtime.
 */

// Initialization
export {initReefState, reinitReefState} from './initReefState';

// Network/Provider
export {
  initProvider,
  disconnectProvider,
  reconnectProvider,
  switchNetwork,
  getProvider,
  getApi,
  getNetworkConfig,
  getCurrentNetwork,
  setIndexerConnected,
  providerConn$,
  indexerConn$,
} from './networkApi';

// Account operations
export {
  initKeyring,
  generateAccount,
  accountFromMnemonic,
  checkMnemonicValid,
  keyPairFromMnemonic,
  restoreFromJson,
  exportAccountJson,
  isValidSubstrateAddress,
  isValidEvmAddress,
  claimEvmAccount,
  resolveEvmAddress,
  resolveFromEvmAddress,
  signWithMnemonic,
} from './accountApi';

// Signing
export {signPayload, signRaw} from './signingApi';

// Signer (for passing to extrinsic calls)
export {reefSigner, ReefSigner} from './signer';

// Transfers
export {sendToken, sendNft} from './transferApi';

// Swaps
export {
  executeSwap,
  getPoolReserves,
  getSwapOutputAmount,
  getSwapInputAmount,
} from './swapApi';

// Metadata
export {getMetadata} from './metadataApi';

// Staking
export {
  getStakingInfo,
  getStakingLedger,
  getNominations,
  getPayee,
  getValidators,
  getEraRewards,
  calculateApy,
  stakeBond,
  stakeBondExtra,
  stakeUnbond,
  stakeWithdraw,
  stakeNominate,
  stakeChill,
  estimateStakeFee,
} from './stakingApi';

// ABIs
export {
  ERC20_ABI,
  ERC1155_ABI,
  REEFSWAP_ROUTER_ABI,
  REEFSWAP_FACTORY_ABI,
  REEFSWAP_PAIR_ABI,
} from './abi';

// Config
export {
  NETWORK_CONFIG,
  REEF_TOKEN_ADDRESS,
  SS58_FORMAT,
  AUTO_CONNECT_MS,
  STORAGE_LIMIT,
  KEYPAIR_TYPE,
} from './config';

// Types
export type {
  ReefChainAccount,
  TokenWithAmount,
  SwapSettings,
  TxStatusUpdate,
  TxStatusType,
  SwapStatusUpdate,
  SwapStatusType,
  TxInfo,
  PoolInfo,
  ChainMetadata,
} from './types';

export type {
  ValidatorInfo,
  StakingLedger,
  StakingInfo,
  UnlockChunk,
  RewardDestination,
  EraRewardInfo,
} from './stakingApi';
