/**
 * PoolsScreen — browse token pools with search.
 * Mirrors pools_page.dart from Flutter.
 *
 * Features:
 * - Pool list with token pair icons, names, TVL, volume
 * - Search by token name, symbol, or address
 * - Swap button on pools where user has balance
 * - Inline pool detail view
 */

import React, {useState, useMemo, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Pool, TokenBalance} from '../types';
import {useTokenStore} from '../stores/useTokenStore';
import {useSwapStore} from '../stores/useSwapStore';
import {useAccountStore} from '../stores/useAccountStore';
import {fetchAllPools, DexPool} from '../reef-chain/poolsApi';
import {Colors} from '../utils/colors';

type SubScreen = 'list' | 'detail';

export default function PoolsScreen() {
  const {t} = useTranslation();
  const tokensData = useTokenStore(s => s.selectedErc20s);
  const tokens = tokensData.data ?? [];
  const setTokenFrom = useSwapStore(s => s.setTokenFrom);
  const setTokenTo = useSwapStore(s => s.setTokenTo);
  const selectedAddress = useAccountStore(s => s.selectedAddress);

  const [dexPools, setDexPools] = useState<DexPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [subScreen, setSubScreen] = useState<SubScreen>('list');
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);

  // Debounce search for API calls
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch pools from DEX GraphQL API
  const loadPools = useCallback(async () => {
    try {
      setLoading(true);
      const pools = await fetchAllPools(
        50,
        0,
        searchDebounced,
        selectedAddress ?? '',
      );
      setDexPools(pools);
    } catch (err) {
      console.error('[PoolsScreen] Failed to fetch pools:', err);
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, selectedAddress]);

  useEffect(() => {
    loadPools();
  }, [loadPools]);

  // Map DexPool to our Pool type for rendering
  const pools: Pool[] = useMemo(
    () =>
      dexPools.map(dp => ({
        address: dp.id,
        token1: {
          address: dp.token1,
          name: dp.name1,
          symbol: dp.symbol1,
          decimals: dp.decimals1,
          balance: dp.userLockedAmount1 ?? '0',
          price: 0,
          iconUrl: dp.iconUrl1 ?? '',
        },
        token2: {
          address: dp.token2,
          name: dp.name2,
          symbol: dp.symbol2,
          decimals: dp.decimals2,
          balance: dp.userLockedAmount2 ?? '0',
          price: 0,
          iconUrl: dp.iconUrl2 ?? '',
        },
        reserve1: dp.reserved1 ?? '0',
        reserve2: dp.reserved2 ?? '0',
        totalSupply: '0',
        dayVolume1: dp.dayVolume1,
        dayVolume2: dp.dayVolume2,
      })),
    [dexPools],
  );

  // Map token addresses to balance for quick lookup
  const tokenBalanceMap = useMemo(() => {
    const map = new Map<string, TokenBalance>();
    for (const tk of tokens) {
      map.set(tk.address.toLowerCase(), tk);
    }
    return map;
  }, [tokens]);

  // Check if user has balance in either token of a pool
  const userHasBalance = (pool: Pool): boolean => {
    const tk1 = tokenBalanceMap.get(pool.token1.address.toLowerCase());
    const tk2 = tokenBalanceMap.get(pool.token2.address.toLowerCase());
    return (
      (!!tk1 && parseFloat(tk1.balance) > 0) ||
      (!!tk2 && parseFloat(tk2.balance) > 0)
    );
  };

  // Navigate to swap with pool tokens preselected
  const handleSwapFromPool = (pool: Pool) => {
    const tk1 = tokenBalanceMap.get(pool.token1.address.toLowerCase());
    const tk2 = tokenBalanceMap.get(pool.token2.address.toLowerCase());
    if (tk1) setTokenFrom(tk1);
    if (tk2) setTokenTo(tk2);
    // Note: actual navigation to swap tab would be handled by parent navigator
  };

  if (subScreen === 'detail' && selectedPool) {
    return (
      <PoolDetail
        pool={selectedPool}
        onBack={() => setSubScreen('list')}
        onSwap={() => handleSwapFromPool(selectedPool)}
        hasBalance={userHasBalance(selectedPool)}
      />
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: Colors.primaryBg}}>
      {/* Header */}
      <View style={{padding: 16, paddingBottom: 0}}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: Colors.text,
            marginBottom: 16,
          }}>
          {t('pools')}
        </Text>

        {/* Search */}
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search pools..."
          placeholderTextColor={Colors.textLight}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 15,
            color: Colors.text,
            borderWidth: 1,
            borderColor: Colors.grey,
            marginBottom: 4,
          }}
        />

        {/* Result count */}
        {search.trim() ? (
          <Text
            style={{
              fontSize: 12,
              color: Colors.textLight,
              marginBottom: 8,
              marginLeft: 4,
            }}>
            {pools.length} pool{pools.length !== 1 ? 's' : ''}{' '}
            found
          </Text>
        ) : (
          <View style={{height: 8}} />
        )}
      </View>

      {/* Pool list */}
      <FlatList
        data={pools}
        keyExtractor={item => item.address}
        renderItem={({item}) => (
          <PoolCard
            pool={item}
            hasBalance={userHasBalance(item)}
            onPress={() => {
              setSelectedPool(item);
              setSubScreen('detail');
            }}
            onSwap={() => handleSwapFromPool(item)}
          />
        )}
        ListEmptyComponent={
          <View style={{padding: 40, alignItems: 'center'}}>
            {loading ? (
              <>
                <ActivityIndicator size="large" color={Colors.purple} />
                <Text
                  style={{
                    color: Colors.textLight,
                    fontSize: 14,
                    marginTop: 12,
                  }}>
                  {t('loading_pool_data')}
                </Text>
              </>
            ) : (
              <Text style={{color: Colors.textLight, fontSize: 14}}>
                {t('no_pool_data')}
              </Text>
            )}
          </View>
        }
        contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 20}}
      />
    </View>
  );
}

// --- Pool Card ---

interface PoolCardProps {
  pool: Pool;
  hasBalance: boolean;
  onPress: () => void;
  onSwap: () => void;
}

function PoolCard({pool, hasBalance, onPress, onSwap}: PoolCardProps) {
  const formatValue = (val: string): string => {
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.grey,
      }}>
      {/* Token pair header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
        }}>
        {/* Overlapping token icons */}
        <View style={{flexDirection: 'row', marginRight: 12}}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: Colors.purple + '20',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
            }}>
            <Text
              style={{fontSize: 14, fontWeight: '700', color: Colors.purple}}>
              {pool.token1.symbol.charAt(0)}
            </Text>
          </View>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: Colors.purpleDark + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: -12,
            }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: Colors.purpleDark,
              }}>
              {pool.token2.symbol.charAt(0)}
            </Text>
          </View>
        </View>

        {/* Pool names */}
        <View style={{flex: 1}}>
          <Text
            style={{fontSize: 15, fontWeight: '600', color: Colors.text}}
            numberOfLines={1}>
            {pool.token1.name} – {pool.token2.name}
          </Text>
          <Text style={{fontSize: 12, color: Colors.textLight, marginTop: 2}}>
            {pool.token1.symbol}/{pool.token2.symbol}
          </Text>
        </View>

        {/* Swap button */}
        {hasBalance && (
          <TouchableOpacity
            onPress={e => {
              e.stopPropagation?.();
              onSwap();
            }}
            activeOpacity={0.7}
            style={{
              backgroundColor: Colors.purple,
              borderRadius: 8,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}>
            <Text style={{color: '#fff', fontSize: 12, fontWeight: '600'}}>
              Swap
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats row */}
      <View style={{flexDirection: 'row', gap: 16}}>
        <View style={{flex: 1}}>
          <Text style={{fontSize: 11, color: Colors.textLight, marginBottom: 2}}>
            TVL
          </Text>
          <Text style={{fontSize: 14, fontWeight: '600', color: Colors.text}}>
            {formatValue(pool.reserve1)}
          </Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={{fontSize: 11, color: Colors.textLight, marginBottom: 2}}>
            {pool.token1.symbol}
          </Text>
          <Text style={{fontSize: 13, color: Colors.text}}>
            {formatReserve(pool.reserve1, pool.token1.decimals)}
          </Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={{fontSize: 11, color: Colors.textLight, marginBottom: 2}}>
            {pool.token2.symbol}
          </Text>
          <Text style={{fontSize: 13, color: Colors.text}}>
            {formatReserve(pool.reserve2, pool.token2.decimals)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatReserve(reserve: string, decimals: number): string {
  try {
    const num = parseFloat(reserve) / Math.pow(10, decimals);
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    return num.toLocaleString(undefined, {maximumFractionDigits: 2});
  } catch {
    return reserve;
  }
}

// --- Pool Detail ---

interface PoolDetailProps {
  pool: Pool;
  onBack: () => void;
  onSwap: () => void;
  hasBalance: boolean;
}

function PoolDetail({pool, onBack, onSwap, hasBalance}: PoolDetailProps) {
  const {t} = useTranslation();

  return (
    <View style={{flex: 1, backgroundColor: Colors.primaryBg, padding: 16}}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}>
        <TouchableOpacity onPress={onBack}>
          <Text style={{color: Colors.purple, fontSize: 16}}>← Back</Text>
        </TouchableOpacity>
      </View>

      {/* Pool title */}
      <View style={{alignItems: 'center', marginBottom: 24}}>
        {/* Overlapping icons */}
        <View
          style={{flexDirection: 'row', marginBottom: 12}}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: Colors.purple + '20',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
            }}>
            <Text
              style={{fontSize: 22, fontWeight: '700', color: Colors.purple}}>
              {pool.token1.symbol.charAt(0)}
            </Text>
          </View>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: Colors.purpleDark + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginLeft: -16,
            }}>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: Colors.purpleDark,
              }}>
              {pool.token2.symbol.charAt(0)}
            </Text>
          </View>
        </View>
        <Text style={{fontSize: 20, fontWeight: '700', color: Colors.text}}>
          {pool.token1.symbol}/{pool.token2.symbol}
        </Text>
        <Text style={{fontSize: 14, color: Colors.textLight, marginTop: 4}}>
          {pool.token1.name} – {pool.token2.name}
        </Text>
      </View>

      {/* Reserves card */}
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 14,
          padding: 20,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: Colors.grey,
        }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: Colors.textLight,
            letterSpacing: 0.5,
            marginBottom: 16,
          }}>
          POOL RESERVES
        </Text>

        <DetailRow
          label={pool.token1.symbol}
          value={formatReserve(pool.reserve1, pool.token1.decimals)}
        />
        <DetailRow
          label={pool.token2.symbol}
          value={formatReserve(pool.reserve2, pool.token2.decimals)}
        />
        {pool.totalSupply && (
          <DetailRow
            label="LP Supply"
            value={formatReserve(pool.totalSupply, 18)}
          />
        )}
        {pool.userPoolBalance && parseFloat(pool.userPoolBalance) > 0 && (
          <DetailRow
            label="Your LP"
            value={formatReserve(pool.userPoolBalance, 18)}
          />
        )}
      </View>

      {/* Contract address */}
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 14,
          padding: 16,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: Colors.grey,
        }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: Colors.textLight,
            marginBottom: 8,
          }}>
          POOL ADDRESS
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontFamily: 'monospace',
            color: Colors.text,
          }}
          selectable>
          {pool.address}
        </Text>
      </View>

      {/* Swap button */}
      {hasBalance && (
        <TouchableOpacity
          onPress={onSwap}
          activeOpacity={0.7}
          style={{
            backgroundColor: Colors.purple,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
          }}>
          <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>
            {t('swap_tokens')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function DetailRow({label, value}: {label: string; value: string}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.grey,
      }}>
      <Text style={{fontSize: 14, color: Colors.textLight}}>{label}</Text>
      <Text style={{fontSize: 14, fontWeight: '600', color: Colors.text}}>
        {value}
      </Text>
    </View>
  );
}
