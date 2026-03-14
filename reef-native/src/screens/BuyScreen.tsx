/**
 * BuyScreen — purchase REEF tokens via fiat onramp.
 * Mirrors buy_page.dart from Flutter.
 *
 * Two buy options:
 * 1. Binance Connect — fiat-to-crypto with redirect to Binance checkout
 * 2. StealthEx — crypto-to-crypto exchange
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

interface BuyScreenProps {
  onBack: () => void;
}

type BuyMethod = 'select' | 'binance' | 'stealthex';

// Binance Connect proxy
const BINANCE_CONNECT_URL = 'https://www.binance.com/en/crypto/buy/REEF';

// StealthEx partner link
const STEALTHEX_URL = 'https://stealthex.io/?to=reef';

export default function BuyScreen({onBack}: BuyScreenProps) {
  const {t} = useTranslation();
  const selectedAddress = useAccountStore(s => s.selectedAddress);
  const networkName = useNetworkStore(s => s.selectedNetworkName);

  const [buyMethod, setBuyMethod] = useState<BuyMethod>('select');
  const [webViewUrl, setWebViewUrl] = useState('');

  const isTestnet = networkName === NetworkName.TESTNET;

  const handleBinance = () => {
    setBuyMethod('binance');
    setWebViewUrl(BINANCE_CONNECT_URL);
  };

  const handleStealthEx = () => {
    setBuyMethod('stealthex');
    setWebViewUrl(STEALTHEX_URL);
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
            {buyMethod === 'binance' ? 'Binance' : 'StealthEx'}
          </Text>
          <TouchableOpacity onPress={() => handleOpenExternal(webViewUrl)}>
            <Text style={{fontSize: 14}}>↗</Text>
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
              backgroundColor: '#fff',
              borderRadius: 14,
              padding: 20,
              borderWidth: 1,
              borderColor: Colors.grey,
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
                backgroundColor: Colors.purple,
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
                backgroundColor: '#fff',
                borderRadius: 14,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: Colors.grey,
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

            {/* Binance Connect */}
            <TouchableOpacity
              onPress={handleBinance}
              activeOpacity={0.7}
              style={{
                backgroundColor: '#fff',
                borderRadius: 14,
                padding: 20,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: Colors.grey,
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                <Text style={{fontSize: 28, marginRight: 12}}>💳</Text>
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
                    via Binance
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
                Binance's secure checkout.
              </Text>
            </TouchableOpacity>

            {/* StealthEx */}
            <TouchableOpacity
              onPress={handleStealthEx}
              activeOpacity={0.7}
              style={{
                backgroundColor: '#fff',
                borderRadius: 14,
                padding: 20,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: Colors.grey,
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                }}>
                <Text style={{fontSize: 28, marginRight: 12}}>🔄</Text>
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
                    via StealthEx
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
