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

export default function NetworkSwitcher() {
  const {t} = useTranslation();
  const selectedNetwork = useNetworkStore(s => s.selectedNetworkName);
  const isLocked = useNetworkStore(s => s.isLocked);
  const isSwitching = useNetworkStore(s => s.isSwitching);
  const setNetwork = useNetworkStore(s => s.setNetwork);

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
          backgroundColor: Colors.primaryBg,
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
              selectedNetwork === NetworkName.MAINNET ? Colors.purple : 'transparent',
          }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color:
                selectedNetwork === NetworkName.MAINNET ? '#fff' : Colors.textLight,
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
              selectedNetwork === NetworkName.TESTNET ? Colors.purple : 'transparent',
          }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color:
                selectedNetwork === NetworkName.TESTNET ? '#fff' : Colors.textLight,
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
            color: Colors.textLight,
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
