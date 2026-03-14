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

import React, {useState, useCallback, useMemo, useEffect} from 'react';
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
import {Colors} from '../utils/colors';
import TokenSelectionModal from '../components/TokenSelectionModal';

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
  const [showTokenModal, setShowTokenModal] = useState(false);
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

    const subscription = sendToken(
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
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 14,
          borderWidth: 1,
          borderColor: Colors.grey,
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
            backgroundColor: '#fff',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 18,
            fontWeight: '600',
            color: Colors.text,
            borderWidth: 1,
            borderColor:
              amount.trim() && validationStatus === 'amountTooHigh'
                ? Colors.error
                : Colors.grey,
          }}
        />
        <TouchableOpacity
          onPress={handleMax}
          disabled={isInProgress}
          activeOpacity={0.7}
          style={{
            backgroundColor: Colors.purple,
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
                backgroundColor: '#fff',
                borderRadius: 8,
                paddingVertical: 8,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: Colors.grey,
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
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: Colors.grey,
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
          disabled={!canSubmit || isInProgress}
          activeOpacity={0.7}
          style={{
            backgroundColor:
              canSubmit && !isInProgress ? Colors.purple : Colors.grey,
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
