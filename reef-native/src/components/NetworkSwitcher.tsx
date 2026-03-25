/**
 * NetworkSwitcher — toggle between mainnet and testnet.
 * Mirrors switch_network.dart from Flutter.
 *
 * Shows a pill-style toggle with lock protection.
 * Network switch is blocked when isLocked is true (e.g., during active tx).
 */

import React from 'react';
import {View, Text, TouchableOpacity, Alert} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useNetworkStore} from '../stores/useNetworkStore';
import {NetworkName} from '../types';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';

export default function NetworkSwitcher() {
  const {t} = useTranslation();
  const selectedNetwork = useNetworkStore(s => s.selectedNetworkName);
  const isLocked = useNetworkStore(s => s.isLocked);
  const isSwitching = useNetworkStore(s => s.isSwitching);
  const setNetwork = useNetworkStore(s => s.setNetwork);
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';

  const handleSwitch = (network: NetworkName) => {
    if (network === selectedNetwork) return;
    if (isLocked) {
      Alert.alert(
        t('switch_network'),
        t('waiting_for_tx_to_complete'),
      );
      return;
    }
    setNetwork(network);
  };

  return (
    <View>
      {/* Network toggle pills */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: isLight ? 'rgba(255,255,255,0.5)' : Colors.primaryBg,
          borderRadius: 12,
          padding: 4,
        }}>
        <TouchableOpacity
          onPress={() => handleSwitch(NetworkName.MAINNET)}
          activeOpacity={0.7}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor:
              selectedNetwork === NetworkName.MAINNET
                ? (isLight ? '#4e00cd' : Colors.purple)
                : 'transparent',
          }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color:
                selectedNetwork === NetworkName.MAINNET
                  ? '#fff'
                  : (isLight ? '#2c024d' : Colors.textLight),
            }}>
            {t('mainnet')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSwitch(NetworkName.TESTNET)}
          activeOpacity={0.7}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: 'center',
            backgroundColor:
              selectedNetwork === NetworkName.TESTNET
                ? (isLight ? '#4e00cd' : Colors.purple)
                : 'transparent',
          }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color:
                selectedNetwork === NetworkName.TESTNET
                  ? '#fff'
                  : (isLight ? '#2c024d' : Colors.textLight),
            }}>
            {t('testnet')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Switching indicator */}
      {isSwitching && (
        <Text
          style={{
            fontSize: 12,
            color: isLight ? '#494457' : Colors.textLight,
            textAlign: 'center',
            marginTop: 8,
          }}>
          {t('registering_on_network')}...
        </Text>
      )}

      {/* Lock indicator */}
      {isLocked && (
        <Text
          style={{
            fontSize: 12,
            color: Colors.error,
            textAlign: 'center',
            marginTop: 8,
          }}>
          🔒 {t('waiting_for_tx_to_complete')}
        </Text>
      )}
    </View>
  );
}
