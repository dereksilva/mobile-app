/**
 * SendScreen — send tokens (REEF native or ERC20).
 * Mirrors send_page.dart from Flutter.
 *
 * Features:
 * - Token selector (searchable modal)
 * - Recipient address input (with paste)
 * - Amount input with "Max" button and slider
 * - Transaction status stepper (signing → sending → finalized)
 * - Submit → triggers signing flow via transferApi
 */

import React, {useState, useCallback, useMemo, useEffect, useRef} from 'react';
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
import {ethers} from 'ethers';
import {TokenBalance, Constants} from '../types';
import {useTokenStore} from '../stores/useTokenStore';
import {useAccountStore} from '../stores/useAccountStore';
import {useConnectionStore} from '../stores/useConnectionStore';
import {sendToken} from '../reef-chain/transferApi';
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
import TokenSelectionModal from '../components/TokenSelectionModal';
import QRScannerModal from '../components/QRScannerModal';

interface SendScreenProps {
  onClose: () => void;
  /** Pre-selected token (optional — passed from home screen) */
  initialToken?: TokenBalance;
}

// Send validation states
type SendStatus =
  | 'ready'
  | 'noAddress'
  | 'noAmount'
  | 'amountTooHigh'
  | 'lowReefNative'
  | 'lowReefEvm'
  | 'addressNotValid'
  | 'connecting'
  | 'signing'
  | 'sending'
  | 'broadcast'
  | 'includedInBlock'
  | 'finalized'
  | 'error';

/** Min REEF reserve for native transfers */
const MIN_REEF_RESERVE = 5;
/** Min EVM REEF for gas fees */
const MIN_REEF_EVM_GAS = 80;
/** Max native REEF to leave as fee buffer */
const NATIVE_FEE_BUFFER = 3;

export default function SendScreen({onClose, initialToken}: SendScreenProps) {
  const {t} = useTranslation();
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';
  const tokensData = useTokenStore(s => s.selectedErc20s);
  const tokens = tokensData.data ?? [];
  const selectedAddress = useAccountStore(s => s.selectedAddress);
  const providerConnected = useConnectionStore(s => s.providerConn);

  // Form state
  const [selectedToken, setSelectedToken] = useState<TokenBalance | null>(
    initialToken ?? null,
  );
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [sendStatus, setSendStatus] = useState<SendStatus>('ready');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const sendSubRef = useRef<Subscription | null>(null);

  useEffect(() => {
    return () => {
      sendSubRef.current?.unsubscribe();
    };
  }, []);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Auto-select first token if none selected
  useEffect(() => {
    if (!selectedToken && tokens.length > 0) {
      // Prefer REEF token
      const reef = tokens.find(
        tk =>
          tk.address.toLowerCase() ===
          Constants.REEF_TOKEN_ADDRESS.toLowerCase(),
      );
      setSelectedToken(reef ?? tokens[0]);
    }
  }, [selectedToken, tokens]);

  // Computed values
  const isReefToken = useMemo(
    () =>
      selectedToken?.address.toLowerCase() ===
      Constants.REEF_TOKEN_ADDRESS.toLowerCase(),
    [selectedToken],
  );

  const tokenBalance = useMemo(() => {
    if (!selectedToken) return 0;
    return parseFloat(selectedToken.balance) / Math.pow(10, selectedToken.decimals);
  }, [selectedToken]);

  const maxTransfer = useMemo(() => {
    if (!selectedToken) return 0;
    if (isReefToken) {
      return Math.max(0, tokenBalance - NATIVE_FEE_BUFFER);
    }
    return tokenBalance;
  }, [selectedToken, tokenBalance, isReefToken]);

  const amountNum = useMemo(() => {
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? 0 : parsed;
  }, [amount]);

  // Validation
  const validate = useCallback((): SendStatus => {
    if (!providerConnected) return 'connecting';
    if (!toAddress.trim()) return 'noAddress';
    if (!amount.trim() || amountNum <= 0) return 'noAmount';
    if (amountNum > tokenBalance) return 'amountTooHigh';
    if (isReefToken && tokenBalance - amountNum < MIN_REEF_RESERVE) {
      return 'lowReefNative';
    }
    if (
      !isValidSubstrateAddress(toAddress.trim()) &&
      !isValidEvmAddress(toAddress.trim())
    ) {
      return 'addressNotValid';
    }
    return 'ready';
  }, [toAddress, amount, amountNum, tokenBalance, isReefToken, providerConnected]);

  const validationStatus = useMemo(() => validate(), [validate]);

  const getButtonLabel = (): string => {
    // During tx lifecycle, show status
    if (sendStatus === 'signing') return t('sending_tx');
    if (sendStatus === 'sending') return t('sending');
    if (sendStatus === 'broadcast') return t('sending_tx_to_nw');
    if (sendStatus === 'includedInBlock') return t('waiting_to_include_in_block');
    if (sendStatus === 'finalized') return t('transaction_finalized');
    if (sendStatus === 'error') return errorMsg ?? 'Error';

    // Pre-submit validation
    switch (validationStatus) {
      case 'noAddress':
        return t('address_can_not_be_empty');
      case 'noAmount':
        return t('insert_amount');
      case 'amountTooHigh':
        return t('amount_too_high');
      case 'lowReefNative':
        return t('minimum_5_reef');
      case 'lowReefEvm':
        return t('minimum_80_reef');
      case 'addressNotValid':
        return t('enter_valid_address');
      case 'connecting':
        return t('connecting');
      default:
        return t('confirm_send');
    }
  };

  const canSubmit =
    validationStatus === 'ready' &&
    sendStatus === 'ready' &&
    selectedToken !== null;

  const isInProgress = ['signing', 'sending', 'broadcast', 'includedInBlock'].includes(
    sendStatus,
  );

  // Paste from clipboard
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

  // Set max amount
  const handleMax = () => {
    if (maxTransfer > 0) {
      setAmount(maxTransfer.toString());
    }
  };

  // Submit transaction
  const handleSend = () => {
    if (!canSubmit || !selectedToken || !selectedAddress) return;

    setSendStatus('signing');
    setErrorMsg(null);

    // Convert amount to smallest unit (BigNumber)
    let amountBN: string;
    try {
      amountBN = ethers.utils
        .parseUnits(amount, selectedToken.decimals)
        .toString();
    } catch {
      setSendStatus('error');
      setErrorMsg(t('not_valid'));
      return;
    }

    sendSubRef.current?.unsubscribe();
    sendSubRef.current = sendToken(
      selectedAddress,
      toAddress.trim(),
      amountBN,
      selectedToken.decimals,
      selectedToken.address,
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
      complete: () => {
        // Observable completed — tx is done
      },
    });
  };

  // Reset form after finalization
  const handleDone = () => {
    setAmount('');
    setToAddress('');
    setSendStatus('ready');
    setErrorMsg(null);
    setTxHash(null);
    onClose();
  };

  // Format balance display
  const formatBalance = (bal: number): string => {
    if (bal === 0) return '0';
    if (bal < 0.0001) return '<0.0001';
    return bal.toLocaleString(undefined, {maximumFractionDigits: 4});
  };

  // ─── Computed USD estimate ─────────────────────────────────────────────────
  const usdEstimate = useMemo(() => {
    if (!selectedToken || amountNum <= 0) return '0.00';
    const usd = amountNum * (selectedToken.price ?? 0);
    return usd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }, [amountNum, selectedToken]);

  // ─── Light Mode: Figma "Send Tokens" design ──────────────────────────────
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
            {t('send_tokens')}
          </Text>
        </View>

        {/* ── Section: Token Selection Card (glassmorphism) ── */}
        <TouchableOpacity
          onPress={() => setShowTokenModal(true)}
          disabled={isInProgress}
          activeOpacity={0.8}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            borderRadius: 32,
            borderWidth: 1,
            borderColor: 'rgba(78, 0, 205, 0.05)',
            padding: 25,
            gap: 8,
            shadowColor: '#4e00cd',
            shadowOffset: {width: 0, height: 20},
            shadowOpacity: 0.08,
            shadowRadius: 40,
            elevation: 4,
            marginBottom: 32,
          }}>
          {/* Label row: SELECTED ASSET + chevron */}
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#494457',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}>
              Selected Asset
            </Text>
            <Svg width={12} height={8} viewBox="0 0 12 8" fill="none">
              <Path d="M1 1.5L6 6.5L11 1.5" stroke="#494457" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </View>

          {/* Token details row */}
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 16}}>
            {/* Token icon with gradient border ring */}
            <View style={{width: 56, height: 56, borderRadius: 28, overflow: 'hidden', justifyContent: 'center', alignItems: 'center'}}>
              <Svg style={{position: 'absolute'}} width={56} height={56} viewBox="0 0 56 56">
                <Defs>
                  <SvgLinearGradient id="tokenBorderGrad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                    <Stop offset="0" stopColor="#4e00cd" />
                    <Stop offset="1" stopColor="#b70054" />
                  </SvgLinearGradient>
                </Defs>
                <Rect width={56} height={56} rx={28} fill="url(#tokenBorderGrad)" />
              </Svg>
              {/* Inner white circle */}
              <View style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: '#fff',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1,
              }}>
                <Text style={{fontSize: 18, fontWeight: '800', color: '#4e00cd'}}>
                  {selectedToken?.symbol?.charAt(0) ?? '?'}
                </Text>
              </View>
            </View>

            {/* Name + chain */}
            <View style={{flexShrink: 1}}>
              <Text style={{fontSize: 24, fontWeight: '800', color: '#2c024d', lineHeight: 30}}>
                {selectedToken?.symbol ?? '—'}
              </Text>
              <Text style={{fontSize: 14, fontWeight: '500', color: '#494457', lineHeight: 20}}>
                {selectedToken?.name ?? t('select')}
              </Text>
            </View>

            {/* Balance */}
            <View style={{flex: 1, alignItems: 'flex-end'}}>
              <Text style={{fontSize: 16, fontWeight: '700', color: '#2c024d', lineHeight: 24}}>
                {selectedToken ? formatBalance(tokenBalance) : '—'}
              </Text>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: '#b70054',
                letterSpacing: -0.6,
                textTransform: 'uppercase',
                lineHeight: 16,
              }}>
                Available Balance
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ── Section: Destination Address ── */}
        <View style={{gap: 16, marginBottom: 32}}>
          <Text style={{
            fontSize: 12,
            fontWeight: '700',
            color: '#494457',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            paddingHorizontal: 8,
          }}>
            Send to address
          </Text>

          {/* Input + action buttons container */}
          <View style={{position: 'relative'}}>
            <TextInput
              value={toAddress}
              onChangeText={setToAddress}
              placeholder="Enter Reef or EVM address"
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
            {/* Action buttons positioned inside the input */}
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

        {/* ── Section: Amount Input ── */}
        <View style={{gap: 24, paddingBottom: 32}}>
          {/* Label row: AMOUNT TO SEND + MAX */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 8,
          }}>
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#494457',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}>
              Amount to send
            </Text>
            <TouchableOpacity onPress={handleMax} disabled={isInProgress} activeOpacity={0.7}>
              <Text style={{fontSize: 12, fontWeight: '700', color: '#b70054'}}>
                MAX
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount card (glassmorphism) */}
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.4)',
            borderRadius: 32,
            borderWidth: 1,
            borderColor: 'rgba(78, 0, 205, 0.05)',
            padding: 33,
            alignItems: 'center',
            gap: 8,
          }}>
            {/* Amount row: input + token symbol */}
            <View style={{flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center'}}>
              <TextInput
                value={amount}
                onChangeText={text => {
                  if (/^\d*\.?\d*$/.test(text)) {
                    setAmount(text);
                  }
                }}
                placeholder="0.00"
                placeholderTextColor="#cbc3da"
                keyboardType="decimal-pad"
                editable={!isInProgress}
                textAlign="center"
                style={{
                  fontSize: 48,
                  fontWeight: '800',
                  color: amount ? '#2c024d' : '#cbc3da',
                  paddingVertical: 0,
                  paddingHorizontal: 0,
                  minWidth: 120,
                  maxWidth: 220,
                }}
              />
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: 'rgba(78, 0, 205, 0.6)',
                marginLeft: 8,
                marginBottom: 8,
              }}>
                {selectedToken?.symbol ?? 'REEF'}
              </Text>
            </View>

            {/* USD estimate */}
            <Text style={{fontSize: 14, color: 'rgba(73, 68, 87, 0.7)'}}>
              ≈ ${usdEstimate} USD
            </Text>
          </View>

          {/* Percentage presets */}
          <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 8}}>
            {[25, 50, 75, 100].map(pct => (
              <TouchableOpacity
                key={pct}
                onPress={() => setAmount(((maxTransfer * pct) / 100).toString())}
                disabled={isInProgress || maxTransfer <= 0}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 9999,
                  borderWidth: 1,
                  borderColor: 'rgba(78, 0, 205, 0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <Text style={{fontSize: 12, fontWeight: '700', color: '#494457'}}>
                  {pct}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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
            <TransactionStepper status={sendStatus} />
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

        {/* ── CTA Button: Review Transaction / Done ── */}
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
            disabled={!canSubmit || isInProgress}
            activeOpacity={0.8}
            style={{
              height: 64,
              borderRadius: 9999,
              overflow: 'hidden',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: canSubmit && !isInProgress ? 1 : 0.5,
              shadowColor: '#b70054',
              shadowOffset: {width: 0, height: 20},
              shadowOpacity: canSubmit && !isInProgress ? 0.3 : 0,
              shadowRadius: 40,
              elevation: canSubmit && !isInProgress ? 12 : 0,
            }}>
            {/* Gradient background */}
            <Svg
              style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
              viewBox="0 0 1 1"
              preserveAspectRatio="none">
              <Defs>
                <SvgLinearGradient id="sendCtaGrad" x1="0" y1="0" x2="0.3" y2="1">
                  <Stop offset="0" stopColor="#b70054" />
                  <Stop offset="1" stopColor="#4e00cd" />
                </SvgLinearGradient>
              </Defs>
              <Rect x="0" y="0" width="1" height="1" fill="url(#sendCtaGrad)" />
            </Svg>
            <Text style={{fontSize: 18, fontWeight: '800', color: '#fff', zIndex: 1}}>
              {sendStatus === 'ready' && validationStatus === 'ready'
                ? 'Review Transaction'
                : getButtonLabel()}
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

        {/* Modals */}
        <TokenSelectionModal
          visible={showTokenModal}
          tokens={tokens}
          excludeAddress={selectedToken?.address}
          onSelect={token => {
            setSelectedToken(token);
            setShowTokenModal(false);
            setAmount('');
          }}
          onClose={() => setShowTokenModal(false)}
        />
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
          {t('send_tokens')}
        </Text>
        <TouchableOpacity onPress={onClose} disabled={isInProgress}>
          <Text style={{color: Colors.textLight, fontSize: 16}}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Token selector */}
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: Colors.textLight,
          letterSpacing: 0.5,
          marginBottom: 8,
        }}>
        TOKEN
      </Text>
      <TouchableOpacity
        onPress={() => setShowTokenModal(true)}
        disabled={isInProgress}
        activeOpacity={0.7}
        style={{
          backgroundColor: Colors.cardBg,
          borderRadius: 20,
          padding: 14,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 20,
        }}>
        {/* Token icon placeholder */}
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: Colors.purple + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}>
          <Text style={{fontSize: 14, fontWeight: '700', color: Colors.purple}}>
            {selectedToken?.symbol?.charAt(0) ?? '?'}
          </Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={{fontSize: 15, fontWeight: '600', color: Colors.text}}>
            {selectedToken?.name ?? t('select')}
          </Text>
          <Text style={{fontSize: 12, color: Colors.textLight, marginTop: 2}}>
            {selectedToken
              ? `${t('balance')}: ${formatBalance(tokenBalance)} ${selectedToken.symbol}`
              : t('no_token_selected')}
          </Text>
        </View>
        <Text style={{color: Colors.textLight, fontSize: 14}}>▼</Text>
      </TouchableOpacity>

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
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 14,
            fontFamily: 'monospace',
            color: Colors.text,
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
            borderWidth: toAddress.trim() && validationStatus === 'addressNotValid' ? 1 : 0,
            borderColor:
              toAddress.trim() && validationStatus === 'addressNotValid'
                ? Colors.error
                : 'transparent',
          }}
        />
        <TouchableOpacity
          onPress={() => setShowScanner(true)}
          disabled={isInProgress}
          activeOpacity={0.7}
          style={{
            backgroundColor: Colors.accent,
            borderRadius: 12,
            paddingHorizontal: 14,
            justifyContent: 'center',
          }}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
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

      {/* Amount input */}
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
      <View style={{flexDirection: 'row', marginBottom: 8, gap: 8}}>
        <TextInput
          value={amount}
          onChangeText={text => {
            // Allow only valid decimal numbers
            if (/^\d*\.?\d*$/.test(text)) {
              setAmount(text);
            }
          }}
          placeholder="0.00"
          placeholderTextColor={Colors.textLight}
          keyboardType="decimal-pad"
          editable={!isInProgress}
          style={{
            flex: 1,
            backgroundColor: Colors.cardBg,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 18,
            fontWeight: '600',
            color: Colors.text,
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
            borderWidth: amount.trim() && validationStatus === 'amountTooHigh' ? 1 : 0,
            borderColor:
              amount.trim() && validationStatus === 'amountTooHigh'
                ? Colors.error
                : 'transparent',
          }}
        />
        <TouchableOpacity
          onPress={handleMax}
          disabled={isInProgress}
          activeOpacity={0.7}
          style={{
            backgroundColor: Colors.accent,
            borderRadius: 12,
            paddingHorizontal: 20,
            justifyContent: 'center',
          }}>
          <Text style={{color: '#fff', fontSize: 13, fontWeight: '600'}}>
            MAX
          </Text>
        </TouchableOpacity>
      </View>

      {/* Max available display */}
      {selectedToken && (
        <Text style={{fontSize: 12, color: Colors.textLight, marginBottom: 20}}>
          {t('available')}: {formatBalance(maxTransfer)} {selectedToken.symbol}
          {isReefToken && ` (${NATIVE_FEE_BUFFER} REEF reserved for fees)`}
        </Text>
      )}

      {/* Amount slider */}
      {selectedToken && maxTransfer > 0 && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 24,
            gap: 8,
          }}>
          {[25, 50, 75, 100].map(pct => (
            <TouchableOpacity
              key={pct}
              onPress={() =>
                setAmount(((maxTransfer * pct) / 100).toString())
              }
              disabled={isInProgress}
              activeOpacity={0.7}
              style={{
                flex: 1,
                backgroundColor: Colors.cardBg,
                borderRadius: 8,
                paddingVertical: 8,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.06,
                shadowRadius: 8,
                elevation: 2,
              }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: Colors.purple,
                }}>
                {pct}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Transaction status stepper */}
      {sendStatus !== 'ready' && sendStatus !== 'error' && (
        <View
          style={{
            backgroundColor: Colors.cardBg,
            borderRadius: 20,
            padding: 16,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}>
          <TransactionStepper status={sendStatus} />
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

      {/* Tx hash display */}
      {txHash && (
        <View
          style={{
            backgroundColor: Colors.cardBg,
            borderRadius: 20,
            padding: 12,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
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
          disabled={!canSubmit || isInProgress}
          activeOpacity={0.7}
          style={{
            backgroundColor:
              canSubmit && !isInProgress ? Colors.accent : Colors.grey,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
          }}>
          <Text
            style={{
              color:
                canSubmit && !isInProgress ? '#fff' : Colors.textLight,
              fontSize: 16,
              fontWeight: '600',
            }}>
            {getButtonLabel()}
          </Text>
        </TouchableOpacity>
      )}

      {/* Error retry button */}
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
            borderRadius: 20,
            paddingVertical: 14,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}>
          <Text style={{color: Colors.text, fontSize: 15, fontWeight: '600'}}>
            {t('reload')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Bottom spacer */}
      <View style={{height: 40}} />

      {/* Token selection modal */}
      <TokenSelectionModal
        visible={showTokenModal}
        tokens={tokens}
        excludeAddress={selectedToken?.address}
        onSelect={token => {
          setSelectedToken(token);
          setShowTokenModal(false);
          setAmount('');
        }}
        onClose={() => setShowTokenModal(false)}
      />

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

// --- Transaction Stepper Component ---

const STEPPER_STEPS = [
  {key: 'signing', label: 'generating_signature'},
  {key: 'sending', label: 'sending_transaction'},
  {key: 'broadcast', label: 'adding_to_chain'},
  {key: 'includedInBlock', label: 'sealing_block'},
  {key: 'finalized', label: 'transaction_finalized'},
];

function TransactionStepper({status}: {status: SendStatus}) {
  const {t} = useTranslation();

  const currentIndex = STEPPER_STEPS.findIndex(s => s.key === status);

  return (
    <View>
      {STEPPER_STEPS.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <View
            key={step.key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: index < STEPPER_STEPS.length - 1 ? 12 : 0,
            }}>
            {/* Step indicator */}
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: isComplete
                  ? Colors.green
                  : isCurrent
                    ? Colors.purple
                    : Colors.grey,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: '700',
                }}>
                {isComplete ? '✓' : index + 1}
              </Text>
            </View>

            {/* Step label */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: isCurrent ? '600' : '400',
                color: isComplete || isCurrent ? Colors.text : Colors.textLight,
              }}>
              {t(step.label)}
            </Text>

            {/* Current indicator */}
            {isCurrent && (
              <Text style={{marginLeft: 8, color: Colors.purple, fontSize: 12}}>
                ●
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
