/**
 * WalletConnectScreen — manage dApp connections.
 * Mirrors wallet_connect_page.dart from Flutter.
 *
 * Features:
 * - Active sessions list with dApp icons, names, URLs
 * - QR code scan button for pairing new dApps
 * - Manual URI paste option
 * - Disconnect individual sessions
 * - Session expiry display
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Image,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Svg, {Path} from 'react-native-svg';
import {useWalletConnectStore} from '../stores/useWalletConnectStore';
import {WCSession} from '../types';
import * as WalletConnectService from '../services/WalletConnectService';
import {Colors} from '../utils/colors';
import QRScannerModal from '../components/QRScannerModal';

/** SVG icon helper (Heroicons outline, 24×24) */
function WCIcon({d, color = '#fff', size = 18}: {d: string; color?: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const WC_ICONS = {
  camera:
    'M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316zM16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z',
  link:
    'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-6.364-6.364L4.5 8.25a4.5 4.5 0 006.364 6.364L13.19 12.31',
  phone:
    'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18h6',
};

interface WalletConnectScreenProps {
  onBack: () => void;
}

export default function WalletConnectScreen({
  onBack,
}: WalletConnectScreenProps) {
  const {t} = useTranslation();
  const sessions = useWalletConnectStore(s => s.sessions);
  const isInitialized = useWalletConnectStore(s => s.isInitialized);

  const [showPairInput, setShowPairInput] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [pairUri, setPairUri] = useState('');
  const [isPairing, setIsPairing] = useState(false);

  const handlePairWithUri = useCallback(async (uri: string) => {
    const trimmed = uri.trim();
    if (!trimmed) return;

    if (!trimmed.startsWith('wc:')) {
      Alert.alert('Error', t('invalid_qr_walletconnect'));
      return;
    }

    setIsPairing(true);
    try {
      await WalletConnectService.pair(trimmed);
      setPairUri('');
      setShowPairInput(false);
    } catch {
      Alert.alert('Error', 'Failed to pair with dApp. Please try again.');
    } finally {
      setIsPairing(false);
    }
  }, [t]);

  const handlePair = () => handlePairWithUri(pairUri);

  const handleScanResult = useCallback((data: string) => {
    setShowScanner(false);
    handlePairWithUri(data);
  }, [handlePairWithUri]);

  const handleDisconnect = (session: WCSession) => {
    Alert.alert(
      'Disconnect',
      `Disconnect from ${session.peerMeta.name}?`,
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('yes'),
          style: 'destructive',
          onPress: () => WalletConnectService.disconnectSession(session.topic),
        },
      ],
    );
  };

  return (
    <View style={{flex: 1, backgroundColor: Colors.primaryBg}}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 16,
          paddingBottom: 8,
        }}>
        <TouchableOpacity onPress={onBack} style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
          <WCIcon d="M15.75 19.5L8.25 12l7.5-7.5" color={Colors.purple} size={16} />
          <Text style={{color: Colors.purple, fontSize: 16}}>Back</Text>
        </TouchableOpacity>
        <Text style={{fontSize: 18, fontWeight: '700', color: Colors.text}}>
          WalletConnect
        </Text>
        <View style={{width: 50}} />
      </View>

      {/* Pair buttons */}
      <View style={{paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', gap: 8}}>
        <TouchableOpacity
          onPress={() => setShowScanner(true)}
          activeOpacity={0.7}
          style={{
            backgroundColor: Colors.purpleDark,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
          }}>
          <WCIcon d={WC_ICONS.camera} />
          <Text style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
            {t('scan_qr')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowPairInput(!showPairInput)}
          activeOpacity={0.7}
          style={{
            flex: 1,
            backgroundColor: Colors.purple,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}>
          <WCIcon d={WC_ICONS.phone} />
          <Text style={{color: '#fff', fontSize: 14, fontWeight: '600'}}>
            {t('create_new_connection')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pair URI input (toggle) */}
      {showPairInput && (
        <View style={{paddingHorizontal: 16, paddingBottom: 12}}>
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 14,
              padding: 16,
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
              WALLETCONNECT URI
            </Text>
            <TextInput
              value={pairUri}
              onChangeText={setPairUri}
              placeholder="wc:..."
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                backgroundColor: Colors.primaryBg,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 14,
                color: Colors.text,
                fontFamily: 'monospace',
                marginBottom: 12,
              }}
            />
            <TouchableOpacity
              onPress={handlePair}
              disabled={isPairing || !pairUri.trim()}
              activeOpacity={0.7}
              style={{
                backgroundColor:
                  isPairing || !pairUri.trim() ? Colors.grey : Colors.purple,
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
              }}>
              <Text
                style={{
                  color: isPairing || !pairUri.trim() ? Colors.textLight : '#fff',
                  fontSize: 14,
                  fontWeight: '600',
                }}>
                {isPairing ? t('connecting') : 'Connect'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Init status */}
      {!isInitialized && (
        <View style={{padding: 16, alignItems: 'center'}}>
          <Text style={{color: Colors.textLight, fontSize: 14}}>
            {t('loading')}...
          </Text>
        </View>
      )}

      {/* Sessions list */}
      <FlatList
        data={sessions}
        keyExtractor={item => item.topic}
        renderItem={({item}) => (
          <SessionCard session={item} onDisconnect={handleDisconnect} />
        )}
        ListEmptyComponent={
          isInitialized ? (
            <View style={{padding: 40, alignItems: 'center'}}>
              <View style={{marginBottom: 12}}>
                <WCIcon d={WC_ICONS.link} color={Colors.textLight} size={40} />
              </View>
              <Text
                style={{
                  color: Colors.textLight,
                  fontSize: 15,
                  textAlign: 'center',
                  lineHeight: 22,
                }}>
                {t('no_active_sessions')}
              </Text>
              <Text
                style={{
                  color: Colors.textLight,
                  fontSize: 13,
                  textAlign: 'center',
                  marginTop: 8,
                  lineHeight: 20,
                }}>
                Tap the button above to connect with a dApp using
                WalletConnect.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 20}}
      />

      {/* QR Scanner Modal */}
      <QRScannerModal
        visible={showScanner}
        hint="Scan a WalletConnect QR code"
        onScan={handleScanResult}
        onClose={() => setShowScanner(false)}
      />
    </View>
  );
}

// --- Session Card ---

interface SessionCardProps {
  session: WCSession;
  onDisconnect: (session: WCSession) => void;
}

function SessionCard({session, onDisconnect}: SessionCardProps) {
  const shortenAddress = (addr: string): string => {
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  const isMainnet = session.chainId === WalletConnectService.MAINNET_CHAIN_ID;

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.grey,
      }}>
      {/* dApp header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
        }}>
        {/* Icon */}
        {session.peerMeta.icons.length > 0 ? (
          <Image
            source={{uri: session.peerMeta.icons[0]}}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: Colors.primaryBg,
              marginRight: 12,
            }}
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: Colors.purple + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
            <Text
              style={{fontSize: 18, fontWeight: '700', color: Colors.purple}}>
              {session.peerMeta.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Name & URL */}
        <View style={{flex: 1}}>
          <Text
            style={{fontSize: 15, fontWeight: '600', color: Colors.text}}
            numberOfLines={1}>
            {session.peerMeta.name}
          </Text>
          <Text
            style={{fontSize: 12, color: Colors.textLight, marginTop: 2}}
            numberOfLines={1}>
            {session.peerMeta.url}
          </Text>
        </View>

        {/* Disconnect button */}
        <TouchableOpacity
          onPress={() => onDisconnect(session)}
          style={{padding: 8}}>
          <Text style={{fontSize: 18, color: Colors.error}}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Network badge */}
      <View style={{flexDirection: 'row', gap: 8}}>
        <View
          style={{
            backgroundColor: isMainnet
              ? Colors.green + '20'
              : Colors.purple + '20',
            borderRadius: 6,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: isMainnet ? Colors.green : Colors.purple,
            }}>
            {isMainnet ? 'Mainnet' : 'Testnet'}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: Colors.green + '20',
            borderRadius: 6,
            paddingHorizontal: 10,
            paddingVertical: 4,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: Colors.green,
            }}
          />
          <Text
            style={{fontSize: 11, fontWeight: '500', color: Colors.green}}>
            Connected
          </Text>
        </View>
      </View>
    </View>
  );
}
