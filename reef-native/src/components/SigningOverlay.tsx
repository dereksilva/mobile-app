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
import {View, Text, ScrollView, TouchableOpacity, Alert} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useSigningStore} from '../stores/useSigningStore';
import {useAccountStore} from '../stores/useAccountStore';
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

export default function SigningOverlay({children}: SigningOverlayProps) {
  const {t} = useTranslation();
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

  // Signing modal overlay
  return (
    <View style={{flex: 1}}>
      {/* App content (behind, dimmed) */}
      <View style={{flex: 1, opacity: 0}}>
        {children}
      </View>

      {/* Signing modal (full-screen overlay) */}
      <View
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
              disabled={isProcessing}>
              <Text style={{color: Colors.textLight, fontSize: 16}}>✕</Text>
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
              />
            </View>
          )}

          {/* Network info */}
          {metadata?.chainName && (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginBottom: 16,
                alignSelf: 'flex-start',
                borderWidth: 1,
                borderColor: Colors.grey,
              }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: Colors.purple,
                }}>
                🌐 {metadata.chainName}
              </Text>
            </View>
          )}

          {/* Transaction description */}
          <View
            style={{
              backgroundColor: Colors.purpleDark + '15',
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              borderLeftWidth: 4,
              borderLeftColor: Colors.purple,
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
            isExtrinsic={isExtrinsic}
            onApprove={handleApprove}
            onCancel={handleCancel}
            isProcessing={isProcessing}
          />

          {/* Bottom spacer for keyboard */}
          <View style={{height: 40}} />
        </ScrollView>
      </View>
    </View>
  );
}
