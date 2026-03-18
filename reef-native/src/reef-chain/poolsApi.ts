/**
 * Pools API — fetches all ReefSwap DEX pools from the Squid GraphQL API.
 *
 * This replaces the Flutter JS bridge's poolsApi.getPools() which fetched
 * pools from the ReefSwap Squid GraphQL endpoint. The util-lib's
 * selectedPools_status$ only returns pools the user has positions in,
 * but the Pools screen needs ALL available pools for browsing.
 */

import {NetworkName} from '../types';
import {useNetworkStore} from '../stores/useNetworkStore';

const DEX_URLS: Record<string, string> = {
  mainnet: 'https://squid.subsquid.io/reef-swap/graphql',
  testnet: 'https://squid.subsquid.io/reef-swap-testnet/graphql',
};

function getDexUrl(): string {
  const network = useNetworkStore.getState().network;
  return network === NetworkName.TESTNET ? DEX_URLS.testnet : DEX_URLS.mainnet;
}

export interface DexPool {
  id: string;
  token1: string;
  token2: string;
  name1: string;
  name2: string;
  symbol1: string;
  symbol2: string;
  decimals1: number;
  decimals2: number;
  reserved1: string;
  reserved2: string;
  iconUrl1: string;
  iconUrl2: string;
  dayVolume1: string;
  dayVolume2: string;
  prevDayVolume1: string;
  prevDayVolume2: string;
  userLockedAmount1: string;
  userLockedAmount2: string;
}

const ALL_POOLS_QUERY = (
  limit: number,
  offset: number,
  search: string,
  signerAddress: string,
) => ({
  query: `
    query allPoolsList {
      allPoolsList(limit: ${limit}, offset: ${offset}, search: "${search}", signerAddress: "${signerAddress}") {
        id
        iconUrl1
        iconUrl2
        name1
        name2
        prevDayVolume1
        prevDayVolume2
        reserved1
        symbol1
        dayVolume1
        dayVolume2
        decimals1
        decimals2
        reserved2
        symbol2
        token1
        token2
        userLockedAmount1
        userLockedAmount2
      }
    }
  `,
});

/**
 * Fetch all pools from the ReefSwap DEX Squid GraphQL endpoint.
 */
export async function fetchAllPools(
  limit: number = 20,
  offset: number = 0,
  search: string = '',
  signerAddress: string = '',
): Promise<DexPool[]> {
  const url = getDexUrl();
  const body = ALL_POOLS_QUERY(limit, offset, search, signerAddress);

  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`DEX GraphQL request failed: ${response.status}`);
  }

  const {data} = await response.json();
  return data?.allPoolsList ?? [];
}
