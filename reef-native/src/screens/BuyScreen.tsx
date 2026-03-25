/**
 * BuyScreen — purchase REEF tokens via fiat onramp.
 * Mirrors buy_page.dart from Flutter.
 *
 * Two buy options:
 * 1. Alchemy Pay — fiat-to-crypto with redirect to Alchemy checkout
 * 2. LetsExchange — crypto-to-crypto exchange
 *
 * On testnet: shows manual faucet instructions instead.
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {useTranslation} from 'react-i18next';
import Clipboard from '@react-native-clipboard/clipboard';
import {useAccountStore} from '../stores/useAccountStore';
import {useNetworkStore} from '../stores/useNetworkStore';
import {useThemeStore} from '../stores/useThemeStore';
import {NetworkName} from '../types';
import {Colors} from '../utils/colors';
import Svg, {
  Path,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';

interface BuyScreenProps {
  onBack: () => void;
}

type BuyMethod = 'select' | 'stealthex';

// Alchemy Pay onramp
const ALCHEMY_PAY_URL =
  'https://ramp.alchemypay.org/?appId=dkSs37G15U8I4pm2&crypto=REEF&fiat=USD&fiatAmount=433&merchantOrderNo=1754981505038&network=REEF&timestamp=1754981505053&sign=zRe2miL4QFCUuYNC6QIEKNl9F/orvf4gNSAj9xDNkVE%3D#/index';

// LetsExchange partner link
const LETSEXCHANGE_URL = 'https://letsexchange.io/?ref_id=VXHhFPuZQyBcjTfk&coin_from=USDC-erc20&coin_to=REEF';

export default function BuyScreen({onBack}: BuyScreenProps) {
  const {t} = useTranslation();
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';
  const selectedAddress = useAccountStore(s => s.selectedAddress);
  const networkName = useNetworkStore(s => s.selectedNetworkName);

  const [buyMethod, setBuyMethod] = useState<BuyMethod>('select');
  const [webViewUrl, setWebViewUrl] = useState('');

  const isTestnet = networkName === NetworkName.TESTNET;

  const handleAlchemyPay = () => {
    handleOpenExternal(ALCHEMY_PAY_URL);
  };

  const handleLetsExchange = () => {
    handleOpenExternal(LETSEXCHANGE_URL);
  };

  const handleOpenExternal = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open URL');
    });
  };

  const handleCopyAddress = () => {
    if (selectedAddress) {
      Clipboard.setString(selectedAddress);
      Alert.alert('Copied', 'Address copied to clipboard');
    }
  };

  // WebView mode
  if (buyMethod !== 'select' && webViewUrl) {
    return (
      <View style={{flex: 1, backgroundColor: isLight ? '#fff7fe' : Colors.primaryBg}}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 12,
            backgroundColor: isLight ? 'rgba(255, 247, 254, 0.7)' : Colors.cardBg,
            borderBottomWidth: 1,
            borderBottomColor: isLight ? 'rgba(78, 0, 205, 0.1)' : Colors.grey,
            gap: 12,
          }}>
          <TouchableOpacity
            onPress={() => {
              setBuyMethod('select');
              setWebViewUrl('');
            }}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                stroke={isLight ? '#2c024d' : Colors.purple}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: '600',
              color: isLight ? '#2c024d' : Colors.text,
            }}
            numberOfLines={1}>
            LetsExchange
          </Text>
          <TouchableOpacity onPress={() => handleOpenExternal(webViewUrl)}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                stroke={isLight ? '#494457' : Colors.textLight}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        <WebView
          source={{uri: webViewUrl}}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: isLight ? '#fff7fe' : Colors.primaryBg,
              }}>
              <ActivityIndicator size="large" color={isLight ? '#4e00cd' : Colors.purple} />
            </View>
          )}
          style={{flex: 1}}
        />
      </View>
    );
  }

  // ─── Light Mode: Figma "Buy Reef" design ──────────────────────────────────
  if (isLight) {
    // Truncated address display
    const displayAddress = selectedAddress
      ? selectedAddress
      : 'No account selected';

    return (
      <ScrollView
        style={{flex: 1, backgroundColor: '#fff7fe'}}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 80,
        }}>

        {/* ── Background gradient orbs ── */}
        <View style={{position: 'absolute', top: -88, right: -39, width: 300, height: 300, borderRadius: 150, opacity: 0.4, overflow: 'hidden'}}>
          <Svg style={{position: 'absolute', top: 0, left: 0}} width={300} height={300} viewBox="0 0 300 300">
            <Defs>
              <SvgLinearGradient id="buyOrb1" x1="0" y1="0" x2="300" y2="300" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#4e00cd" />
                <Stop offset="1" stopColor="#b70054" />
              </SvgLinearGradient>
            </Defs>
            <Rect width={300} height={300} rx={150} fill="url(#buyOrb1)" />
          </Svg>
        </View>
        <View style={{position: 'absolute', bottom: 88, left: -58, width: 400, height: 400, borderRadius: 200, opacity: 0.4, overflow: 'hidden'}}>
          <Svg style={{position: 'absolute', top: 0, left: 0}} width={400} height={400} viewBox="0 0 400 400">
            <Defs>
              <SvgLinearGradient id="buyOrb2" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#b70054" />
                <Stop offset="1" stopColor="#006777" />
              </SvgLinearGradient>
            </Defs>
            <Rect width={400} height={400} rx={200} fill="url(#buyOrb2)" />
          </Svg>
        </View>

        {/* ── Header: Back + Title ── */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          marginBottom: 40,
        }}>
          <TouchableOpacity
            onPress={onBack}
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
            Buy REEF
          </Text>
        </View>

        {/* ── Hero Section ── */}
        <View style={{alignItems: 'center', gap: 8, marginBottom: 40}}>
          <Text style={{
            fontSize: 36,
            fontWeight: '800',
            color: '#2c024d',
            letterSpacing: -0.9,
            textAlign: 'center',
          }}>
            Buy REEF
          </Text>
          <Text style={{
            fontSize: 16,
            fontWeight: '500',
            color: '#494457',
            textAlign: 'center',
          }}>
            Get tokens to fuel your DeFi journey
          </Text>
        </View>

        {/* ── Testnet faucet ── */}
        {isTestnet ? (
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 32,
            borderWidth: 1,
            borderColor: 'rgba(203, 195, 218, 0.1)',
            padding: 25,
            gap: 16,
            shadowColor: '#4e00cd',
            shadowOffset: {width: 0, height: 20},
            shadowOpacity: 0.05,
            shadowRadius: 40,
            elevation: 4,
          }}>
            <Text style={{
              fontSize: 10,
              fontWeight: '700',
              color: '#4e00cd',
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}>
              Testnet Faucet
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#494457',
              lineHeight: 22,
            }}>
              On testnet, you can get free REEF tokens from the faucet.
              Join the Reef Matrix chat and use the drip command:
            </Text>
            <View style={{
              backgroundColor: '#fcf0ff',
              borderRadius: 16,
              padding: 16,
            }}>
              <Text
                style={{fontSize: 14, fontFamily: 'monospace', color: '#2c024d', lineHeight: 20}}
                selectable>
                !drip {selectedAddress || '<YOUR_ADDRESS>'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleOpenExternal('https://app.element.io/#/room/#reef:matrix.org')}
              activeOpacity={0.8}
              style={{
                height: 56,
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
                  <SvgLinearGradient id="faucetBtnGrad" x1="0" y1="0" x2="0.3" y2="1">
                    <Stop offset="0" stopColor="#b70054" />
                    <Stop offset="1" stopColor="#4e00cd" />
                  </SvgLinearGradient>
                </Defs>
                <Rect x="0" y="0" width="1" height="1" fill="url(#faucetBtnGrad)" />
              </Svg>
              <Text style={{fontSize: 16, fontWeight: '700', color: '#fff', zIndex: 1}}>
                Open Reef Matrix Chat
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{gap: 16}}>
            {/* ── Address Card ── */}
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 32,
              borderWidth: 1,
              borderColor: 'rgba(203, 195, 218, 0.1)',
              paddingTop: 25,
              paddingHorizontal: 25,
              paddingBottom: 17,
              gap: 12,
              shadowColor: '#4e00cd',
              shadowOffset: {width: 0, height: 20},
              shadowOpacity: 0.05,
              shadowRadius: 40,
              elevation: 4,
              overflow: 'hidden',
            }}>
              {/* Decorative QR element in top-right */}
              <View style={{position: 'absolute', top: 0, right: 0, width: 77, height: 77, opacity: 0.15}}>
                <Svg width={77} height={77} viewBox="0 0 77 77" fill="none">
                  <Rect x={4} y={4} width={28} height={28} rx={4} stroke="#4e00cd" strokeWidth={2} />
                  <Rect x={10} y={10} width={16} height={16} rx={2} fill="#4e00cd" />
                  <Rect x={45} y={4} width={28} height={28} rx={4} stroke="#4e00cd" strokeWidth={2} />
                  <Rect x={51} y={10} width={16} height={16} rx={2} fill="#4e00cd" />
                  <Rect x={4} y={45} width={28} height={28} rx={4} stroke="#4e00cd" strokeWidth={2} />
                  <Rect x={10} y={51} width={16} height={16} rx={2} fill="#4e00cd" />
                  <Rect x={45} y={45} width={8} height={8} rx={1} fill="#4e00cd" />
                  <Rect x={57} y={45} width={8} height={8} rx={1} fill="#4e00cd" />
                  <Rect x={69} y={45} width={4} height={4} rx={1} fill="#4e00cd" />
                  <Rect x={45} y={57} width={8} height={8} rx={1} fill="#4e00cd" />
                  <Rect x={57} y={57} width={16} height={16} rx={2} fill="#4e00cd" />
                </Svg>
              </View>

              {/* Label */}
              <Text style={{
                fontSize: 10,
                fontWeight: '700',
                color: '#4e00cd',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}>
                Your Reef Address
              </Text>

              {/* Address + copy button */}
              <View style={{
                backgroundColor: '#fcf0ff',
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontFamily: 'monospace',
                    color: '#2c024d',
                    lineHeight: 20,
                    marginRight: 12,
                  }}
                  selectable
                  numberOfLines={2}>
                  {displayAddress}
                </Text>
                <TouchableOpacity
                  onPress={handleCopyAddress}
                  activeOpacity={0.7}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 9999,
                    backgroundColor: '#fff',
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: {width: 0, height: 1},
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}>
                  {/* Copy icon */}
                  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m0 0a2.625 2.625 0 015.25 0c0 .655-.286 1.243-.75 1.663"
                      stroke="#b70054"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Action Cards Grid ── */}

            {/* Buy with Card */}
            <TouchableOpacity
              onPress={handleAlchemyPay}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#fff',
                borderRadius: 32,
                borderWidth: 1,
                borderColor: 'rgba(0, 0, 0, 0)',
                padding: 25,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 20, flex: 1}}>
                {/* Icon with gradient tint background */}
                <View style={{
                  width: 56,
                  height: 56,
                  borderRadius: 9999,
                  overflow: 'hidden',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Svg style={{position: 'absolute'}} width={56} height={56} viewBox="0 0 56 56">
                    <Defs>
                      <SvgLinearGradient id="cardIconBg" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                        <Stop offset="0" stopColor="#b70054" stopOpacity={0.1} />
                        <Stop offset="1" stopColor="#4e00cd" stopOpacity={0.1} />
                      </SvgLinearGradient>
                    </Defs>
                    <Rect width={56} height={56} rx={28} fill="url(#cardIconBg)" />
                  </Svg>
                  {/* Credit card icon */}
                  <Svg width={25} height={20} viewBox="0 0 24 20" fill="none" style={{zIndex: 1}}>
                    <Path
                      d="M2.25 4.25h19.5M2.25 5h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V2.75A2.25 2.25 0 0019.5.5h-15A2.25 2.25 0 002.25 2.75v10.5A2.25 2.25 0 004.5 15.5z"
                      stroke="#4e00cd"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                {/* Text */}
                <View style={{flex: 1}}>
                  <Text style={{fontSize: 18, fontWeight: '700', color: '#2c024d', lineHeight: 28}}>
                    Buy with Card
                  </Text>
                  <Text style={{fontSize: 14, color: '#494457', lineHeight: 20}}>
                    Visa, Mastercard, or Apple{'\n'}Pay
                  </Text>
                </View>
              </View>
              {/* Chevron right */}
              <Svg width={8} height={12} viewBox="0 0 8 14" fill="none">
                <Path d="M1 1l6 6-6 6" stroke="#cbc3da" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>

            {/* Swap from Crypto */}
            <TouchableOpacity
              onPress={handleLetsExchange}
              activeOpacity={0.8}
              style={{
                backgroundColor: '#fff',
                borderRadius: 32,
                borderWidth: 1,
                borderColor: 'rgba(0, 0, 0, 0)',
                padding: 25,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 20, flex: 1}}>
                {/* Icon with teal-to-purple gradient tint */}
                <View style={{
                  width: 56,
                  height: 56,
                  borderRadius: 9999,
                  overflow: 'hidden',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Svg style={{position: 'absolute'}} width={56} height={56} viewBox="0 0 56 56">
                    <Defs>
                      <SvgLinearGradient id="swapIconBg" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                        <Stop offset="0" stopColor="#004d5a" stopOpacity={0.1} />
                        <Stop offset="1" stopColor="#4e00cd" stopOpacity={0.1} />
                      </SvgLinearGradient>
                    </Defs>
                    <Rect width={56} height={56} rx={28} fill="url(#swapIconBg)" />
                  </Svg>
                  {/* Swap arrows icon */}
                  <Svg width={25} height={19} viewBox="0 0 24 18" fill="none" style={{zIndex: 1}}>
                    <Path
                      d="M7.5 18L3 13.5m0 0L7.5 9M3 13.5h13.5m0-13.5L21 4.5m0 0L16.5 9M21 4.5H7.5"
                      stroke="#4e00cd"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                {/* Text */}
                <View style={{flex: 1}}>
                  <Text style={{fontSize: 18, fontWeight: '700', color: '#2c024d', lineHeight: 28}}>
                    Swap from Crypto
                  </Text>
                  <Text style={{fontSize: 14, color: '#494457', lineHeight: 20}}>
                    Exchange BTC, ETH, or DOT{'\n'}for REEF
                  </Text>
                </View>
              </View>
              {/* Chevron right */}
              <Svg width={8} height={12} viewBox="0 0 8 14" fill="none">
                <Path d="M1 1l6 6-6 6" stroke="#cbc3da" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  }

  // ─── Dark Mode (existing design) ────────────────────────────────────────────
  return (
    <View style={{flex: 1, backgroundColor: Colors.primaryBg}}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          gap: 12,
        }}>
        <TouchableOpacity onPress={onBack}>
          <Text style={{color: Colors.purple, fontSize: 16}}>← Back</Text>
        </TouchableOpacity>
        <Text style={{flex: 1, fontSize: 18, fontWeight: '700', color: Colors.text}}>
          Buy REEF
        </Text>
      </View>

      <ScrollView contentContainerStyle={{padding: 16}}>
        {/* Testnet faucet */}
        {isTestnet ? (
          <View
            style={{
              backgroundColor: Colors.cardBg,
              borderRadius: 20,
              padding: 20,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 2},
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: Colors.text,
                marginBottom: 12,
              }}>
              Testnet Faucet
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: Colors.textLight,
                lineHeight: 22,
                marginBottom: 16,
              }}>
              On testnet, you can get free REEF tokens from the faucet.
              Join the Reef Matrix chat and use the drip command:
            </Text>

            {/* Drip command */}
            <View
              style={{
                backgroundColor: Colors.primaryBg,
                borderRadius: 10,
                padding: 14,
                marginBottom: 16,
              }}>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: 'monospace',
                  color: Colors.text,
                }}
                selectable>
                !drip {selectedAddress || '<YOUR_ADDRESS>'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                handleOpenExternal(
                  'https://app.element.io/#/room/#reef:matrix.org',
                )
              }
              activeOpacity={0.7}
              style={{
                backgroundColor: Colors.accent,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}>
              <Text style={{color: '#fff', fontSize: 15, fontWeight: '600'}}>
                Open Reef Matrix Chat
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Wallet address */}
            <View
              style={{
                backgroundColor: Colors.cardBg,
                borderRadius: 20,
                padding: 16,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: Colors.textLight,
                  letterSpacing: 0.5,
                  marginBottom: 8,
                }}>
                YOUR REEF ADDRESS
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: 'monospace',
                  color: Colors.text,
                }}
                selectable
                numberOfLines={1}>
                {selectedAddress || 'No account selected'}
              </Text>
            </View>

            {/* Alchemy Pay */}
            <TouchableOpacity
              onPress={handleAlchemyPay}
              activeOpacity={0.7}
              style={{
                backgroundColor: Colors.cardBg,
                borderRadius: 20,
                padding: 20,
                marginBottom: 12,
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                <View style={{marginRight: 12}}>
                  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z"
                      stroke={Colors.purple}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <View style={{flex: 1}}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: Colors.text,
                    }}>
                    Buy with Card
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: Colors.textLight,
                      marginTop: 2,
                    }}>
                    via Alchemy
                  </Text>
                </View>
                <Text style={{fontSize: 16, color: Colors.textLight}}>›</Text>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textLight,
                  lineHeight: 20,
                }}>
                Purchase REEF tokens directly with credit/debit card through
                Alchemy Pay's secure checkout.
              </Text>
            </TouchableOpacity>

            {/* LetsExchange */}
            <TouchableOpacity
              onPress={handleLetsExchange}
              activeOpacity={0.7}
              style={{
                backgroundColor: Colors.cardBg,
                borderRadius: 20,
                padding: 20,
                marginBottom: 12,
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                <View style={{marginRight: 12}}>
                  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                      stroke={Colors.purple}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <View style={{flex: 1}}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: Colors.text,
                    }}>
                    Swap from Crypto
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: Colors.textLight,
                      marginTop: 2,
                    }}>
                    via LetsExchange
                  </Text>
                </View>
                <Text style={{fontSize: 16, color: Colors.textLight}}>›</Text>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textLight,
                  lineHeight: 20,
                }}>
                Exchange BTC, ETH, or 700+ other cryptocurrencies for REEF
                without registration.
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}
