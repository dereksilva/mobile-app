/**
 * SendNFTScreen — send an NFT (ERC1155) to another address.
 * Mirrors send_nft.dart from Flutter.
 *
 * Simpler than token sending:
 * - No amount input (defaults to 1, editable for multi-balance NFTs)
 * - Shows NFT preview card
 * - Recipient address input with paste
 * - Transaction status stepper
 */

import React, {useState, useMemo, useCallback, useRef, useEffect} from 'react';
import {Subscription} from 'rxjs';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useTranslation} from 'react-i18next';
import {NFT} from '../types';
import {useAccountStore} from '../stores/useAccountStore';
import {useConnectionStore} from '../stores/useConnectionStore';
import {sendNft} from '../reef-chain/transferApi';
import {isValidSubstrateAddress, isValidEvmAddress} from '../reef-chain/accountApi';
import {Colors} from '../utils/colors';
import QRScannerModal from '../components/QRScannerModal';

interface SendNFTScreenProps {
  nft: NFT;
  onClose: () => void;
}

type SendStatus =
  | 'ready'
  | 'noAddress'
  | 'noAmount'
  | 'amountTooHigh'
  | 'addressNotValid'
  | 'connecting'
  | 'signing'
  | 'sending'
  | 'broadcast'
  | 'includedInBlock'
  | 'finalized'
  | 'error';

export default function SendNFTScreen({nft, onClose}: SendNFTScreenProps) {
  const {t} = useTranslation();
  const selectedAddress = useAccountStore(s => s.selectedAddress);
  const accountsData = useAccountStore(s => s.accounts);
  const accounts = accountsData.data ?? [];
  const providerConnected = useConnectionStore(s => s.providerConn);

  const [toAddress, setToAddress] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [amount, setAmount] = useState('1');
  const [sendStatus, setSendStatus] = useState<SendStatus>('ready');
  const sendSubRef = useRef<Subscription | null>(null);

  useEffect(() => {
    return () => {
      sendSubRef.current?.unsubscribe();
    };
  }, []);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const selectedAccount = useMemo(
    () => accounts.find(a => a.address === selectedAddress) ?? null,
    [accounts, selectedAddress],
  );

  const amountNum = useMemo(() => {
    const parsed = parseInt(amount, 10);
    return isNaN(parsed) ? 0 : parsed;
  }, [amount]);

  // Validation
  const validate = useCallback((): SendStatus => {
    if (!providerConnected) return 'connecting';
    if (!toAddress.trim()) return 'noAddress';
    if (amountNum <= 0) return 'noAmount';
    if (amountNum > nft.balance) return 'amountTooHigh';
    if (
      !isValidSubstrateAddress(toAddress.trim()) &&
      !isValidEvmAddress(toAddress.trim())
    ) {
      return 'addressNotValid';
    }
    return 'ready';
  }, [toAddress, amountNum, nft.balance, providerConnected]);

  const validationStatus = useMemo(() => validate(), [validate]);

  const canSubmit =
    validationStatus === 'ready' && sendStatus === 'ready';

  const isInProgress = ['signing', 'sending', 'broadcast', 'includedInBlock'].includes(
    sendStatus,
  );

  const handlePaste = async () => {
    const text = await Clipboard.getString();
    if (text) setToAddress(text.trim());
  };

  // Handle scanned QR code (address)
  const handleScanAddress = useCallback((data: string) => {
    setShowScanner(false);
    const trimmed = data.trim();
    if (isValidSubstrateAddress(trimmed) || isValidEvmAddress(trimmed)) {
      setToAddress(trimmed);
    } else {
      Alert.alert('Error', t('invalid_qr_address'));
    }
  }, [t]);

  const handleSend = () => {
    if (!canSubmit || !selectedAddress || !selectedAccount?.evmAddress) return;

    setSendStatus('signing');
    setErrorMsg(null);

    sendSubRef.current?.unsubscribe();
    sendSubRef.current = sendNft(
      selectedAccount.evmAddress,
      selectedAddress,
      toAddress.trim(),
      amount,
      nft.nftId,
      nft.contractAddress,
    ).subscribe({
      next: update => {
        switch (update.status) {
          case 'signing':
            setSendStatus('signing');
            break;
          case 'sending':
            setSendStatus('sending');
            break;
          case 'broadcast':
            setSendStatus('broadcast');
            if (update.txHash) setTxHash(update.txHash);
            break;
          case 'included-in-block':
            setSendStatus('includedInBlock');
            break;
          case 'finalized':
            setSendStatus('finalized');
            if (update.txHash) setTxHash(update.txHash);
            break;
          case 'error':
            setSendStatus('error');
            setErrorMsg(update.error ?? 'Transaction failed');
            break;
        }
      },
      error: err => {
        setSendStatus('error');
        setErrorMsg(err.message ?? 'Transaction failed');
      },
    });
  };

  const handleDone = () => {
    onClose();
  };

  const getButtonLabel = (): string => {
    if (sendStatus === 'signing') return t('sending_tx');
    if (sendStatus === 'sending') return t('sending');
    if (sendStatus === 'broadcast') return t('sending_tx_to_nw');
    if (sendStatus === 'includedInBlock') return t('waiting_to_include_in_block');
    if (sendStatus === 'finalized') return t('transaction_finalized');
    if (sendStatus === 'error') return errorMsg ?? 'Error';

    switch (validationStatus) {
      case 'noAddress':
        return t('address_can_not_be_empty');
      case 'noAmount':
        return t('insert_amount');
      case 'amountTooHigh':
        return t('amount_too_high');
      case 'addressNotValid':
        return t('enter_valid_address');
      case 'connecting':
        return t('connecting');
      default:
        return t('confirm_send');
    }
  };

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: Colors.primaryBg}}
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
        <Text style={{fontSize: 20, fontWeight: '700', color: Colors.text}}>
          {t('send_nft')}
        </Text>
        <TouchableOpacity onPress={onClose} disabled={isInProgress}>
          <Text style={{color: Colors.textLight, fontSize: 16}}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* NFT preview card */}
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 14,
          padding: 16,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: Colors.grey,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        {/* NFT icon placeholder */}
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            backgroundColor: Colors.purple + '15',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 14,
          }}>
          <Text style={{fontSize: 24}}>🖼</Text>
        </View>
        <View style={{flex: 1}}>
          <Text
            style={{fontSize: 16, fontWeight: '600', color: Colors.text}}
            numberOfLines={1}>
            {nft.name || `NFT #${nft.nftId}`}
          </Text>
          <Text style={{fontSize: 12, color: Colors.textLight, marginTop: 4}}>
            ID: {nft.nftId} · {t('balance')}: {nft.balance}
          </Text>
        </View>
      </View>

      {/* Amount input (for multi-balance NFTs) */}
      {nft.balance > 1 && (
        <>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: Colors.textLight,
              letterSpacing: 0.5,
              marginBottom: 8,
            }}>
            {t('insert_amount')}
          </Text>
          <TextInput
            value={amount}
            onChangeText={text => {
              if (/^\d*$/.test(text)) setAmount(text);
            }}
            placeholder="1"
            placeholderTextColor={Colors.textLight}
            keyboardType="number-pad"
            editable={!isInProgress}
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 18,
              fontWeight: '600',
              color: Colors.text,
              borderWidth: 1,
              borderColor: Colors.grey,
              marginBottom: 20,
            }}
          />
        </>
      )}

      {/* Recipient address */}
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: Colors.textLight,
          letterSpacing: 0.5,
          marginBottom: 8,
        }}>
        {t('send_to_address')}
      </Text>
      <View style={{flexDirection: 'row', marginBottom: 20, gap: 8}}>
        <TextInput
          value={toAddress}
          onChangeText={setToAddress}
          placeholder={t('select_address')}
          placeholderTextColor={Colors.textLight}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isInProgress}
          style={{
            flex: 1,
            backgroundColor: '#fff',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 14,
            fontFamily: 'monospace',
            color: Colors.text,
            borderWidth: 1,
            borderColor:
              toAddress.trim() && validationStatus === 'addressNotValid'
                ? Colors.error
                : Colors.grey,
          }}
        />
        <TouchableOpacity
          onPress={() => setShowScanner(true)}
          disabled={isInProgress}
          activeOpacity={0.7}
          style={{
            backgroundColor: Colors.purple,
            borderRadius: 12,
            paddingHorizontal: 14,
            justifyContent: 'center',
          }}>
          <Text style={{color: '#fff', fontSize: 16}}>📷</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePaste}
          disabled={isInProgress}
          activeOpacity={0.7}
          style={{
            backgroundColor: Colors.purpleDark,
            borderRadius: 12,
            paddingHorizontal: 16,
            justifyContent: 'center',
          }}>
          <Text style={{color: '#fff', fontSize: 13, fontWeight: '600'}}>
            Paste
          </Text>
        </TouchableOpacity>
      </View>

      {/* EVM warning */}
      {!selectedAccount?.evmAddress && (
        <View
          style={{
            backgroundColor: Colors.error + '15',
            borderRadius: 12,
            padding: 14,
            marginBottom: 20,
            borderLeftWidth: 4,
            borderLeftColor: Colors.error,
          }}>
          <Text style={{color: Colors.error, fontSize: 13, fontWeight: '500'}}>
            {t('evm_not_connected')} — {t('connect_evm')} first to send NFTs.
          </Text>
        </View>
      )}

      {/* Error display */}
      {sendStatus === 'error' && errorMsg && (
        <View
          style={{
            backgroundColor: Colors.error + '15',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            borderLeftWidth: 4,
            borderLeftColor: Colors.error,
          }}>
          <Text style={{color: Colors.error, fontSize: 14, fontWeight: '500'}}>
            {errorMsg}
          </Text>
        </View>
      )}

      {/* Tx hash */}
      {txHash && (
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 12,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: Colors.grey,
          }}>
          <Text style={{fontSize: 12, color: Colors.textLight, marginBottom: 4}}>
            TX Hash
          </Text>
          <Text
            style={{fontSize: 12, fontFamily: 'monospace', color: Colors.text}}
            selectable
            numberOfLines={2}>
            {txHash}
          </Text>
        </View>
      )}

      {/* Submit / Done button */}
      {sendStatus === 'finalized' ? (
        <TouchableOpacity
          onPress={handleDone}
          activeOpacity={0.7}
          style={{
            backgroundColor: Colors.green,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
          }}>
          <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>
            ✓ {t('done')}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={handleSend}
          disabled={!canSubmit || isInProgress || !selectedAccount?.evmAddress}
          activeOpacity={0.7}
          style={{
            backgroundColor:
              canSubmit && !isInProgress && selectedAccount?.evmAddress
                ? Colors.purple
                : Colors.grey,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
          }}>
          <Text
            style={{
              color:
                canSubmit && !isInProgress && selectedAccount?.evmAddress
                  ? '#fff'
                  : Colors.textLight,
              fontSize: 16,
              fontWeight: '600',
            }}>
            {getButtonLabel()}
          </Text>
        </TouchableOpacity>
      )}

      {/* Error retry */}
      {sendStatus === 'error' && (
        <TouchableOpacity
          onPress={() => {
            setSendStatus('ready');
            setErrorMsg(null);
          }}
          activeOpacity={0.7}
          style={{
            marginTop: 12,
            backgroundColor: '#fff',
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: Colors.grey,
          }}>
          <Text style={{color: Colors.text, fontSize: 15, fontWeight: '600'}}>
            {t('reload')}
          </Text>
        </TouchableOpacity>
      )}

      <View style={{height: 40}} />

      {/* QR Scanner Modal */}
      <QRScannerModal
        visible={showScanner}
        hint={t('scan_address')}
        onScan={handleScanAddress}
        onClose={() => setShowScanner(false)}
      />
    </ScrollView>
  );
}
