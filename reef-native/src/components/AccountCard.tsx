/**
 * AccountCard — individual account display card.
 * Mirrors account_box.dart with gradient background.
 */

import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Svg, {Circle} from 'react-native-svg';
import {ReefAccount} from '../types';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';

interface AccountCardProps {
  account: ReefAccount;
  isSelected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onClaimEvm?: () => void;
  onMore?: () => void;
  showBalance?: boolean;
}

function shortenAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

function formatBalance(balance: string): string {
  const num = parseFloat(balance) / 1e18;
  if (num === 0) return '0';
  if (num < 0.001) return '< 0.001';
  return num.toLocaleString(undefined, {maximumFractionDigits: 4});
}

export default function AccountCard({
  account,
  isSelected,
  onPress,
  onLongPress,
  onClaimEvm,
  onMore,
  showBalance = true,
}: AccountCardProps) {
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';

  const dotColor = isLight ? 'rgba(73,68,87,0.5)' : 'rgba(255,255,255,0.7)';

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: isSelected ? 2 : 0,
        borderColor: isLight ? '#4e00cd' : Colors.purple,
      }}>
      <View
        style={{
          backgroundColor: isLight ? 'rgba(255,255,255,0.5)' : Colors.purpleDark,
          padding: 16,
          ...(isLight ? {borderWidth: 1, borderColor: 'rgba(203,195,218,0.15)'} : {}),
        }}>
        {/* Header: avatar + name */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
          }}>
          {/* Avatar circle */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isLight ? 'rgba(78,0,205,0.12)' : Colors.accent,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
            <Text style={{color: isLight ? '#4e00cd' : '#fff', fontWeight: '700', fontSize: 16}}>
              {account.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={{flex: 1}}>
            <Text
              style={{color: isLight ? '#2c024d' : '#fff', fontSize: 16, fontWeight: '700'}}
              numberOfLines={1}>
              {account.name}
            </Text>
            {isSelected && (
              <Text
                style={{
                  color: isLight ? 'rgba(73,68,87,0.6)' : 'rgba(255,255,255,0.6)',
                  fontSize: 11,
                  marginTop: 2,
                }}>
                Selected
              </Text>
            )}
          </View>

          {/* More button */}
          {onMore && (
            <TouchableOpacity
              onPress={e => {
                e.stopPropagation();
                onMore();
              }}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              activeOpacity={0.6}
              accessibilityLabel="More options"
              accessibilityRole="button"
              style={{
                padding: 4,
                marginRight: 8,
              }}>
              <Svg width={20} height={20} viewBox="0 0 20 20">
                <Circle cx="4" cy="10" r="2" fill={dotColor} />
                <Circle cx="10" cy="10" r="2" fill={dotColor} />
                <Circle cx="16" cy="10" r="2" fill={dotColor} />
              </Svg>
            </TouchableOpacity>
          )}

          {/* EVM status badge */}
          {account.isEvmClaimed ? (
            <View
              style={{
                backgroundColor: isLight ? '#4e00cd' : Colors.green,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
              }}>
              <Text style={{color: '#fff', fontSize: 10, fontWeight: '600'}}>
                EVM
              </Text>
            </View>
          ) : (
            <View
              style={{
                backgroundColor: isLight ? 'rgba(78,0,205,0.08)' : 'rgba(255,255,255,0.15)',
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 10,
              }}>
              <Text
                style={{
                  color: isLight ? '#494457' : 'rgba(255,255,255,0.6)',
                  fontSize: 10,
                  fontWeight: '600',
                }}>
                No EVM
              </Text>
            </View>
          )}
        </View>

        {/* Address */}
        <Text
          style={{
            color: isLight ? 'rgba(73,68,87,0.7)' : 'rgba(255,255,255,0.7)',
            fontSize: 12,
            fontFamily: 'monospace',
            marginBottom: showBalance ? 8 : 0,
          }}>
          {shortenAddress(account.address)}
        </Text>

        {/* Balance */}
        {showBalance && (
          <Text
            style={{
              color: isLight ? '#2c024d' : '#fff',
              fontSize: 20,
              fontWeight: '700',
            }}>
            {formatBalance(account.balance)} REEF
          </Text>
        )}

        {/* EVM address if bound */}
        {account.evmAddress && (
          <Text
            style={{
              color: isLight ? 'rgba(73,68,87,0.5)' : 'rgba(255,255,255,0.5)',
              fontSize: 11,
              fontFamily: 'monospace',
              marginTop: 4,
            }}>
            EVM: {shortenAddress(account.evmAddress)}
          </Text>
        )}

        {/* Claim EVM button — shown when EVM not yet bound */}
        {!account.isEvmClaimed && onClaimEvm && (
          <TouchableOpacity
            onPress={e => {
              e.stopPropagation();
              onClaimEvm();
            }}
            activeOpacity={0.7}
            style={{
              backgroundColor: isLight ? '#4e00cd' : Colors.purple,
              borderRadius: 10,
              paddingVertical: 8,
              paddingHorizontal: 16,
              alignSelf: 'flex-start',
              marginTop: 10,
            }}>
            <Text style={{color: '#fff', fontSize: 12, fontWeight: '600'}}>
              Claim EVM Address
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}
