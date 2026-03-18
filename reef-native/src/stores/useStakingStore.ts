/**
 * Staking store — manages staking state with Zustand.
 */

import {create} from 'zustand';
import type {
  ValidatorInfo,
  StakingLedger,
  StakingInfo,
  EraRewardInfo,
} from '../reef-chain/stakingApi';

export type StakingFlow =
  | 'idle'
  | 'amount'      // entering stake amount
  | 'validators'  // selecting validators
  | 'confirm'     // reviewing before submit
  | 'submitting'  // tx in progress
  | 'success'     // tx finalized
  | 'error';      // tx failed

interface StakingState {
  // Network staking info
  stakingInfo: StakingInfo | null;
  // User's staking ledger
  ledger: StakingLedger | null;
  // User's nominated validators
  nominations: string[] | null;
  // All available validators
  validators: ValidatorInfo[];
  // Era reward data for APY
  eraRewards: EraRewardInfo[];
  // Calculated APY
  estimatedApy: number;

  // Flow state
  flow: StakingFlow;
  stakeAmount: string;
  selectedValidators: string[];
  rewardDestination: 'Staked' | 'Stash';
  txHash: string | null;
  errorMessage: string | null;

  // Loading flags
  loadingInfo: boolean;
  loadingValidators: boolean;

  // Actions
  setStakingInfo: (info: StakingInfo | null) => void;
  setLedger: (ledger: StakingLedger | null) => void;
  setNominations: (nominations: string[] | null) => void;
  setValidators: (validators: ValidatorInfo[]) => void;
  setEraRewards: (rewards: EraRewardInfo[]) => void;
  setEstimatedApy: (apy: number) => void;
  setFlow: (flow: StakingFlow) => void;
  setStakeAmount: (amount: string) => void;
  setSelectedValidators: (validators: string[]) => void;
  toggleValidator: (address: string) => void;
  setRewardDestination: (dest: 'Staked' | 'Stash') => void;
  setTxHash: (hash: string | null) => void;
  setErrorMessage: (msg: string | null) => void;
  setLoadingInfo: (loading: boolean) => void;
  setLoadingValidators: (loading: boolean) => void;
  resetFlow: () => void;
}

export const useStakingStore = create<StakingState>((set, get) => ({
  stakingInfo: null,
  ledger: null,
  nominations: null,
  validators: [],
  eraRewards: [],
  estimatedApy: 0,

  flow: 'idle',
  stakeAmount: '',
  selectedValidators: [],
  rewardDestination: 'Staked',
  txHash: null,
  errorMessage: null,

  loadingInfo: false,
  loadingValidators: false,

  setStakingInfo: info => set({stakingInfo: info}),
  setLedger: ledger => set({ledger}),
  setNominations: nominations => set({nominations}),
  setValidators: validators => set({validators}),
  setEraRewards: rewards => set({eraRewards: rewards}),
  setEstimatedApy: apy => set({estimatedApy: apy}),
  setFlow: flow => set({flow}),
  setStakeAmount: amount => set({stakeAmount: amount}),
  setSelectedValidators: validators => set({selectedValidators: validators}),
  toggleValidator: (address: string) => {
    const current = get().selectedValidators;
    if (current.includes(address)) {
      set({selectedValidators: current.filter(v => v !== address)});
    } else {
      set({selectedValidators: [...current, address]});
    }
  },
  setRewardDestination: dest => set({rewardDestination: dest}),
  setTxHash: hash => set({txHash: hash}),
  setErrorMessage: msg => set({errorMessage: msg}),
  setLoadingInfo: loading => set({loadingInfo: loading}),
  setLoadingValidators: loading => set({loadingValidators: loading}),
  resetFlow: () =>
    set({
      flow: 'idle',
      stakeAmount: '',
      selectedValidators: [],
      txHash: null,
      errorMessage: null,
    }),
}));
