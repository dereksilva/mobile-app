/**
 * Chain data subscription hook.
 *
 * Subscribes to @reef-chain/util-lib's RxJS observable streams and pushes
 * data into Zustand stores. This is the React Native equivalent of
 * TokensCtrl.dart from the Flutter app.
 *
 * The old Flutter app used a WebView JS bridge that subscribed to these
 * same observables and sent data back to Dart via postMessage. Here we
 * subscribe directly — no bridge needed.
 */

import {useEffect, useRef} from 'react';
import {Subscription} from 'rxjs';
import {reefState} from '@reef-chain/util-lib';
import {useTokenStore} from '../stores/useTokenStore';
import {useAccountStore} from '../stores/useAccountStore';
import {useConnectionStore} from '../stores/useConnectionStore';
import {usePoolsStore} from '../stores/usePoolsStore';
import {
  TokenBalance,
  NFT,
  Pool,
  TransactionRecord,
  createCompleteStatus,
  createLoadingStatus,
} from '../types';

/**
 * Subscribe to @reef-chain/util-lib observable streams and populate stores.
 *
 * Call this hook once in the Navigation component (or any component that
 * mounts when the app is ready and the provider is connected).
 */
export function useChainData() {
  const subscriptions = useRef<Subscription[]>([]);

  useEffect(() => {
    console.log('[useChainData] subscribing to observables');
    console.log('[useChainData] selectedPools_status$ exists:', !!reefState.selectedPools_status$);
    const subs: Subscription[] = [];

    // 1. Token balances with prices
    //    Maps util-lib's TokenWithAmount[] to our TokenBalance[] type
    subs.push(
      reefState.selectedTokenPrices$.subscribe(tokens => {
        if (!tokens) return;
        const mapped: TokenBalance[] = tokens.map((t: any) => ({
          address: t.address,
          name: t.name,
          symbol: t.symbol,
          decimals: t.decimals,
          balance: t.balance?.toString() ?? '0',
          price: t.price ?? 0,
          iconUrl: t.iconUrl ?? '',
        }));
        useTokenStore.getState().setSelectedErc20s(createCompleteStatus(mapped));
      }),
    );

    // 2. NFTs
    subs.push(
      reefState.selectedNFTs$.subscribe(nfts => {
        if (!nfts) return;
        const mapped: NFT[] = nfts.map((n: any) => ({
          contractAddress: n.address,
          nftId: n.nftId,
          name: n.name ?? '',
          iconUrl: n.iconUrl ?? '',
          balance: n.balance?.toNumber?.() ?? Number(n.balance) ?? 1,
          mimetype: n.mimetype,
        }));
        useTokenStore.getState().setSelectedNFTs(createCompleteStatus(mapped));
      }),
    );

    // 3. Transaction history
    subs.push(
      reefState.selectedTransactionHistory$.subscribe(txs => {
        if (!txs) return;
        const mapped: TransactionRecord[] = txs.map((tx: any) => ({
          hash: tx.extrinsicHash ?? tx.hash ?? '',
          type: mapTxType(tx.type),
          timestamp: tx.timestamp
            ? new Date(tx.timestamp).getTime()
            : Date.now(),
          amount: tx.amount?.toString(),
          status: 'success' as const,
          token: tx.token
            ? {
                address: tx.token.address,
                name: tx.token.name ?? '',
                symbol: tx.token.symbol ?? '',
                decimals: tx.token.decimals ?? 18,
                balance: '0',
                price: 0,
                iconUrl: tx.token.iconUrl ?? '',
              }
            : undefined,
          toAddress: tx.to,
          blockNumber: tx.blockHeight,
        }));
        useTokenStore.getState().setTxHistory(createCompleteStatus(mapped));
      }),
    );

    // 4. Selected account — update balance in account store
    subs.push(
      reefState.selectedAccount$.subscribe(account => {
        if (!account) return;
        const balance = account.balance?.toString() ?? '0';
        useAccountStore.getState().updateAccount(account.address, {
          balance,
          evmAddress: account.evmAddress,
          isEvmClaimed: account.isEvmClaimed ?? false,
        });
      }),
    );

    // 5. Provider connection state
    subs.push(
      reefState.providerConnState$.subscribe(connState => {
        if (connState === undefined || connState === null) return;
        // connState can be a boolean or an object with isConnected
        const isConnected =
          typeof connState === 'boolean'
            ? connState
            : (connState as any)?.isConnected ?? false;
        useConnectionStore.getState().setProviderConn(isConnected);
      }),
    );

    // 6. Indexer connection state
    try {
      subs.push(
        reefState.getIndexerConnState$().subscribe(indexerState => {
          if (indexerState === undefined || indexerState === null) return;
          const isConnected =
            typeof indexerState === 'boolean'
              ? indexerState
              : (indexerState as any)?.isConnected ?? false;
          useConnectionStore.getState().setIndexerConn(isConnected);
        }),
      );
    } catch {
      // getIndexerConnState$ may not be available if reefscan events
      // config wasn't provided — that's okay, indexer data will still
      // come through GraphQL polling
      console.log('[useChainData] Indexer events stream not available');
    }

    // 7. Pool data — maps util-lib's Pool[] (with StatusDataObject wrappers)
    //    to our Pool[] type for the PoolsScreen
    subs.push(
      reefState.selectedPools_status$.subscribe({
        next: (poolsStatus: any) => {
          console.log(
            '[useChainData] pools emission:',
            JSON.stringify({
              hasData: !!poolsStatus?.data,
              dataLength: poolsStatus?.data?.length,
              status: poolsStatus?.status,
            }),
          );
          if (!poolsStatus?.data) return;
          const mapped: Pool[] = poolsStatus.data
            .filter((pSdo: any) => pSdo?.data != null)
            .map((pSdo: any) => {
              const p = pSdo.data;
              return {
                address: p.poolAddress ?? '',
                token1: mapPoolToken(p.token1),
                token2: mapPoolToken(p.token2),
                reserve1: p.reserve1 ?? '0',
                reserve2: p.reserve2 ?? '0',
                totalSupply: p.totalSupply ?? '0',
                userPoolBalance: p.userPoolBalance,
              };
            });
          console.log('[useChainData] mapped pools count:', mapped.length);
          usePoolsStore.getState().setPools(createCompleteStatus(mapped));
        },
        error: (err: any) => console.error('[useChainData] pools error:', err),
      }),
    );

    subscriptions.current = subs;

    return () => {
      // Cleanup all subscriptions on unmount
      subs.forEach(sub => sub.unsubscribe());
      subscriptions.current = [];
    };
  }, []);
}

/** Map a util-lib pool token to our TokenBalance type */
function mapPoolToken(t: any): TokenBalance {
  return {
    address: t?.address ?? '',
    name: t?.name ?? '',
    symbol: t?.symbol ?? '',
    decimals: t?.decimals ?? 18,
    balance: t?.balance?.toString() ?? '0',
    price: t?.price ?? 0,
    iconUrl: t?.iconUrl ?? '',
  };
}

/** Map util-lib transaction types to our TransactionRecord type */
function mapTxType(
  type?: string,
): 'transfer' | 'swap' | 'bind' | 'approve' | 'other' {
  if (!type) return 'other';
  const lower = type.toLowerCase();
  if (lower.includes('transfer') || lower.includes('send')) return 'transfer';
  if (lower.includes('swap')) return 'swap';
  if (lower.includes('bind') || lower.includes('claim')) return 'bind';
  if (lower.includes('approv')) return 'approve';
  return 'other';
}
