/**
 * Swap API — DEX swap operations via Reefswap router.
 *
 * Matches the pattern used by reef-chain/react-lib's `onSwap` hook
 * (the one powering the Reefswap web app on mainnet):
 *
 *   1. Populate the approve + trade calldata via ethers.populateTransaction
 *   2. Build both as substrate `evm.call` extrinsics manually
 *   3. Wrap them in `utility.batchAll([...])` so they execute atomically
 *   4. Sign and send the single batched extrinsic
 *
 * Why batchAll instead of two separate contract calls?
 *   - With two sequential extrinsics, `estimateResources` for the trade
 *     runs before the approve has landed on-chain. The simulation sees
 *     0 allowance, reverts, and returns garbage gas/storage — the real
 *     on-chain swap then runs out of budget and reverts silently.
 *   - Batching executes both atomically in one block with hardcoded
 *     resource limits for the trade, matching what Reefswap web does.
 */
import {Observable, Subject} from 'rxjs';
import {Contract, BigNumber} from 'ethers';
// Reef's `toBN` returns a bn.js BN instance — the format Polkadot's
// api.tx.* expects for Balance/u64/u32 fields. Using ethers BigNumber
// directly causes "Unable to construct number from multi-key object".
import {toBN as reefToBN} from '@reef-chain/evm-provider/esm/utils';
import {getProvider, getNetworkConfig, getApi} from './networkApi';
import {reefSigner} from './signer';
import {ERC20_ABI, REEFSWAP_ROUTER_ABI, REEFSWAP_PAIR_ABI, REEFSWAP_FACTORY_ABI} from './abi';
import type {TokenWithAmount, SwapSettings, SwapStatusUpdate} from './types';

/**
 * Hardcoded gas/storage limits for the trade extrinsic, matching the
 * values used by @reef-chain/react-lib's batched swap flow on mainnet.
 * We can't estimate the trade accurately before the approval has landed,
 * so we pick a value known to be sufficient.
 */
const TRADE_GAS_LIMIT = 582938 * 2; // ~1.16M — 2x Reefswap web's estimate
const TRADE_STORAGE_LIMIT = 64 * 2; // 128 bytes — 2x Reefswap web's estimate

/**
 * Execute a token swap via Reefswap router.
 * Returns Observable of swap progress updates.
 *
 * @param substrateAddress The caller's SS58 Substrate address (used for signing)
 */
export function executeSwap(
  substrateAddress: string,
  token1: TokenWithAmount,
  token2: TokenWithAmount,
  settings: SwapSettings,
): Observable<SwapStatusUpdate> {
  const subject = new Subject<SwapStatusUpdate>();

  (async () => {
    try {
      const provider = getProvider();
      const api = getApi();
      if (!provider || !api) throw new Error('Provider not connected');

      const config = getNetworkConfig();
      const routerAddress = config.routerAddress;

      // Resolve the EVM address for this substrate account. This is used
      // as the `to` param for the swap (recipient of output tokens).
      const evmAddressRaw: any = await api.query.evmAccounts.evmAddresses(
        substrateAddress,
      );
      const evmAddress = evmAddressRaw.isEmpty
        ? computeDefaultEvmAddress(substrateAddress)
        : evmAddressRaw.toString();

      subject.next({status: 'approving'});

      // Build approve calldata via an unsigned ethers Contract (provider
      // only, no signer — we just need populateTransaction).
      const token1Contract = new Contract(
        token1.address,
        ERC20_ABI,
        provider as any,
      );
      const approveTx = await token1Contract.populateTransaction.approve(
        routerAddress,
        token1.amount,
      );

      // Estimate resources for the approve — this call is safe to
      // estimate because approve has no preconditions.
      const approveResources = await (provider as any).estimateResources({
        ...approveTx,
        from: evmAddress,
      });

      // Approve must write the allowance storage slot, which costs ~64
      // bytes. estimateResources sometimes returns 0 for simple approves;
      // we enforce a minimum to match what Reefswap web uses.
      const APPROVE_STORAGE_MIN = 64;
      const estimatedStorage = approveResources.storage.lt(0)
        ? 0
        : approveResources.storage.toNumber();
      const approveStorage = Math.max(estimatedStorage, APPROVE_STORAGE_MIN);

      const approveExtrinsic = api.tx.evm.call(
        approveTx.to!,
        approveTx.data!,
        reefToBN(approveTx.value || 0),
        reefToBN(approveResources.gas),
        reefToBN(approveStorage),
      );

      // Build swap calldata.
      const routerContract = new Contract(
        routerAddress,
        REEFSWAP_ROUTER_ABI,
        provider as any,
      );

      const amountOutMin = calculateAmountWithSlippage(
        token2.amount,
        settings.slippageTolerance,
      );

      // Reefswap router uses seconds for `block.timestamp`. Use a generous
      // cushion so the user doesn't get caught by chain lag.
      const deadline =
        Math.floor(Date.now() / 1000) + settings.deadline * 60;

      const path = [token1.address, token2.address];

      const tradeTx =
        await routerContract.populateTransaction.swapExactTokensForTokensSupportingFeeOnTransferTokens(
          token1.amount,
          amountOutMin,
          path,
          evmAddress,
          deadline,
        );

      // Hardcode the trade's gas/storage — estimateResources can't
      // simulate it accurately here because the approve hasn't landed.
      const tradeExtrinsic = api.tx.evm.call(
        tradeTx.to!,
        tradeTx.data!,
        reefToBN(tradeTx.value || 0),
        reefToBN(TRADE_GAS_LIMIT),
        reefToBN(TRADE_STORAGE_LIMIT),
      );

      // Wrap both in a batchAll — atomic: either both succeed or both
      // roll back.
      const batch = api.tx.utility.batchAll([
        approveExtrinsic,
        tradeExtrinsic,
      ]);

      subject.next({status: 'approve-started'});

      // Sign and send as one extrinsic. The reefSigner routes the signing
      // prompt through the SigningOverlay modal.
      await new Promise<void>((resolve, reject) => {
        batch
          .signAndSend(
            substrateAddress,
            {signer: reefSigner},
            ({status, txHash, dispatchError, events}: any) => {
              if (dispatchError) {
                reject(new Error(dispatchError.toString()));
                return;
              }

              // Look for EVM.ExecutedFailed in the batched events — that
              // means the inner EVM call reverted even though the
              // extrinsic succeeded.
              const evmFailure = events?.find(
                ({event}: any) =>
                  event.section === 'evm' &&
                  event.method === 'ExecutedFailed',
              );
              if (evmFailure) {
                reject(
                  new Error(
                    'Swap reverted on-chain. Possible causes: slippage exceeded, insufficient storage limit, or deadline expired.',
                  ),
                );
                return;
              }

              if (status.isBroadcast) {
                subject.next({
                  status: 'broadcast',
                  txHash: txHash.toHex(),
                });
              } else if (status.isInBlock) {
                subject.next({status: 'approved'});
                subject.next({
                  status: 'finalized',
                  txHash: txHash.toHex(),
                });
                resolve();
              }
            },
          )
          .catch(reject);
      });

      subject.complete();
    } catch (error: any) {
      subject.next({status: 'error', error: error.message || String(error)});
      subject.complete();
    }
  })();

  return subject.asObservable();
}

/**
 * Compute the default EVM address for a substrate account (when no
 * claimed EVM address exists). Mirrors
 * `Signer.computeDefaultEvmAddress` in @reef-chain/evm-provider.
 */
function computeDefaultEvmAddress(substrateAddress: string): string {
  // For simplicity we require the account to have a claimed EVM address.
  // If this ever throws, the user needs to run "Claim EVM Address" first.
  throw new Error(
    `Account ${substrateAddress} has no claimed EVM address. Claim one from the Accounts screen first.`,
  );
}

/**
 * Get pool reserves for a token pair.
 */
export async function getPoolReserves(
  token1Address: string,
  token2Address: string,
): Promise<{reserve1: string; reserve2: string} | null> {
  const provider = getProvider();
  if (!provider) return null;

  const config = getNetworkConfig();

  const factory = new Contract(
    config.factoryAddress,
    REEFSWAP_FACTORY_ABI,
    provider as any,
  );

  const pairAddress = await factory.getPair(token1Address, token2Address);

  if (
    pairAddress === '0x0000000000000000000000000000000000000000'
  ) {
    return null;
  }

  const pair = new Contract(pairAddress, REEFSWAP_PAIR_ABI, provider as any);

  const reserves = await pair.getReserves();
  const token0 = await pair.token0();

  // Ensure reserves match the order of input tokens
  if (token0.toLowerCase() === token1Address.toLowerCase()) {
    return {
      reserve1: reserves[0].toString(),
      reserve2: reserves[1].toString(),
    };
  }
  return {
    reserve1: reserves[1].toString(),
    reserve2: reserves[0].toString(),
  };
}

/**
 * Calculate output amount for a swap (constant product formula).
 * Mirrors getOutputAmount from reef-mobile-js math utils.
 */
export function getSwapOutputAmount(
  inputAmount: string,
  reserve1: string,
  reserve2: string,
): string {
  const input = BigNumber.from(inputAmount);
  const r1 = BigNumber.from(reserve1);
  const r2 = BigNumber.from(reserve2);

  if (r1.isZero() || r2.isZero()) return '0';

  const inputWithFee = input.mul(997);
  const numerator = inputWithFee.mul(r2);
  const denominator = r1.mul(1000).add(inputWithFee);

  return numerator.div(denominator).toString();
}

/**
 * Calculate input amount for a desired output (constant product formula).
 */
export function getSwapInputAmount(
  outputAmount: string,
  reserve1: string,
  reserve2: string,
): string {
  const output = BigNumber.from(outputAmount);
  const r1 = BigNumber.from(reserve1);
  const r2 = BigNumber.from(reserve2);

  if (r1.isZero() || r2.isZero() || output.gte(r2)) return '0';

  const numerator = r1.mul(output).mul(1000);
  const denominator = r2.sub(output).mul(997);

  return numerator.div(denominator).add(1).toString();
}

/** Apply slippage tolerance to an amount */
function calculateAmountWithSlippage(
  amount: string,
  slippagePercent: number,
): string {
  const bn = BigNumber.from(amount);
  const factor = Math.floor((100 - slippagePercent) * 100);
  return bn.mul(factor).div(10000).toString();
}
