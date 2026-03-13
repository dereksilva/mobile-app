/**
 * Metadata API — chain metadata retrieval.
 * Ports metadataApi.ts from reef-mobile-js.
 */

import {getApi} from './networkApi';
import type {ChainMetadata} from './types';

/**
 * Get chain metadata from the connected provider.
 */
export async function getMetadata(): Promise<ChainMetadata | null> {
  const api = getApi();
  if (!api) return null;

  const [chain, chainType, properties] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.chainType(),
    api.rpc.system.properties(),
  ]);

  return {
    chain: chain.toString(),
    chainType: chainType.toString(),
    color: '#a93185',
    genesisHash: api.genesisHash.toHex(),
    icon: 'substrate',
    metaCalls: '', // Base64 metadata loaded on demand
    specVersion: api.runtimeVersion.specVersion.toNumber(),
    ss58Format: properties.ss58Format.unwrapOr(api.registry.createType('u32', 42)).toNumber(),
    tokenDecimals: (properties.tokenDecimals.unwrapOr(api.registry.createType('Vec<u32>', [18])) as any)[0]?.toNumber() ?? 18,
    tokenSymbol: (properties.tokenSymbol.unwrapOr(api.registry.createType('Vec<Text>', ['REEF'])) as any)[0]?.toString() ?? 'REEF',
    types: {},
  };
}
