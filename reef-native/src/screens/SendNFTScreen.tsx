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
import Svg, {
  Path,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';
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
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';
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

  // ─── Light Mode ────────────────────────────────────────────────────────────
  if (isLight) {
    return (
      <ScrollView
        style={{flex: 1, backgroundColor: '#fff7fe'}}
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
            onPress={onClose}
            disabled={isInProgress}
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
            {t('send_nft')}
          </Text>
        </View>

        {/* ── NFT Preview Card (glassmorphism) ── */}
        <View style={{
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          borderRadius: 32,
          borderWidth: 1,
          borderColor: 'rgba(78, 0, 205, 0.05)',
          padding: 25,
          shadowColor: '#4e00cd',
          shadowOffset: {width: 0, height: 20},
          shadowOpacity: 0.08,
          shadowRadius: 40,
          elevation: 4,
          marginBottom: 32,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
        }}>
          {/* NFT icon with gradient border ring */}
          <View style={{width: 56, height: 56, borderRadius: 28, overflow: 'hidden', justifyContent: 'center', alignItems: 'center'}}>
            <Svg style={{position: 'absolute'}} width={56} height={56} viewBox="0 0 56 56">
              <Defs>
                <SvgLinearGradient id="nftBorderGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                  <Stop offset="0" stopColor="#4e00cd" />
                  <Stop offset="1" stopColor="#b70054" />
                </SvgLinearGradient>
              </Defs>
              <Rect width={56} height={56} rx={28} fill="url(#nftBorderGrad)" />
            </Svg>
            <View style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
            }}>
              <Text style={{fontSize: 22}}>🖼</Text>
            </View>
          </View>

          <View style={{flex: 1}}>
            <Text style={{fontSize: 20, fontWeight: '800', color: '#2c024d'}} numberOfLines={1}>
              {nft.name || `NFT #${nft.nftId}`}
            </Text>
            <Text style={{fontSize: 13, fontWeight: '500', color: '#494457', marginTop: 4}}>
              ID: {nft.nftId} · {t('balance')}: {nft.balance}
            </Text>
          </View>
        </View>

        {/* ── Amount Input (for multi-balance NFTs) ── */}
        {nft.balance > 1 && (
          <View style={{gap: 16, marginBottom: 32}}>
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#494457',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              paddingHorizontal: 8,
            }}>
              {t('insert_amount')}
            </Text>
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.4)',
              borderRadius: 32,
              borderWidth: 1,
              borderColor: 'rgba(78, 0, 205, 0.05)',
              padding: 33,
              alignItems: 'center',
            }}>
              <TextInput
                value={amount}
                onChangeText={text => {
                  if (/^\d*$/.test(text)) setAmount(text);
                }}
                placeholder="1"
                placeholderTextColor="#cbc3da"
                keyboardType="number-pad"
                editable={!isInProgress}
                textAlign="center"
                style={{
                  fontSize: 48,
                  fontWeight: '800',
                  color: amount ? '#2c024d' : '#cbc3da',
                  paddingVertical: 0,
                  paddingHorizontal: 0,
                  minWidth: 80,
                }}
              />
              <Text style={{fontSize: 13, color: '#494457', marginTop: 4}}>
                {t('balance')}: {nft.balance}
              </Text>
            </View>
          </View>
        )}

        {/* ── Destination Address ── */}
        <View style={{gap: 16, marginBottom: 32}}>
          <Text style={{
            fontSize: 12,
            fontWeight: '700',
            color: '#494457',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            paddingHorizontal: 8,
          }}>
            {t('send_to_address')}
          </Text>

          <View style={{position: 'relative'}}>
            <TextInput
              value={toAddress}
              onChangeText={setToAddress}
              placeholder={t('select_address')}
              placeholderTextColor="#cbc3da"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isInProgress}
              style={{
                backgroundColor: '#fff',
                borderRadius: 32,
                height: 64,
                paddingLeft: 24,
                paddingRight: 128,
                fontSize: 13,
                color: '#2c024d',
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
                borderWidth: toAddress.trim() && validationStatus === 'addressNotValid' ? 1 : 0,
                borderColor: toAddress.trim() && validationStatus === 'addressNotValid'
                  ? Colors.error
                  : 'transparent',
              }}
            />
            <View style={{
              position: 'absolute',
              right: 12,
              top: 12,
              flexDirection: 'row',
              gap: 8,
            }}>
              {/* QR scan button — gradient circle */}
              <TouchableOpacity
                onPress={() => setShowScanner(true)}
                disabled={isInProgress}
                activeOpacity={0.8}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  overflow: 'hidden',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <Svg style={{position: 'absolute'}} width={40} height={40} viewBox="0 0 40 40">
                  <Defs>
                    <SvgLinearGradient id="qrBtnGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                      <Stop offset="0" stopColor="#b70054" />
                      <Stop offset="1" stopColor="#4e00cd" />
                    </SvgLinearGradient>
                  </Defs>
                  <Rect width={40} height={40} rx={20} fill="url(#qrBtnGrad)" />
                </Svg>
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" style={{zIndex: 1}}>
                  <Path
                    d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
                    stroke="#fff"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
                    stroke="#fff"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>

              {/* Paste button — light purple pill */}
              <TouchableOpacity
                onPress={handlePaste}
                disabled={isInProgress}
                activeOpacity={0.7}
                style={{
                  backgroundColor: 'rgba(78, 0, 205, 0.1)',
                  borderRadius: 9999,
                  height: 40,
                  paddingHorizontal: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#4e00cd',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                }}>
                  Paste
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── EVM Warning ── */}
        {!selectedAccount?.evmAddress && (
          <View style={{
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            borderRadius: 24,
            padding: 20,
            marginBottom: 24,
            borderLeftWidth: 4,
            borderLeftColor: Colors.error,
          }}>
            <Text style={{color: Colors.error, fontSize: 13, fontWeight: '500'}}>
              {t('evm_not_connected')} — {t('connect_evm')} first to send NFTs.
            </Text>
          </View>
        )}

        {/* ── Transaction Status Stepper ── */}
        {sendStatus !== 'ready' && sendStatus !== 'error' && (
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(78, 0, 205, 0.05)',
            padding: 20,
            marginBottom: 24,
          }}>
            <Text style={{fontSize: 14, fontWeight: '600', color: '#2c024d', textAlign: 'center'}}>
              {getButtonLabel()}
            </Text>
          </View>
        )}

        {/* ── Error Display ── */}
        {sendStatus === 'error' && errorMsg && (
          <View style={{
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            borderRadius: 24,
            padding: 20,
            marginBottom: 24,
            borderLeftWidth: 4,
            borderLeftColor: Colors.error,
          }}>
            <Text style={{color: Colors.error, fontSize: 14, fontWeight: '500'}}>
              {errorMsg}
            </Text>
          </View>
        )}

        {/* ── Tx Hash ── */}
        {txHash && (
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(78, 0, 205, 0.05)',
            padding: 16,
            marginBottom: 24,
          }}>
            <Text style={{fontSize: 12, color: '#494457', marginBottom: 4}}>TX Hash</Text>
            <Text style={{fontSize: 12, fontFamily: 'monospace', color: '#2c024d'}} selectable numberOfLines={2}>
              {txHash}
            </Text>
          </View>
        )}

        {/* ── CTA Button ── */}
        {sendStatus === 'finalized' ? (
          <TouchableOpacity
            onPress={handleDone}
            activeOpacity={0.8}
            style={{
              height: 64,
              borderRadius: 9999,
              overflow: 'hidden',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: Colors.green,
            }}>
            <Text style={{fontSize: 18, fontWeight: '800', color: '#fff'}}>
              ✓ {t('done')}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSubmit || isInProgress || !selectedAccount?.evmAddress}
            activeOpacity={0.8}
            style={{
              height: 64,
              borderRadius: 9999,
              overflow: 'hidden',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: canSubmit && !isInProgress && selectedAccount?.evmAddress ? 1 : 0.5,
              shadowColor: '#b70054',
              shadowOffset: {width: 0, height: 20},
              shadowOpacity: canSubmit && !isInProgress && selectedAccount?.evmAddress ? 0.3 : 0,
              shadowRadius: 40,
              elevation: canSubmit && !isInProgress && selectedAccount?.evmAddress ? 12 : 0,
            }}>
            <Svg
              style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
              viewBox="0 0 1 1"
              preserveAspectRatio="none">
              <Defs>
                <SvgLinearGradient id="sendNftCtaGrad" x1="0" y1="0" x2="0.3" y2="1">
                  <Stop offset="0" stopColor="#b70054" />
                  <Stop offset="1" stopColor="#4e00cd" />
                </SvgLinearGradient>
              </Defs>
              <Rect x="0" y="0" width="1" height="1" fill="url(#sendNftCtaGrad)" />
            </Svg>
            <Text style={{fontSize: 18, fontWeight: '800', color: '#fff', zIndex: 1}}>
              {getButtonLabel()}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Error Retry ── */}
        {sendStatus === 'error' && (
          <TouchableOpacity
            onPress={() => {
              setSendStatus('ready');
              setErrorMsg(null);
            }}
            activeOpacity={0.7}
            style={{
              marginTop: 16,
              height: 56,
              borderRadius: 9999,
              borderWidth: 1,
              borderColor: 'rgba(78, 0, 205, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Text style={{fontSize: 15, fontWeight: '600', color: '#2c024d'}}>
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

  // ─── Dark Mode (existing design) ────────────────────────────────────────────
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
          backgroundColor: Colors.cardBg,
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
              backgroundColor: Colors.cardBg,
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
            backgroundColor: Colors.cardBg,
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
            backgroundColor: Colors.cardBg,
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
            backgroundColor: Colors.cardBg,
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
