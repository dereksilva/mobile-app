/**
 * BuyScreen — purchase REEF tokens via fiat onramp.
 * Mirrors buy_page.dart from Flutter.
 *
 * Two buy options:
 * 1. Binance Connect — fiat-to-crypto with redirect to Binance checkout
 * 2. LetsExchange — crypto-to-crypto exchange
 *
 * On testnet: shows manual faucet instructions instead.
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {useTranslation} from 'react-i18next';
import {useAccountStore} from '../stores/useAccountStore';
import {useNetworkStore} from '../stores/useNetworkStore';
import {NetworkName} from '../types';
import {Colors} from '../utils/colors';
import Svg, {Path} from 'react-native-svg';

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

  // WebView mode
  if (buyMethod !== 'select' && webViewUrl) {
    return (
      <View style={{flex: 1, backgroundColor: Colors.primaryBg}}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 12,
            backgroundColor: '#fff',
            borderBottomWidth: 1,
            borderBottomColor: Colors.grey,
            gap: 12,
          }}>
          <TouchableOpacity
            onPress={() => {
              setBuyMethod('select');
              setWebViewUrl('');
            }}>
            <Text style={{color: Colors.purple, fontSize: 16}}>← Back</Text>
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: '600',
              color: Colors.text,
            }}
            numberOfLines={1}>
            LetsExchange
          </Text>
          <TouchableOpacity onPress={() => handleOpenExternal(webViewUrl)}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                stroke={Colors.textLight}
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
                backgroundColor: Colors.primaryBg,
              }}>
              <ActivityIndicator size="large" color={Colors.purple} />
            </View>
          )}
          style={{flex: 1}}
        />
      </View>
    );
  }

  // Selection view
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
