/**
 * Contract ABIs for Reef chain interactions.
 */

/** Standard ERC20 ABI (subset used by the app) */
export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address recipient, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address sender, address recipient, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

/** ERC1155 ABI (for NFT transfers) */
export const ERC1155_ABI = [
  'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
];

/** Reefswap Router ABI (subset) */
export const REEFSWAP_ROUTER_ABI = [
  'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)',
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
];

/** Reefswap Factory ABI (subset) */
export const REEFSWAP_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) view returns (address pair)',
];

/** Reefswap Pair ABI (subset) */
export const REEFSWAP_PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
];
