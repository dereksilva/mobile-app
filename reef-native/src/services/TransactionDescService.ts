/**
 * TransactionDescService — decodes transaction payloads to human-readable descriptions.
 * Ports TransactionDescService.dart from Flutter.
 *
 * Handles:
 * - ERC20 transfer / approve
 * - ERC1155 safeTransferFrom (NFT)
 * - ReefSwap router swap calls
 * - Native balances.transfer
 * - EVM account claiming
 */

import {ethers} from 'ethers';
import {ERC20_ABI, ERC1155_ABI, REEFSWAP_ROUTER_ABI} from '../reef-chain/abi';
import {getApi} from '../reef-chain/networkApi';
import type {SignerPayloadJSON} from '@polkadot/types/types';

// ----- Types -----

export interface DecodedTransaction {
  /** Human-readable one-line description */
  description: string;
  /** Decoded method name (e.g., "transfer", "approve") */
  methodName: string;
  /** Key-value params from decoded method */
  params: Record<string, string>;
  /** Contract address for EVM calls */
  contractAddress?: string;
  /** Whether this was an EVM or native call */
  type: 'evm' | 'native' | 'raw' | 'unknown';
}

export interface TxDecodedData {
  chainName?: string;
  genesisHash?: string;
  specVersion: string;
  nonce: string;
  tip?: string;
  methodName?: string;
  args?: string;
  info?: string;
}

// ----- EVM Interfaces -----

const erc20Interface = new ethers.utils.Interface(ERC20_ABI);
const erc1155Interface = new ethers.utils.Interface(ERC1155_ABI);
const routerInterface = new ethers.utils.Interface(REEFSWAP_ROUTER_ABI);

// ----- Helpers -----

/** Shorten address for display */
function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Format BigNumber to readable decimal */
function formatAmount(
  value: ethers.BigNumber,
  decimals: number = 18,
): string {
  try {
    const formatted = ethers.utils.formatUnits(value, decimals);
    // Trim trailing zeros
    const num = parseFloat(formatted);
    if (num === 0) return '0';
    if (num < 0.0001) return '<0.0001';
    return num.toLocaleString(undefined, {maximumFractionDigits: 4});
  } catch {
    return value.toString();
  }
}

/** Convert hex string to decimal string */
function hexToDecimal(hex: string): string {
  if (!hex) return '0';
  if (hex.startsWith('0x')) {
    return parseInt(hex, 16).toString();
  }
  return hex;
}

// ----- Decode EVM Calls -----

/**
 * Try to decode EVM call data against known ABIs.
 */
function tryDecodeEvmCall(
  data: string,
  contractAddress: string,
): DecodedTransaction | null {
  // Try ERC20
  try {
    const decoded = erc20Interface.parseTransaction({data});
    if (decoded) {
      const name = decoded.name;

      if (name === 'transfer') {
        const to = decoded.args[0] as string;
        const amount = decoded.args[1] as ethers.BigNumber;
        return {
          description: `Sending ${formatAmount(amount)} tokens to ${shortenAddress(to)}`,
          methodName: 'transfer',
          params: {
            recipient: to,
            amount: formatAmount(amount),
          },
          contractAddress,
          type: 'evm',
        };
      }

      if (name === 'approve') {
        const spender = decoded.args[0] as string;
        const amount = decoded.args[1] as ethers.BigNumber;
        const isMaxApproval = amount.eq(ethers.constants.MaxUint256);
        return {
          description: isMaxApproval
            ? `Approving unlimited tokens for ${shortenAddress(spender)}`
            : `Approving ${formatAmount(amount)} tokens for ${shortenAddress(spender)}`,
          methodName: 'approve',
          params: {
            spender,
            amount: isMaxApproval ? 'Unlimited' : formatAmount(amount),
          },
          contractAddress,
          type: 'evm',
        };
      }

      if (name === 'transferFrom') {
        const from = decoded.args[0] as string;
        const to = decoded.args[1] as string;
        const amount = decoded.args[2] as ethers.BigNumber;
        return {
          description: `Transfer ${formatAmount(amount)} tokens from ${shortenAddress(from)} to ${shortenAddress(to)}`,
          methodName: 'transferFrom',
          params: {
            sender: from,
            recipient: to,
            amount: formatAmount(amount),
          },
          contractAddress,
          type: 'evm',
        };
      }
    }
  } catch {
    // Not an ERC20 call
  }

  // Try ERC1155
  try {
    const decoded = erc1155Interface.parseTransaction({data});
    if (decoded) {
      if (decoded.name === 'safeTransferFrom') {
        const to = decoded.args[1] as string;
        const id = (decoded.args[2] as ethers.BigNumber).toString();
        const amount = (decoded.args[3] as ethers.BigNumber).toString();
        return {
          description: `NFT transfer: ${amount}x ID:${id} to ${shortenAddress(to)}`,
          methodName: 'safeTransferFrom',
          params: {
            to,
            tokenId: id,
            amount,
          },
          contractAddress,
          type: 'evm',
        };
      }
    }
  } catch {
    // Not an ERC1155 call
  }

  // Try ReefSwap Router
  try {
    const decoded = routerInterface.parseTransaction({data});
    if (decoded) {
      if (
        decoded.name ===
        'swapExactTokensForTokensSupportingFeeOnTransferTokens'
      ) {
        const amountIn = decoded.args[0] as ethers.BigNumber;
        const amountOutMin = decoded.args[1] as ethers.BigNumber;
        const path = decoded.args[2] as string[];
        const to = decoded.args[3] as string;
        return {
          description: `Swap ${formatAmount(amountIn)} for min ${formatAmount(amountOutMin)}`,
          methodName: 'swap',
          params: {
            amountIn: formatAmount(amountIn),
            amountOutMin: formatAmount(amountOutMin),
            path: path.map(shortenAddress).join(' → '),
            to,
          },
          contractAddress,
          type: 'evm',
        };
      }
    }
  } catch {
    // Not a router call
  }

  return null;
}

// ----- Decode Native (Substrate) Calls -----

/**
 * Try to decode a native Substrate extrinsic method from the API registry.
 */
function tryDecodeNativeCall(
  methodHex: string,
): DecodedTransaction | null {
  try {
    const api = getApi();
    if (!api) return null;

    const call = api.registry.createType('Call', methodHex);
    const {method, section} = call;
    const fullMethod = `${section}.${method}`;
    const meta = call.meta;

    const params: Record<string, string> = {};
    const args = call.args;
    const argNames = meta.args.map(a => a.name.toString());

    for (let i = 0; i < args.length; i++) {
      const argName = argNames[i] || `arg${i}`;
      params[argName] = args[i].toString();
    }

    // Generate description based on known methods
    let description = `${fullMethod}`;

    if (fullMethod === 'balances.transfer' || fullMethod === 'balances.transferKeepAlive') {
      const dest = params.dest || params.to || '';
      const value = params.value || '';
      const formattedValue = formatNativeAmount(value);
      description = `Sending ${formattedValue} REEF to ${shortenAddress(dest)}`;
    } else if (fullMethod === 'evmAccounts.claimDefaultAccount') {
      description = 'Claiming default EVM address';
    } else if (fullMethod === 'evm.call') {
      // EVM call through substrate — try to decode the inner data
      const target = params.target || '';
      const input = params.input || '';
      const evmDecoded = tryDecodeEvmCall(input, target);
      if (evmDecoded) {
        return evmDecoded;
      }
      description = `EVM call to ${shortenAddress(target)}`;
    }

    return {
      description,
      methodName: fullMethod,
      params,
      type: 'native',
    };
  } catch {
    return null;
  }
}

/** Format native REEF amount (planck to REEF) */
function formatNativeAmount(planckStr: string): string {
  try {
    const bn = ethers.BigNumber.from(planckStr);
    return formatAmount(bn, 18);
  } catch {
    return planckStr;
  }
}

// ----- Public API -----

/**
 * Decode a SignerPayloadJSON into a human-readable transaction description.
 */
export function decodeTransaction(
  payload: SignerPayloadJSON,
): DecodedTransaction {
  try {
    const nativeDecoded = tryDecodeNativeCall(payload.method);
    if (nativeDecoded) return nativeDecoded;
  } catch {
    // Fall through
  }

  return {
    description: `Transaction on ${shortenAddress(payload.address)}`,
    methodName: 'unknown',
    params: {
      method: payload.method?.slice(0, 20) + '...',
    },
    type: 'unknown',
  };
}

/**
 * Decode raw bytes payload for message signing.
 */
export function decodeRawMessage(data: string): DecodedTransaction {
  let displayData = data;
  if (data.startsWith('0x')) {
    // Try to decode as UTF-8
    try {
      displayData = ethers.utils.toUtf8String(data);
    } catch {
      displayData = data.length > 66
        ? `${data.slice(0, 34)}...${data.slice(-32)}`
        : data;
    }
  }

  return {
    description: 'Sign message',
    methodName: 'signRaw',
    params: {
      message: displayData,
    },
    type: 'raw',
  };
}

/**
 * Extract metadata from a SignerPayloadJSON for display.
 */
export function extractTxMetadata(
  payload: SignerPayloadJSON,
): TxDecodedData {
  const genesisHash = payload.genesisHash;

  // Determine chain name from genesis hash
  let chainName: string | undefined;
  if (
    genesisHash ===
    '0x7834781d38e4798d548e34ec947d19deea29df148a7bf32484b7b24dacf8d4b7'
  ) {
    chainName = 'Reef Mainnet';
  } else if (
    genesisHash ===
    '0xb414a8602b2251fa538d38a9322391500bd0324bc7ac6048845f6f31f1e1b948'
  ) {
    chainName = 'Reef Testnet';
  }

  return {
    chainName,
    genesisHash: chainName ? undefined : genesisHash,
    specVersion: hexToDecimal(payload.specVersion),
    nonce: hexToDecimal(payload.nonce),
    tip: payload.tip ? hexToDecimal(payload.tip) : undefined,
  };
}
