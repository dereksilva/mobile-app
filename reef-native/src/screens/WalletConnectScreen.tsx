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

import React, {useState} from 'react';
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
import {useWalletConnectStore} from '../stores/useWalletConnectStore';
import {WCSession} from '../types';
import * as WalletConnectService from '../services/WalletConnectService';
import {Colors} from '../utils/colors';

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
  const [pairUri, setPairUri] = useState('');
  const [isPairing, setIsPairing] = useState(false);

  const handlePair = async () => {
    const uri = pairUri.trim();
    if (!uri) return;

    // Validate WalletConnect URI
    if (!uri.startsWith('wc:')) {
      Alert.alert('Error', 'Invalid WalletConnect URI. Must start with "wc:"');
      return;
    }

    setIsPairing(true);
    try {
      await WalletConnectService.pair(uri);
      setPairUri('');
      setShowPairInput(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to pair with dApp. Please try again.');
    } finally {
      setIsPairing(false);
    }
  };

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
        <TouchableOpacity onPress={onBack}>
          <Text style={{color: Colors.purple, fontSize: 16}}>← Back</Text>
        </TouchableOpacity>
        <Text style={{fontSize: 18, fontWeight: '700', color: Colors.text}}>
          WalletConnect
        </Text>
        <View style={{width: 50}} />
      </View>

      {/* Pair button */}
      <View style={{paddingHorizontal: 16, paddingBottom: 8}}>
        <TouchableOpacity
          onPress={() => setShowPairInput(!showPairInput)}
          activeOpacity={0.7}
          style={{
            backgroundColor: Colors.purple,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}>
          <Text style={{fontSize: 20}}>📱</Text>
          <Text style={{color: '#fff', fontSize: 15, fontWeight: '600'}}>
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
              <Text style={{fontSize: 40, marginBottom: 12}}>🔗</Text>
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
