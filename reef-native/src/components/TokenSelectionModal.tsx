/**
 * TokenSelectionModal — searchable list of user's ERC20 tokens.
 * Used in Send and Swap flows for picking a token.
 * Mirrors token_selection_modals.dart from Flutter.
 */

import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {TokenBalance} from '../types';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';

interface TokenSelectionModalProps {
  visible: boolean;
  tokens: TokenBalance[];
  /** Token address to exclude from list (e.g., currently selected) */
  excludeAddress?: string;
  onSelect: (token: TokenBalance) => void;
  onClose: () => void;
}

/** Shorten address for display */
function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Format balance for display */
function formatBalance(balance: string, decimals: number): string {
  try {
    const num = parseFloat(balance) / Math.pow(10, decimals);
    if (num === 0) return '0';
    if (num < 0.0001) return '<0.0001';
    return num.toLocaleString(undefined, {maximumFractionDigits: 4});
  } catch {
    return balance;
  }
}

function TokenRow({
  token,
  onPress,
  isLight,
}: {
  token: TokenBalance;
  onPress: () => void;
  isLight: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: isLight ? 'rgba(255,255,255,0.5)' : Colors.cardBg,
        borderRadius: 12,
        marginBottom: 6,
      }}>
      {/* Token icon placeholder */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: Colors.purple + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}>
        <Text style={{fontSize: 16, fontWeight: '700', color: Colors.purple}}>
          {token.symbol.charAt(0)}
        </Text>
      </View>

      {/* Token info */}
      <View style={{flex: 1}}>
        <Text
          style={{fontSize: 15, fontWeight: '600', color: isLight ? '#2c024d' : Colors.text}}
          numberOfLines={1}>
          {token.name}
        </Text>
        <Text style={{fontSize: 12, color: isLight ? '#494457' : Colors.textLight, marginTop: 2}}>
          {token.symbol} · {shortenAddress(token.address)}
        </Text>
      </View>

      {/* Balance */}
      <Text style={{fontSize: 14, fontWeight: '600', color: isLight ? '#2c024d' : Colors.text}}>
        {formatBalance(token.balance, token.decimals)}
      </Text>
    </TouchableOpacity>
  );
}

export default function TokenSelectionModal({
  visible,
  tokens,
  excludeAddress,
  onSelect,
  onClose,
}: TokenSelectionModalProps) {
  const {t} = useTranslation();
  const [search, setSearch] = useState('');
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';

  const filteredTokens = useMemo(() => {
    let filtered = tokens;

    // Exclude specified token
    if (excludeAddress) {
      filtered = filtered.filter(
        tk => tk.address.toLowerCase() !== excludeAddress.toLowerCase(),
      );
    }

    // Apply search filter
    if (search.trim()) {
      const query = search.trim().toLowerCase();
      filtered = filtered.filter(
        tk =>
          tk.name.toLowerCase().includes(query) ||
          tk.symbol.toLowerCase().includes(query) ||
          tk.address.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [tokens, excludeAddress, search]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={{flex: 1, backgroundColor: isLight ? '#fff7fe' : Colors.primaryBg}}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            paddingBottom: 12,
          }}>
          <Text style={{fontSize: 20, fontWeight: '700', color: isLight ? '#2c024d' : Colors.text}}>
            {t('select')} {t('tokens')}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{color: isLight ? '#494457' : Colors.textLight, fontSize: 16}}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search input */}
        <View style={{paddingHorizontal: 20, paddingBottom: 12}}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, symbol or address..."
            placeholderTextColor={isLight ? '#cbc3da' : Colors.textLight}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: isLight ? '#fff' : Colors.cardBg,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 15,
              color: isLight ? '#2c024d' : Colors.text,
              borderWidth: 1,
              borderColor: isLight ? 'rgba(203,195,218,0.3)' : Colors.grey,
            }}
          />
        </View>

        {/* Token list */}
        <FlatList
          data={filteredTokens}
          keyExtractor={item => item.address}
          renderItem={({item}) => (
            <TokenRow
              token={item}
              isLight={isLight}
              onPress={() => {
                onSelect(item);
                setSearch('');
              }}
            />
          )}
          ListEmptyComponent={
            <View
              style={{
                padding: 40,
                alignItems: 'center',
              }}>
              <Text style={{color: isLight ? '#494457' : Colors.textLight, fontSize: 14}}>
                {t('no_token_selected')}
              </Text>
            </View>
          }
          contentContainerStyle={{paddingHorizontal: 8}}
        />
      </View>
    </Modal>
  );
}
