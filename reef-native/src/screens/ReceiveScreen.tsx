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
import Svg, {
  Path,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import {ReefAccount} from '../types';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';

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
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';
  const [addressType, setAddressType] = useState<AddressType>('native');

  const currentAddress =
    addressType === 'evm' && account.evmAddress
      ? account.evmAddress
      : account.address;

  const truncatedAddress =
    currentAddress.length > 28
      ? currentAddress.slice(0, 28) + '…'
      : currentAddress;

  const handleCopy = () => {
    Clipboard.setString(currentAddress);
    Alert.alert(
      addressType === 'evm'
        ? t('copy_evm_address')
        : t('copy_native_address'),
      currentAddress,
    );
  };

  // ─── Light Mode: Figma "Receive Assets" design ───────────────────────────
  if (isLight) {
    return (
      <ScrollView
        style={{flex: 1, backgroundColor: '#fff7fe'}}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 80,
        }}>

        {/* ── Header: Back arrow ── */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          marginBottom: 32,
        }}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                stroke="#2c024d"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
          <Text style={{
            fontSize: 20,
            fontWeight: '700',
            color: '#2c024d',
            letterSpacing: -0.5,
          }}>
            Receive
          </Text>
        </View>

        {/* ── Hero Section ── */}
        <View style={{alignItems: 'center', gap: 8, marginBottom: 32}}>
          <Text style={{
            fontSize: 36,
            fontWeight: '800',
            color: '#2c024d',
            letterSpacing: -0.9,
            textAlign: 'center',
          }}>
            Receive Assets
          </Text>
          <Text style={{
            fontSize: 14,
            fontWeight: '500',
            color: '#494457',
            textAlign: 'center',
            opacity: 0.8,
          }}>
            Share your address to receive tokens
          </Text>
        </View>

        {/* ── Address Type Toggle ── */}
        {account.evmAddress && (
          <View style={{
            backgroundColor: '#fcf0ff',
            borderRadius: 9999,
            padding: 6,
            flexDirection: 'row',
            marginBottom: 32,
          }}>
            {/* Native tab */}
            <TouchableOpacity
              onPress={() => setAddressType('native')}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 9999,
                alignItems: 'center',
                overflow: 'hidden',
              }}>
              {addressType === 'native' && (
                <Svg
                  style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
                  viewBox="0 0 1 1"
                  preserveAspectRatio="none">
                  <Defs>
                    <SvgLinearGradient id="toggleGradN" x1="0" y1="0" x2="0.3" y2="1">
                      <Stop offset="0" stopColor="#b70054" />
                      <Stop offset="1" stopColor="#4e00cd" />
                    </SvgLinearGradient>
                  </Defs>
                  <Rect x="0" y="0" width="1" height="1" fill="url(#toggleGradN)" />
                </Svg>
              )}
              <Text style={{
                fontSize: 14,
                fontWeight: '700',
                color: addressType === 'native' ? '#fff' : '#494457',
                zIndex: 1,
              }}>
                Native Address QR
              </Text>
            </TouchableOpacity>

            {/* EVM tab */}
            <TouchableOpacity
              onPress={() => setAddressType('evm')}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 9999,
                alignItems: 'center',
                overflow: 'hidden',
              }}>
              {addressType === 'evm' && (
                <Svg
                  style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
                  viewBox="0 0 1 1"
                  preserveAspectRatio="none">
                  <Defs>
                    <SvgLinearGradient id="toggleGradE" x1="0" y1="0" x2="0.3" y2="1">
                      <Stop offset="0" stopColor="#b70054" />
                      <Stop offset="1" stopColor="#4e00cd" />
                    </SvgLinearGradient>
                  </Defs>
                  <Rect x="0" y="0" width="1" height="1" fill="url(#toggleGradE)" />
                </Svg>
              )}
              <Text style={{
                fontSize: 14,
                fontWeight: '700',
                color: addressType === 'evm' ? '#fff' : '#494457',
                zIndex: 1,
              }}>
                EVM Address QR
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── QR Code Glass Container ── */}
        <View style={{
          alignItems: 'center',
          marginBottom: 32,
        }}>
          {/* Outer glass card */}
          <View style={{
            width: '100%',
            maxWidth: 340,
            borderRadius: 48,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 33,
            paddingVertical: 37,
            backgroundColor: 'rgba(255, 247, 254, 0.7)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.4)',
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 25},
            shadowOpacity: 0.12,
            shadowRadius: 50,
            elevation: 12,
          }}>
            {/* Inner QR card */}
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 32,
              borderWidth: 1,
              borderColor: 'rgba(203, 195, 218, 0.2)',
              padding: 17,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <QRCode
                value={currentAddress}
                size={192}
                color="#2c024d"
                backgroundColor="#fff"
                logo={undefined}
              />
              {/* Center logo overlay */}
              <View style={{
                position: 'absolute',
                width: 48,
                height: 48,
                borderRadius: 9999,
                backgroundColor: '#fff',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 4,
                padding: 4,
              }}>
                <View style={{
                  flex: 1,
                  width: '100%',
                  borderRadius: 9999,
                  overflow: 'hidden',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Svg
                    style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
                    viewBox="0 0 1 1"
                    preserveAspectRatio="none">
                    <Defs>
                      <SvgLinearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor="#b70054" />
                        <Stop offset="1" stopColor="#4e00cd" />
                      </SvgLinearGradient>
                    </Defs>
                    <Rect x="0" y="0" width="1" height="1" fill="url(#logoGrad)" />
                  </Svg>
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '800',
                    color: '#fff',
                    zIndex: 1,
                  }}>
                    R
                  </Text>
                </View>
              </View>
            </View>

            {/* "SCAN TO SEND" label */}
            <Text style={{
              marginTop: 24,
              fontSize: 12,
              fontWeight: '700',
              color: '#4e00cd',
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}>
              Scan to send
            </Text>
          </View>
        </View>

        {/* ── Wallet Address Field ── */}
        <View style={{gap: 12, marginBottom: 32}}>
          <Text style={{
            fontSize: 10,
            fontWeight: '700',
            color: '#494457',
            letterSpacing: 1,
            textTransform: 'uppercase',
            paddingLeft: 4,
          }}>
            Your Wallet Address
          </Text>

          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: 'rgba(203, 195, 218, 0.15)',
            padding: 17,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 1},
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}>
            {/* Wallet icon */}
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              backgroundColor: 'rgba(78, 0, 205, 0.05)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h.008M21 12v7.5m0-7.5H5.625c-.621 0-1.125-.504-1.125-1.125V3.375c0-.621.504-1.125 1.125-1.125h12.75c.621 0 1.125.504 1.125 1.125v6.75M3.375 20.625a1.125 1.125 0 01-1.125-1.125V5.625m0 0A2.625 2.625 0 014.875 3H18"
                  stroke="#4e00cd"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>

            {/* Truncated address */}
            <Text
              style={{
                flex: 1,
                fontSize: 14,
                fontFamily: 'monospace',
                color: '#2c024d',
                lineHeight: 20,
              }}
              numberOfLines={1}>
              {truncatedAddress}
            </Text>

            {/* Copy button */}
            <TouchableOpacity
              onPress={handleCopy}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              activeOpacity={0.7}
              style={{padding: 8, borderRadius: 48}}>
              <Svg width={17} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75m11.25-3.375h-9a1.125 1.125 0 00-1.125 1.125V6.75m11.25-3.375v3.375M18 3.375h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-9.75A1.125 1.125 0 017.5 14.25V4.5c0-.621.504-1.125 1.125-1.125H18z"
                  stroke="#b70054"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── CTA: Copy to Clipboard ── */}
        <TouchableOpacity
          onPress={handleCopy}
          activeOpacity={0.8}
          style={{
            height: 64,
            borderRadius: 9999,
            overflow: 'hidden',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            shadowColor: '#4e00cd',
            shadowOffset: {width: 0, height: 20},
            shadowOpacity: 0.2,
            shadowRadius: 40,
            elevation: 12,
            marginBottom: 40,
          }}>
          {/* Gradient background */}
          <Svg
            style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
            viewBox="0 0 1 1"
            preserveAspectRatio="none">
            <Defs>
              <SvgLinearGradient id="copyCtaGrad" x1="0" y1="0.5" x2="1" y2="0.5">
                <Stop offset="0" stopColor="#b70054" />
                <Stop offset="1" stopColor="#4e00cd" />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width="1" height="1" fill="url(#copyCtaGrad)" />
          </Svg>
          {/* Share icon */}
          <Svg width={18} height={20} viewBox="0 0 24 24" fill="none" style={{zIndex: 1}}>
            <Path
              d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
              stroke="#fff"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={{
            fontSize: 18,
            fontWeight: '800',
            color: '#fff',
            zIndex: 1,
          }}>
            Copy to clipboard
          </Text>
        </TouchableOpacity>

        {/* ── Warning Info ── */}
        <View style={{
          backgroundColor: 'rgba(245, 226, 255, 0.5)',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.5)',
          padding: 17,
          flexDirection: 'row',
          gap: 12,
          alignItems: 'flex-start',
        }}>
          {/* Info icon */}
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" style={{marginTop: 1}}>
            <Path
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              stroke="#b70054"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={{
            flex: 1,
            fontSize: 12,
            color: '#494457',
            lineHeight: 19.5,
          }}>
            Send only Reef-compatible tokens to this address. Sending other assets may result in permanent loss.
          </Text>
        </View>

        <View style={{height: 40}} />
      </ScrollView>
    );
  }

  // ─── Dark Mode (existing design) ────────────────────────────────────────────
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
