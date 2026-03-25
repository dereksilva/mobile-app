/**
 * SigningOverlay — root-level component that intercepts the app UI
 * when a signing request arrives.
 *
 * Mirrors SignatureContentToggle.dart from Flutter.
 *
 * Architecture:
 * 1. ReefSigner pushes a SignatureRequest to useSigningStore
 * 2. SigningOverlay watches the store and renders the signing modal
 * 3. User sees transaction details, authenticates, and approves/rejects
 * 4. The Promise in the SignatureRequest is resolved/rejected
 * 5. The original transaction caller receives the signature or error
 */

import React, {useState, useEffect, useMemo} from 'react';
import {View, Text, ScrollView, TouchableOpacity, Alert, SafeAreaView} from 'react-native';
import Svg, {
  Path,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import {useTranslation} from 'react-i18next';
import {useSigningStore} from '../stores/useSigningStore';
import {useAccountStore} from '../stores/useAccountStore';
import {useThemeStore} from '../stores/useThemeStore';
import {Colors} from '../utils/colors';
import {
  decodeTransaction,
  decodeRawMessage,
  extractTxMetadata,
  type DecodedTransaction,
  type TxDecodedData,
} from '../services/TransactionDescService';
import {signPayload, signRaw} from '../reef-chain/signingApi';
import * as StorageService from '../services/StorageService';
import MethodDataDisplay from './MethodDataDisplay';
import SignatureControls from './SignatureControls';
import AccountCard from './AccountCard';

interface SigningOverlayProps {
  children: React.ReactNode;
}

function shortenAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export default function SigningOverlay({children}: SigningOverlayProps) {
  const {t} = useTranslation();
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';
  const requests = useSigningStore(s => s.requests);
  const resolveRequest = useSigningStore(s => s.resolveRequest);
  const rejectRequest = useSigningStore(s => s.rejectRequest);
  const accountsData = useAccountStore(s => s.accounts);
  const accounts = accountsData.data ?? [];

  const [isProcessing, setIsProcessing] = useState(false);

  // Get the first pending request
  const currentRequest = requests.length > 0 ? requests[0] : null;

  // Decode the request payload
  const decoded: DecodedTransaction | null = useMemo(() => {
    if (!currentRequest) return null;

    const payload = currentRequest.payload;
    if (payload.type === 'extrinsic') {
      return decodeTransaction(payload.data);
    } else if (payload.type === 'bytes') {
      return decodeRawMessage(payload.data.data || payload.data);
    }

    return {
      description: currentRequest.description || 'Sign request',
      methodName: 'unknown',
      params: {},
      type: 'unknown' as const,
    };
  }, [currentRequest]);

  // Extract metadata for extrinsic payloads
  const metadata: TxDecodedData | undefined = useMemo(() => {
    if (!currentRequest) return undefined;
    if (currentRequest.payload.type === 'extrinsic') {
      return extractTxMetadata(currentRequest.payload.data);
    }
    return undefined;
  }, [currentRequest]);

  // Find the signing account
  const signerAccount = useMemo(() => {
    if (!currentRequest) return null;
    const payloadData = currentRequest.payload.data;
    const address = payloadData?.address;
    if (!address) return null;
    return accounts.find(a => a.address === address) || null;
  }, [currentRequest, accounts]);

  const isExtrinsic = currentRequest?.payload?.type === 'extrinsic';

  // Handle approve — authenticate then sign
  const handleApprove = async (_password: string | null) => {
    if (!currentRequest) return;

    setIsProcessing(true);

    try {
      const payloadData = currentRequest.payload.data;
      const address = payloadData.address;

      // Get stored account to retrieve mnemonic
      const storedAccount = await StorageService.getAccount(address);
      if (!storedAccount?.mnemonic) {
        Alert.alert('Error', 'Account mnemonic not found. Cannot sign.');
        setIsProcessing(false);
        return;
      }

      let signature: string;

      if (isExtrinsic) {
        // Sign extrinsic payload
        signature = await signPayload(storedAccount.mnemonic, payloadData);
      } else {
        // Sign raw bytes
        const rawData = payloadData.data || payloadData;
        signature = await signRaw(storedAccount.mnemonic, rawData);
      }

      // Resolve the signing request with the signature
      resolveRequest(currentRequest.id, signature);
    } catch (err: any) {
      Alert.alert('Signing Error', err.message || 'Failed to sign');
    }

    setIsProcessing(false);
  };

  // Handle cancel/reject
  const handleCancel = () => {
    if (!currentRequest) return;
    rejectRequest(currentRequest.id, 'User rejected');
  };

  // No signing request — render children normally
  if (!currentRequest || !decoded) {
    return <>{children}</>;
  }

  // ─── Light Mode: Figma "Confirm Transaction" design ─────────────────────
  if (isLight) {
    return (
      <View style={{flex: 1}}>
        <View style={{flex: 1, opacity: 0}}>{children}</View>
        <SafeAreaView
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#fff7fe',
          }}>
          <ScrollView
            style={{flex: 1}}
            contentContainerStyle={{paddingHorizontal: 24, paddingTop: 24, paddingBottom: 80}}
            keyboardShouldPersistTaps="handled">

            {/* ── Header ── */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              marginBottom: 32,
            }}>
              <TouchableOpacity
                onPress={handleCancel}
                disabled={isProcessing}
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
                Confirm Transaction
              </Text>
            </View>

            {/* ── Account Card (glassmorphism) ── */}
            {signerAccount && (
              <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                borderRadius: 32,
                borderWidth: 1,
                borderColor: 'rgba(78, 0, 205, 0.05)',
                padding: 25,
                gap: 16,
                shadowColor: '#4e00cd',
                shadowOffset: {width: 0, height: 20},
                shadowOpacity: 0.08,
                shadowRadius: 40,
                elevation: 4,
                marginBottom: 32,
              }}>
                {/* Account header: avatar + name + EVM badge */}
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                  {/* Avatar with gradient border */}
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    overflow: 'hidden',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Svg style={{position: 'absolute'}} width={48} height={48} viewBox="0 0 48 48">
                      <Defs>
                        <SvgLinearGradient id="avatarGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                          <Stop offset="0" stopColor="#4e00cd" />
                          <Stop offset="1" stopColor="#b70054" />
                        </SvgLinearGradient>
                      </Defs>
                      <Rect width={48} height={48} rx={24} fill="url(#avatarGrad)" />
                    </Svg>
                    <View style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: '#f5e2ff',
                      justifyContent: 'center',
                      alignItems: 'center',
                      zIndex: 1,
                    }}>
                      <Text style={{fontSize: 18, fontWeight: '800', color: '#4e00cd'}}>
                        {signerAccount.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Name */}
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '800',
                    color: '#2c024d',
                  }}>
                    {signerAccount.name}
                  </Text>

                  {/* EVM badge */}
                  {signerAccount.isEvmClaimed && (
                    <View style={{
                      backgroundColor: '#4e00cd',
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}>
                      <Text style={{fontSize: 10, fontWeight: '700', color: '#fff'}}>
                        EVM
                      </Text>
                    </View>
                  )}
                </View>

                {/* Native address */}
                <Text style={{
                  fontSize: 13,
                  fontFamily: 'monospace',
                  color: 'rgba(73, 68, 87, 0.7)',
                }}>
                  {shortenAddress(signerAccount.address, 8)}
                </Text>

                {/* EVM address */}
                {signerAccount.evmAddress && (
                  <View style={{gap: 4}}>
                    <Text style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: '#494457',
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}>
                      EVM Address
                    </Text>
                    <Text style={{
                      fontSize: 13,
                      fontFamily: 'monospace',
                      color: 'rgba(73, 68, 87, 0.7)',
                    }}>
                      {shortenAddress(signerAccount.evmAddress, 8)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── Transaction Info Section ── */}
            <View style={{gap: 16, marginBottom: 32}}>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#2c024d',
                letterSpacing: -0.5,
              }}>
                Transaction Info
              </Text>

              {/* Info card */}
              <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                borderRadius: 32,
                borderWidth: 1,
                borderColor: 'rgba(78, 0, 205, 0.05)',
                padding: 25,
                gap: 16,
              }}>
                {/* Icon + Action row (left-aligned, same Y axis) */}
                <View style={{flexDirection: 'row', alignItems: 'flex-start', gap: 16}}>
                  {/* Wallet icon */}
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: 'rgba(78, 0, 205, 0.08)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h.008M21 12v7.5m0-7.5H5.625c-.621 0-1.125-.504-1.125-1.125V3.375c0-.621.504-1.125 1.125-1.125h12.75c.621 0 1.125.504 1.125 1.125v6.75M3.375 20.625a1.125 1.125 0 01-1.125-1.125V5.625m0 0A2.625 2.625 0 014.875 3H18"
                        stroke="#4e00cd"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>

                  {/* Action label + method name stacked to the right */}
                  <View style={{flex: 1, gap: 2}}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '500',
                      color: 'rgba(73, 68, 87, 0.6)',
                    }}>
                      Action
                    </Text>
                    <Text style={{
                      fontSize: 18,
                      fontWeight: '800',
                      color: '#2c024d',
                    }}>
                      {decoded.methodName || 'unknown'}
                    </Text>
                  </View>
                </View>

                {/* Description badge */}
                {decoded.description && (
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: 'rgba(78, 0, 205, 0.06)',
                    borderRadius: 9999,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    alignSelf: 'flex-start',
                  }}>
                    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                        stroke="#4e00cd"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: '#4e00cd',
                    }}>
                      {decoded.description}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── Decoded Data ── */}
            <View style={{gap: 12, marginBottom: 32}}>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#2c024d',
                letterSpacing: -0.5,
              }}>
                Decoded Data
              </Text>

              <MethodDataDisplay decoded={decoded} metadata={metadata} />
            </View>

            {/* ── Signature Controls (password + buttons) ── */}
            <SignatureControls
              isExtrinsic={isExtrinsic ?? false}
              onApprove={handleApprove}
              onCancel={handleCancel}
              isProcessing={isProcessing}
            />

            <View style={{height: 40}} />
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ─── Dark Mode (existing design) ────────────────────────────────────────────
  return (
    <View style={{flex: 1}}>
      {/* App content (behind, dimmed) */}
      <View style={{flex: 1, opacity: 0}}>
        {children}
      </View>

      {/* Signing modal (full-screen overlay) */}
      <SafeAreaView
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: Colors.primaryBg,
        }}>
        <ScrollView
          style={{flex: 1}}
          contentContainerStyle={{padding: 24}}
          keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}>
            <Text
              style={{fontSize: 20, fontWeight: '700', color: Colors.text}}>
              {isExtrinsic
                ? t('sign_transaction')
                : t('sign_message')}
            </Text>
            <TouchableOpacity
              onPress={handleCancel}
              disabled={isProcessing}
              accessibilityLabel="Close"
              accessibilityRole="button">
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M6 18L18 6M6 6l12 12" stroke={Colors.textLight} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* Signer account */}
          {signerAccount && (
            <View style={{marginBottom: 16}}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: Colors.textLight,
                  letterSpacing: 0.5,
                  marginBottom: 8,
                }}>
                SIGNING WITH ACCOUNT:
              </Text>
              <AccountCard
                account={signerAccount}
                isSelected={false}
                onPress={() => {}}
                showBalance={false}
              />
            </View>
          )}

          {/* Network info */}
          {metadata?.chainName && (
            <View
              style={{
                backgroundColor: Colors.cardBg,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginBottom: 16,
                alignSelf: 'flex-start',
                borderWidth: 1,
                borderColor: Colors.grey,
              }}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" stroke={Colors.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
                <Text style={{fontSize: 13, fontWeight: '600', color: Colors.accent}}>
                  {metadata.chainName}
                </Text>
              </View>
            </View>
          )}

          {/* Transaction description */}
          <View
            style={{
              backgroundColor: Colors.accent + '12',
              borderRadius: 14,
              padding: 16,
              marginBottom: 16,
              borderLeftWidth: 4,
              borderLeftColor: Colors.accent,
            }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: Colors.textLight,
                letterSpacing: 0.5,
                marginBottom: 6,
              }}>
              {t('transaction_info')}
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: Colors.text,
                lineHeight: 22,
              }}>
              {decoded.description}
            </Text>
          </View>

          {/* Decoded details table */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: Colors.textLight,
              letterSpacing: 0.5,
              marginBottom: 8,
            }}>
            {t('decoded_data')}
          </Text>
          <MethodDataDisplay decoded={decoded} metadata={metadata} />

          {/* Signature controls (auth + buttons) */}
          <SignatureControls
            isExtrinsic={isExtrinsic ?? false}
            onApprove={handleApprove}
            onCancel={handleCancel}
            isProcessing={isProcessing}
          />

          {/* Bottom spacer for keyboard */}
          <View style={{height: 40}} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
