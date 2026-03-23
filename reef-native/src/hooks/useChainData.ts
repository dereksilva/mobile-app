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
import {getApi} from '../reef-chain/networkApi';
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
        const mapped: TransactionRecord[] = txs.map((tx: any) => {
          // Determine action type from TokenTransfer fields
          let txType: TransactionRecord['type'] = 'other';
          if (tx.reefswapAction) {
            txType = 'swap';
          } else if (tx.inbound !== undefined) {
            txType = 'transfer';
          } else {
            txType = mapTxType(tx.type);
          }

          // Extract amount — token.balance is a BigNumber
          let amount: string | undefined = tx.amount?.toString();
          if (!amount && tx.token?.balance) {
            const raw = tx.token.balance;
            const decimals = tx.token.decimals ?? 18;
            const val =
              typeof raw === 'object' && raw._isBigNumber
                ? Number(raw.toString()) / 10 ** decimals
                : typeof raw === 'string' || typeof raw === 'number'
                  ? Number(raw) / 10 ** decimals
                  : undefined;
            if (val !== undefined && !isNaN(val)) {
              amount = val % 1 === 0 ? val.toString() : val.toFixed(4);
            }
          }

          return {
            hash:
              tx.extrinsic?.hash ?? tx.extrinsicHash ?? tx.hash ?? '',
            type: txType,
            timestamp: tx.timestamp
              ? new Date(tx.timestamp).getTime()
              : Date.now(),
            amount,
            inbound: tx.inbound ?? false,
            status: tx.success === false ? ('error' as const) : ('success' as const),
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
            fromAddress: tx.from,
            blockNumber: tx.extrinsic?.blockHeight ?? tx.blockHeight,
          };
        });
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

    // 4b. All accounts — query native REEF balance for every account
    //     so non-selected accounts don't show stale '0' balances.
    const pollAllBalances = async () => {
      const api = getApi();
      if (!api) return;
      const allAccounts = useAccountStore.getState().accounts.data ?? [];
      if (allAccounts.length === 0) return;

      try {
        const addresses = allAccounts.map(a => a.address);
        const accountInfos = await api.query.system.account.multi(addresses);
        accountInfos.forEach((info: any, idx: number) => {
          const freeBalance = info.data?.free?.toString() ?? '0';
          const addr = addresses[idx];
          // Only update if the account isn't the currently selected one
          // (selectedAccount$ handles the selected account with more detail)
          const selectedAddr = useAccountStore.getState().selectedAddress;
          if (addr !== selectedAddr) {
            useAccountStore.getState().updateAccount(addr, {balance: freeBalance});
          }
        });
      } catch (err) {
        console.log('[useChainData] Failed to query all account balances:', err);
      }
    };

    // Poll all balances once immediately and then every 30 seconds
    pollAllBalances();
    const balanceInterval = setInterval(pollAllBalances, 30_000);

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
      clearInterval(balanceInterval);
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
