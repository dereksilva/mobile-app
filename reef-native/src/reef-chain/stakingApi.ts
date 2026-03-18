/**
 * Staking API — interacts with the Substrate Staking pallet on Reef chain.
 *
 * Based on Fearless Wallet's staking implementation adapted for React Native.
 * Uses the Polkadot.js ApiPromise for storage queries and extrinsic submission.
 *
 * Key pallet calls:
 *   staking.bond(value, payee)       — initial bond
 *   staking.nominate(targets)        — select validators
 *   staking.bond_extra(value)        — add to existing stake
 *   staking.unbond(value)            — start unbonding
 *   staking.withdraw_unbonded(spans) — withdraw after unbonding period
 *   staking.payout_stakers(validator, era) — claim rewards
 *   staking.chill()                  — stop nominating
 */

import {getApi} from './networkApi';
import {reefSigner} from './signer';

// --- Types ---

export interface ValidatorInfo {
  address: string;
  identity: string | null;
  commission: number; // 0-100%
  totalStake: string; // planck
  ownStake: string;   // planck
  nominatorCount: number;
  isElected: boolean;
  isOversubscribed: boolean;
  hasSlashes: boolean;
  isBlocked: boolean;
}

export interface StakingLedger {
  stash: string;
  total: string;
  active: string;
  unlocking: UnlockChunk[];
  claimedRewards: number[];
}

export interface UnlockChunk {
  value: string;
  era: number;
}

export interface StakingInfo {
  activeEra: number;
  currentEra: number;
  minNominatorBond: string;
  maxNominatorsCount: number | null;
  currentNominatorsCount: number;
  bondingDuration: number; // eras
  sessionsPerEra: number;
  existentialDeposit: string;
  totalStaked: string;
}

export type RewardDestination = 'Staked' | 'Stash' | { Account: string };

export interface EraRewardInfo {
  era: number;
  totalReward: string;
  totalStake: string;
  rewardPoints: number;
}

// --- Storage Queries ---

/**
 * Fetch general staking network info.
 */
export async function getStakingInfo(): Promise<StakingInfo | null> {
  const api = getApi();
  if (!api) return null;

  const [
    activeEraOpt,
    currentEraOpt,
    minBond,
    maxNominators,
    counterNominators,
    bondingDuration,
    sessionsPerEra,
    existentialDeposit,
  ] = await Promise.all([
    api.query.staking.activeEra(),
    api.query.staking.currentEra(),
    api.query.staking.minNominatorBond(),
    api.query.staking.maxNominatorsCount(),
    api.query.staking.counterForNominators(),
    api.consts.staking.bondingDuration,
    api.consts.staking.sessionsPerEra,
    api.consts.balances.existentialDeposit,
  ]);

  const activeEra = (activeEraOpt as any).unwrapOrDefault();
  const currentEra = (currentEraOpt as any).unwrapOrDefault();

  // Get total staked for current era
  let totalStaked = '0';
  try {
    const eraTotalStake = await api.query.staking.erasTotalStake(
      activeEra.index.toNumber(),
    );
    totalStaked = eraTotalStake.toString();
  } catch {}

  return {
    activeEra: activeEra.index.toNumber(),
    currentEra: currentEra.toNumber(),
    minNominatorBond: minBond.toString(),
    maxNominatorsCount: (maxNominators as any).isSome
      ? (maxNominators as any).unwrap().toNumber()
      : null,
    currentNominatorsCount: (counterNominators as any).toNumber(),
    bondingDuration: (bondingDuration as any).toNumber(),
    sessionsPerEra: (sessionsPerEra as any).toNumber(),
    existentialDeposit: existentialDeposit.toString(),
    totalStaked,
  };
}

/**
 * Fetch the staking ledger for a given account (stash).
 */
export async function getStakingLedger(
  address: string,
): Promise<StakingLedger | null> {
  const api = getApi();
  if (!api) return null;

  // First check if the address has a controller (bonded)
  const bonded = await api.query.staking.bonded(address);
  if ((bonded as any).isNone) return null;

  const controller = (bonded as any).unwrap().toString();
  const ledgerOpt = await api.query.staking.ledger(controller);
  if ((ledgerOpt as any).isNone) return null;

  const ledger = (ledgerOpt as any).unwrap();
  return {
    stash: ledger.stash.toString(),
    total: ledger.total.toString(),
    active: ledger.active.toString(),
    unlocking: ledger.unlocking.map((chunk: any) => ({
      value: chunk.value.toString(),
      era: chunk.era.toNumber(),
    })),
    claimedRewards: ledger.claimedRewards
      ? ledger.claimedRewards.map((e: any) => e.toNumber())
      : [],
  };
}

/**
 * Get the user's current nominations (which validators they nominated).
 */
export async function getNominations(
  address: string,
): Promise<string[] | null> {
  const api = getApi();
  if (!api) return null;

  const nominationsOpt = await api.query.staking.nominators(address);
  if ((nominationsOpt as any).isNone) return null;

  const nominations = (nominationsOpt as any).unwrap();
  return nominations.targets.map((t: any) => t.toString());
}

/**
 * Get the reward destination for a stash account.
 */
export async function getPayee(
  address: string,
): Promise<string | null> {
  const api = getApi();
  if (!api) return null;

  const payee = await api.query.staking.payee(address);
  return payee.toString();
}

/**
 * Fetch all elected validators for the current era.
 */
export async function getValidators(): Promise<ValidatorInfo[]> {
  const api = getApi();
  if (!api) return [];

  const activeEraOpt = await api.query.staking.activeEra();
  const activeEra = (activeEraOpt as any).unwrapOrDefault();
  const eraIndex = activeEra.index.toNumber();

  // Get all validator addresses from staking.validators entries
  const validatorEntries = await api.query.staking.validators.entries();

  const validators: ValidatorInfo[] = [];

  // Process in batches to avoid overwhelming the RPC
  const BATCH_SIZE = 20;
  for (let i = 0; i < validatorEntries.length; i += BATCH_SIZE) {
    const batch = validatorEntries.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async ([key, prefs]: [any, any]) => {
        const validatorAddress = key.args[0].toString();
        const commission =
          (prefs as any).commission.toNumber() / 10_000_000; // perbill to %

        let totalStake = '0';
        let ownStake = '0';
        let nominatorCount = 0;

        try {
          const exposure = await api.query.staking.erasStakers(
            eraIndex,
            validatorAddress,
          );
          totalStake = (exposure as any).total.toString();
          ownStake = (exposure as any).own.toString();
          nominatorCount = (exposure as any).others.length;
        } catch {}

        // Check for identity
        let identity: string | null = null;
        try {
          const identityOpt = await api.query.identity.identityOf(
            validatorAddress,
          );
          if ((identityOpt as any).isSome) {
            const idInfo = (identityOpt as any).unwrap();
            const display = idInfo.info?.display;
            if (display && display.isRaw) {
              identity = display.asRaw.toUtf8();
            }
          }
        } catch {}

        // Check if blocked
        const isBlocked = (prefs as any).blocked?.isTrue ?? false;

        return {
          address: validatorAddress,
          identity,
          commission,
          totalStake,
          ownStake,
          nominatorCount,
          isElected: true, // from validators.entries = elected
          isOversubscribed: false, // TODO: check against maxNominatorRewardedPerValidator
          hasSlashes: false, // TODO: check slashing spans
          isBlocked,
        } as ValidatorInfo;
      }),
    );

    validators.push(...batchResults);
  }

  return validators;
}

/**
 * Fetch era reward data for APY calculation.
 */
export async function getEraRewards(
  eraCount: number = 14,
): Promise<EraRewardInfo[]> {
  const api = getApi();
  if (!api) return [];

  const activeEraOpt = await api.query.staking.activeEra();
  const activeEra = (activeEraOpt as any).unwrapOrDefault();
  const currentEra = activeEra.index.toNumber();

  const results: EraRewardInfo[] = [];

  for (let i = 1; i <= eraCount; i++) {
    const era = currentEra - i;
    if (era < 0) break;

    try {
      const [reward, totalStake, rewardPoints] = await Promise.all([
        api.query.staking.erasValidatorReward(era),
        api.query.staking.erasTotalStake(era),
        api.query.staking.erasRewardPoints(era),
      ]);

      results.push({
        era,
        totalReward: (reward as any).unwrapOrDefault().toString(),
        totalStake: totalStake.toString(),
        rewardPoints: (rewardPoints as any).total.toNumber(),
      });
    } catch {}
  }

  return results;
}

/**
 * Calculate estimated APY from recent era rewards.
 * Uses Reef's 14-era lookback window.
 */
export function calculateApy(eraRewards: EraRewardInfo[]): number {
  if (eraRewards.length === 0) return 0;

  let totalReturn = 0;
  let count = 0;

  for (const era of eraRewards) {
    const reward = parseFloat(era.totalReward);
    const stake = parseFloat(era.totalStake);
    if (stake > 0 && reward > 0) {
      totalReturn += reward / stake;
      count++;
    }
  }

  if (count === 0) return 0;

  const dailyReturn = totalReturn / count;
  // Compound over 365 days
  const apy = (Math.pow(1 + dailyReturn, 365) - 1) * 100;
  return Math.min(apy, 999); // cap at 999%
}

// --- Extrinsic Calls ---

/**
 * Bond (stake) tokens and optionally nominate validators.
 * For first-time stakers: bond + nominate in a batch.
 * For existing stakers adding more: bond_extra.
 */
export async function stakeBond(
  stashAddress: string,
  amount: string,
  payee: RewardDestination,
  validatorAddresses?: string[],
): Promise<string> {
  const api = getApi();
  if (!api) throw new Error('API not connected');

  const txs = [];

  // Build the bond call
  const rewardDest =
    payee === 'Staked'
      ? {Staked: null}
      : payee === 'Stash'
        ? {Stash: null}
        : {Account: (payee as any).Account};

  txs.push(api.tx.staking.bond(amount, rewardDest));

  // If validator addresses provided, add nominate call
  if (validatorAddresses && validatorAddresses.length > 0) {
    txs.push(api.tx.staking.nominate(validatorAddresses));
  }

  // Batch if multiple calls, otherwise single
  const tx = txs.length > 1 ? api.tx.utility.batchAll(txs) : txs[0];

  return new Promise<string>((resolve, reject) => {
    tx.signAndSend(
      stashAddress,
      {signer: reefSigner},
      ({status, dispatchError, txHash}: any) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(
              dispatchError.asModule,
            );
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
        } else if (status.isFinalized) {
          resolve(txHash.toString());
        }
      },
    ).catch(reject);
  });
}

/**
 * Bond extra tokens to an existing stake.
 */
export async function stakeBondExtra(
  stashAddress: string,
  amount: string,
): Promise<string> {
  const api = getApi();
  if (!api) throw new Error('API not connected');

  const tx = api.tx.staking.bondExtra(amount);

  return new Promise<string>((resolve, reject) => {
    tx.signAndSend(
      stashAddress,
      {signer: reefSigner},
      ({status, dispatchError, txHash}: any) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
        } else if (status.isFinalized) {
          resolve(txHash.toString());
        }
      },
    ).catch(reject);
  });
}

/**
 * Unbond tokens (start the unbonding period).
 */
export async function stakeUnbond(
  stashAddress: string,
  amount: string,
): Promise<string> {
  const api = getApi();
  if (!api) throw new Error('API not connected');

  const tx = api.tx.staking.unbond(amount);

  return new Promise<string>((resolve, reject) => {
    tx.signAndSend(
      stashAddress,
      {signer: reefSigner},
      ({status, dispatchError, txHash}: any) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
        } else if (status.isFinalized) {
          resolve(txHash.toString());
        }
      },
    ).catch(reject);
  });
}

/**
 * Withdraw unbonded tokens (after unbonding period completes).
 */
export async function stakeWithdraw(
  stashAddress: string,
): Promise<string> {
  const api = getApi();
  if (!api) throw new Error('API not connected');

  // numSlashingSpans = 0 for most cases
  const tx = api.tx.staking.withdrawUnbonded(0);

  return new Promise<string>((resolve, reject) => {
    tx.signAndSend(
      stashAddress,
      {signer: reefSigner},
      ({status, dispatchError, txHash}: any) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
        } else if (status.isFinalized) {
          resolve(txHash.toString());
        }
      },
    ).catch(reject);
  });
}

/**
 * Update nominated validators.
 */
export async function stakeNominate(
  stashAddress: string,
  validatorAddresses: string[],
): Promise<string> {
  const api = getApi();
  if (!api) throw new Error('API not connected');

  const tx = api.tx.staking.nominate(validatorAddresses);

  return new Promise<string>((resolve, reject) => {
    tx.signAndSend(
      stashAddress,
      {signer: reefSigner},
      ({status, dispatchError, txHash}: any) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
        } else if (status.isFinalized) {
          resolve(txHash.toString());
        }
      },
    ).catch(reject);
  });
}

/**
 * Stop nominating (chill).
 */
export async function stakeChill(
  stashAddress: string,
): Promise<string> {
  const api = getApi();
  if (!api) throw new Error('API not connected');

  const tx = api.tx.staking.chill();

  return new Promise<string>((resolve, reject) => {
    tx.signAndSend(
      stashAddress,
      {signer: reefSigner},
      ({status, dispatchError, txHash}: any) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
          } else {
            reject(new Error(dispatchError.toString()));
          }
        } else if (status.isFinalized) {
          resolve(txHash.toString());
        }
      },
    ).catch(reject);
  });
}

/**
 * Estimate the transaction fee for a staking bond + nominate.
 */
export async function estimateStakeFee(
  stashAddress: string,
  amount: string,
  validatorAddresses: string[],
): Promise<string> {
  const api = getApi();
  if (!api) throw new Error('API not connected');

  const txs = [api.tx.staking.bond(amount, {Staked: null})];
  if (validatorAddresses.length > 0) {
    txs.push(api.tx.staking.nominate(validatorAddresses));
  }

  const tx = txs.length > 1 ? api.tx.utility.batchAll(txs) : txs[0];
  const info = await tx.paymentInfo(stashAddress);
  return info.partialFee.toString();
}
