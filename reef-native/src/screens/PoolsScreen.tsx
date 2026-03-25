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
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNavigation} from '@react-navigation/native';
import {Pool, TokenBalance} from '../types';
import {useTokenStore} from '../stores/useTokenStore';
import {useSwapStore} from '../stores/useSwapStore';
import {useAccountStore} from '../stores/useAccountStore';
import {fetchAllPools, DexPool} from '../reef-chain/poolsApi';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';

type SubScreen = 'list' | 'detail';

export default function PoolsScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const tokensData = useTokenStore(s => s.selectedErc20s);
  const tokens = tokensData.data ?? [];
  const setTokenFrom = useSwapStore(s => s.setTokenFrom);
  const setTokenTo = useSwapStore(s => s.setTokenTo);
  const selectedAddress = useAccountStore(s => s.selectedAddress);

  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';
  const insets = useSafeAreaInsets();

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

  // Navigate to swap with pool tokens preselected.
  // Use the user's wallet token (has real balance) when available,
  // otherwise fall back to the pool's token metadata so both
  // FROM and TO are always populated on the Swap screen.
  const handleSwapFromPool = (pool: Pool) => {
    const tk1 = tokenBalanceMap.get(pool.token1.address.toLowerCase());
    const tk2 = tokenBalanceMap.get(pool.token2.address.toLowerCase());
    setTokenFrom(tk1 ?? pool.token1);
    setTokenTo(tk2 ?? pool.token2);
    navigation.navigate('Swap');
  };

  if (subScreen === 'detail' && selectedPool) {
    return (
      <PoolDetail
        pool={selectedPool}
        onBack={() => setSubScreen('list')}
        onSwap={() => handleSwapFromPool(selectedPool)}
        hasBalance={userHasBalance(selectedPool)}
        isLight={isLight}
      />
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: isLight ? '#fff7fe' : Colors.primaryBg}}>
      {/* Header */}
      <View style={{padding: 16, paddingTop: isLight ? insets.top + 16 : 16, paddingBottom: 0}}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: isLight ? '#2c024d' : Colors.text,
            marginBottom: 16,
          }}>
          {t('pools')}
        </Text>

        {/* Search */}
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search pools..."
          placeholderTextColor={isLight ? '#cbc3da' : Colors.textLight}
          autoCapitalize="none"
          autoCorrect={false}
          style={isLight ? {
            backgroundColor: '#fff',
            borderRadius: 32,
            height: 56,
            paddingHorizontal: 24,
            fontSize: 14,
            color: '#2c024d',
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 1},
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
            marginBottom: 4,
          } : {
            backgroundColor: Colors.cardBg,
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
              color: isLight ? '#494457' : Colors.textLight,
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
            isLight={isLight}
          />
        )}
        ListEmptyComponent={
          <View style={{padding: 40, alignItems: 'center'}}>
            {loading ? (
              <>
                <ActivityIndicator size="large" color={isLight ? '#4e00cd' : Colors.purple} />
                <Text
                  style={{
                    color: isLight ? '#494457' : Colors.textLight,
                    fontSize: 14,
                    marginTop: 12,
                  }}>
                  {t('loading_pool_data')}
                </Text>
              </>
            ) : (
              <Text style={{color: isLight ? '#494457' : Colors.textLight, fontSize: 14}}>
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
  isLight: boolean;
}

function PoolCard({pool, hasBalance, onPress, onSwap, isLight}: PoolCardProps) {
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
      style={isLight ? {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(203, 195, 218, 0.15)',
        padding: 20,
        marginBottom: 10,
      } : {
        backgroundColor: Colors.cardBg,
        borderRadius: 20,
        padding: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
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
              backgroundColor: isLight ? 'rgba(78, 0, 205, 0.12)' : Colors.purple + '20',
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
              backgroundColor: isLight ? 'rgba(78, 0, 205, 0.12)' : Colors.purpleDark + '20',
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
            style={{fontSize: 15, fontWeight: '600', color: isLight ? '#2c024d' : Colors.text}}
            numberOfLines={1}>
            {pool.token1.name} – {pool.token2.name}
          </Text>
          <Text style={{fontSize: 12, color: isLight ? '#494457' : Colors.textLight, marginTop: 2}}>
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
            style={isLight ? {
              backgroundColor: '#4e00cd',
              borderRadius: 9999,
              paddingHorizontal: 14,
              paddingVertical: 8,
            } : {
              backgroundColor: Colors.accent,
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
          <Text style={isLight ? {fontSize: 12, fontWeight: '700', color: '#494457', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2} : {fontSize: 11, color: Colors.textLight, marginBottom: 2}}>
            TVL
          </Text>
          <Text style={{fontSize: 14, fontWeight: '600', color: isLight ? '#2c024d' : Colors.text}}>
            {formatValue(pool.reserve1)}
          </Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={isLight ? {fontSize: 12, fontWeight: '700', color: '#494457', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2} : {fontSize: 11, color: Colors.textLight, marginBottom: 2}}>
            {pool.token1.symbol}
          </Text>
          <Text style={{fontSize: 13, color: isLight ? '#2c024d' : Colors.text}}>
            {formatReserve(pool.reserve1, pool.token1.decimals)}
          </Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={isLight ? {fontSize: 12, fontWeight: '700', color: '#494457', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2} : {fontSize: 11, color: Colors.textLight, marginBottom: 2}}>
            {pool.token2.symbol}
          </Text>
          <Text style={{fontSize: 13, color: isLight ? '#2c024d' : Colors.text}}>
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
  isLight: boolean;
}

function PoolDetail({pool, onBack, onSwap, hasBalance, isLight}: PoolDetailProps) {
  const {t} = useTranslation();

  return (
    <View style={{flex: 1, backgroundColor: isLight ? '#fff7fe' : Colors.primaryBg, padding: 16}}>
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
              backgroundColor: isLight ? 'rgba(78, 0, 205, 0.12)' : Colors.purple + '20',
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
              backgroundColor: isLight ? 'rgba(78, 0, 205, 0.12)' : Colors.purpleDark + '20',
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
        <Text style={{fontSize: 20, fontWeight: '700', color: isLight ? '#2c024d' : Colors.text}}>
          {pool.token1.symbol}/{pool.token2.symbol}
        </Text>
        <Text style={{fontSize: 14, color: isLight ? '#494457' : Colors.textLight, marginTop: 4}}>
          {pool.token1.name} – {pool.token2.name}
        </Text>
      </View>

      {/* Reserves card */}
      <View
        style={isLight ? {
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: 'rgba(203, 195, 218, 0.15)',
          padding: 20,
          marginBottom: 16,
        } : {
          backgroundColor: Colors.cardBg,
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }}>
        <Text
          style={isLight ? {
            fontSize: 12,
            fontWeight: '700',
            color: '#494457',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginBottom: 16,
          } : {
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
          isLight={isLight}
        />
        <DetailRow
          label={pool.token2.symbol}
          value={formatReserve(pool.reserve2, pool.token2.decimals)}
          isLight={isLight}
        />
        {pool.totalSupply && (
          <DetailRow
            label="LP Supply"
            value={formatReserve(pool.totalSupply, 18)}
            isLight={isLight}
          />
        )}
        {pool.userPoolBalance && parseFloat(pool.userPoolBalance) > 0 && (
          <DetailRow
            label="Your LP"
            value={formatReserve(pool.userPoolBalance, 18)}
            isLight={isLight}
          />
        )}
      </View>

      {/* Contract address */}
      <View
        style={isLight ? {
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: 'rgba(203, 195, 218, 0.15)',
          padding: 16,
          marginBottom: 20,
        } : {
          backgroundColor: Colors.cardBg,
          borderRadius: 20,
          padding: 16,
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }}>
        <Text
          style={isLight ? {
            fontSize: 12,
            fontWeight: '700',
            color: '#494457',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginBottom: 8,
          } : {
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
            color: isLight ? '#2c024d' : Colors.text,
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
          style={isLight ? {
            backgroundColor: '#4e00cd',
            borderRadius: 9999,
            paddingVertical: 16,
            alignItems: 'center',
          } : {
            backgroundColor: Colors.accent,
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

function DetailRow({label, value, isLight}: {label: string; value: string; isLight: boolean}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: isLight ? 'rgba(203, 195, 218, 0.15)' : Colors.grey,
      }}>
      <Text style={{fontSize: 14, color: isLight ? '#494457' : Colors.textLight}}>{label}</Text>
      <Text style={{fontSize: 14, fontWeight: '600', color: isLight ? '#2c024d' : Colors.text}}>
        {value}
      </Text>
    </View>
  );
}
