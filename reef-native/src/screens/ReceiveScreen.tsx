/**
 * ReceiveScreen — display QR code for receiving tokens.
 * Mirrors show_qr_code.dart from Flutter.
 *
 * Shows:
 * - Account name and address
 * - QR code for Substrate (native) address
 * - QR code for EVM address (if claimed)
 * - Copy address buttons
 */

import React, {useState} from 'react';
import {View, Text, TouchableOpacity, ScrollView, Alert} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Clipboard from '@react-native-clipboard/clipboard';
import {useTranslation} from 'react-i18next';
import {ReefAccount} from '../types';
import {Colors} from '../utils/colors';

interface ReceiveScreenProps {
  account: ReefAccount;
  onClose: () => void;
}

type AddressType = 'native' | 'evm';

export default function ReceiveScreen({
  account,
  onClose,
}: ReceiveScreenProps) {
  const {t} = useTranslation();
  const [addressType, setAddressType] = useState<AddressType>('native');

  const currentAddress =
    addressType === 'evm' && account.evmAddress
      ? account.evmAddress
      : account.address;

  const handleCopy = () => {
    Clipboard.setString(currentAddress);
    Alert.alert(
      addressType === 'evm'
        ? t('copy_evm_address')
        : t('copy_native_address'),
      currentAddress,
    );
  };

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: Colors.primaryBg}}
      contentContainerStyle={{padding: 24, alignItems: 'center'}}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          marginBottom: 24,
        }}>
        <Text style={{fontSize: 20, fontWeight: '700', color: Colors.text}}>
          {t('scan_qr_code')}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={{color: Colors.textLight, fontSize: 16}}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Account name */}
      <Text
        style={{
          fontSize: 18,
          fontWeight: '600',
          color: Colors.text,
          marginBottom: 8,
        }}>
        {account.name}
      </Text>

      {/* Address type toggle */}
      {account.evmAddress && (
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: Colors.cardBg,
            borderRadius: 12,
            padding: 4,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: Colors.grey,
          }}>
          <TouchableOpacity
            onPress={() => setAddressType('native')}
            activeOpacity={0.7}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor:
                addressType === 'native' ? Colors.purple : 'transparent',
            }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: addressType === 'native' ? '#fff' : Colors.textLight,
              }}>
              {t('native_address_qr')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAddressType('evm')}
            activeOpacity={0.7}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor:
                addressType === 'evm' ? Colors.purple : 'transparent',
            }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: addressType === 'evm' ? '#fff' : Colors.textLight,
              }}>
              {t('evm_address_qr')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* QR Code */}
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          padding: 24,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: Colors.grey,
          alignItems: 'center',
        }}>
        <QRCode
          value={currentAddress}
          size={220}
          color={Colors.text}
          backgroundColor="#fff"
        />
      </View>

      {/* Address display */}
      <View
        style={{
          backgroundColor: Colors.cardBg,
          borderRadius: 12,
          padding: 16,
          width: '100%',
          marginBottom: 20,
          borderWidth: 1,
          borderColor: Colors.grey,
        }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: Colors.textLight,
            letterSpacing: 0.5,
            marginBottom: 8,
          }}>
          {addressType === 'evm' ? t('reef_evm') : t('address')}
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontFamily: 'monospace',
            color: Colors.text,
            lineHeight: 20,
          }}
          selectable>
          {currentAddress}
        </Text>
      </View>

      {/* Copy button */}
      <TouchableOpacity
        onPress={handleCopy}
        activeOpacity={0.7}
        style={{
          backgroundColor: Colors.purple,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 32,
          alignItems: 'center',
          width: '100%',
          marginBottom: 12,
        }}>
        <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>
          {t('copy_to_clipboard')}
        </Text>
      </TouchableOpacity>

      {/* Scan hint */}
      <Text
        style={{
          fontSize: 13,
          color: Colors.textLight,
          textAlign: 'center',
          lineHeight: 20,
          marginTop: 8,
        }}>
        {t('scan_with_reef_app')}
      </Text>

      <View style={{height: 40}} />
    </ScrollView>
  );
}
