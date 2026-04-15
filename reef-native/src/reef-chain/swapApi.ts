/**
 * Swap API — DEX swap operations via Reefswap router.
 * Ports swapApi.ts and math utilities from reef-mobile-js.
 */

import {Observable, Subject} from 'rxjs';
import {Contract, BigNumber} from 'ethers';
import {Signer as ReefEvmSigner} from '@reef-chain/evm-provider';
import {getProvider, getNetworkConfig} from './networkApi';
import {reefSigner} from './signer';
import {ERC20_ABI, REEFSWAP_ROUTER_ABI, REEFSWAP_PAIR_ABI, REEFSWAP_FACTORY_ABI} from './abi';
import type {TokenWithAmount, SwapSettings, SwapStatusUpdate} from './types';

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
      if (!provider) throw new Error('Provider not connected');

      const config = getNetworkConfig();
      const routerAddress = config.routerAddress;

      // Create a Reef EVM Signer that wraps the Substrate account +
      // our promise-based reefSigner (which routes approval through the
      // SigningOverlay). Write operations on contracts require this.
      // NOTE: ReefEvmSigner requires a Substrate SS58 address, NOT an EVM
      // hex address — it throws "expect substrate address" otherwise.
      const evmSigner = new ReefEvmSigner(
        provider as any,
        substrateAddress,
        reefSigner,
      );

      // Resolve the EVM address that the signer will use to send txs —
      // this is needed as the `to` param for the swap and the owner
      // param for ERC20 allowance lookups.
      const evmAddress = await evmSigner.getAddress();

      // Step 1: Approve token1 spending
      subject.next({status: 'approving'});

      const token1Contract = new Contract(
        token1.address,
        ERC20_ABI,
        evmSigner as any,
      );

      const allowance = await token1Contract.allowance(
        evmAddress,
        routerAddress,
      );

      if (BigNumber.from(allowance).lt(BigNumber.from(token1.amount))) {
        subject.next({status: 'approve-started'});

        // Do NOT pass customData.storageLimit — the Reef EvmSigner would
        // use our literal value verbatim instead of its 3.1x auto-estimate,
        // and ERC20 approve on proxy tokens can need more than the 2000
        // we previously hardcoded. Letting it auto-estimate is safer.
        const approveTx = await token1Contract.approve(
          routerAddress,
          token1.amount,
        );

        const approveReceipt = await approveTx.wait();
        if (approveReceipt.status === 0) {
          // Inner EVM call reverted even though the extrinsic succeeded.
          throw new Error(
            'Token approval reverted on-chain. The tx may have run out of storage/gas limit.',
          );
        }
      }

      subject.next({status: 'approved'});

      // Step 2: Execute swap
      const routerContract = new Contract(
        routerAddress,
        REEFSWAP_ROUTER_ABI,
        evmSigner as any,
      );

      const amountOutMin = calculateAmountWithSlippage(
        token2.amount,
        settings.slippageTolerance,
      );

      const deadline = Math.floor(Date.now() / 1000) + settings.deadline * 60;

      const path = [token1.address, token2.address];

      // Swaps touch 3 contracts and many storage slots — auto-estimate
      // rather than hardcoding a small limit.
      const swapTx =
        await routerContract.swapExactTokensForTokensSupportingFeeOnTransferTokens(
          token1.amount,
          amountOutMin,
          path,
          evmAddress,
          deadline,
        );

      subject.next({status: 'broadcast', txHash: swapTx.hash});

      const receipt = await swapTx.wait();

      if (receipt.status === 0) {
        // Inner EVM call reverted. Reef's extrinsic still lands on-chain
        // (you'll see it on reefscan) but no tokens moved — usually caused
        // by insufficient storage/gas limit or a slippage failure.
        throw new Error(
          'Swap reverted on-chain. Possible causes: slippage exceeded, insufficient storage limit, or deadline expired.',
        );
      }

      subject.next({status: 'finalized', txHash: swapTx.hash});
      subject.complete();
    } catch (error: any) {
      subject.next({status: 'error', error: error.message});
      subject.complete();
    }
  })();

  return subject.asObservable();
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
