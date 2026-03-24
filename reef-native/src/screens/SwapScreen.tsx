/**
 * SwapScreen — DEX token swap via Reefswap router.
 * Mirrors swap_page.dart from Flutter.
 *
 * Features:
 * - Two token selectors (from/to) with swap direction toggle
 * - Amount inputs with real-time output calculation (constant product AMM)
 * - Pool reserves display
 * - Slippage tolerance setting
 * - Multi-step transaction status (approve → swap → finalize)
 */

import React, {useState, useEffect, useCallback, useMemo, useRef} from 'react';
import {Subscription} from 'rxjs';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Svg, {Path} from 'react-native-svg';
import {ethers} from 'ethers';
import {TokenBalance, Constants} from '../types';
import {useTokenStore} from '../stores/useTokenStore';
import {useSwapStore} from '../stores/useSwapStore';
import {useAccountStore} from '../stores/useAccountStore';
import {useConnectionStore} from '../stores/useConnectionStore';
import {
  executeSwap,
  getPoolReserves,
  getSwapOutputAmount,
  getSwapInputAmount,
} from '../reef-chain/swapApi';
import type {SwapStatusUpdate} from '../reef-chain/types';
import {fetchAllPools} from '../reef-chain/poolsApi';
import {Colors} from '../utils/colors';
import TokenSelectionModal from '../components/TokenSelectionModal';

type SwapStatus =
  | 'ready'
  | 'noTokens'
  | 'noAmount'
  | 'insufficientBalance'
  | 'noPool'
  | 'connecting'
  | 'approving'
  | 'approved'
  | 'broadcast'
  | 'finalized'
  | 'error';

export default function SwapScreen() {
  const {t} = useTranslation();
  const tokensData = useTokenStore(s => s.selectedErc20s);
  const userTokens = tokensData.data ?? [];
  const selectedAddress = useAccountStore(s => s.selectedAddress);
  const accounts = useAccountStore(s => s.accounts);
  const selectedAccount = useMemo(
    () => (accounts.data ?? []).find(a => a.address === selectedAddress),
    [accounts, selectedAddress],
  );
  const evmAddress = selectedAccount?.evmAddress ?? '';
  const providerConnected = useConnectionStore(s => s.providerConn);

  // Fetch all pool tokens so the selection modal isn't limited to held tokens
  const [poolTokens, setPoolTokens] = useState<TokenBalance[]>([]);
  useEffect(() => {
    fetchAllPools(50, 0, '', selectedAddress ?? '')
      .then(pools => {
        const map = new Map<string, TokenBalance>();
        for (const dp of pools) {
          if (!map.has(dp.token1.toLowerCase())) {
            map.set(dp.token1.toLowerCase(), {
              address: dp.token1,
              name: dp.name1,
              symbol: dp.symbol1,
              decimals: dp.decimals1,
              balance: '0',
              price: 0,
              iconUrl: dp.iconUrl1 ?? '',
            });
          }
          if (!map.has(dp.token2.toLowerCase())) {
            map.set(dp.token2.toLowerCase(), {
              address: dp.token2,
              name: dp.name2,
              symbol: dp.symbol2,
              decimals: dp.decimals2,
              balance: '0',
              price: 0,
              iconUrl: dp.iconUrl2 ?? '',
            });
          }
        }
        setPoolTokens(Array.from(map.values()));
      })
      .catch(() => {});
  }, [selectedAddress]);

  // Merge user tokens (with balances) and pool tokens (for selection),
  // giving priority to user tokens since they have real balance data
  const allTokens = useMemo(() => {
    const merged = new Map<string, TokenBalance>();
    // Pool tokens first (balance=0)
    for (const pt of poolTokens) {
      merged.set(pt.address.toLowerCase(), pt);
    }
    // User tokens overwrite with real balances
    for (const ut of userTokens) {
      merged.set(ut.address.toLowerCase(), ut);
    }
    return Array.from(merged.values());
  }, [userTokens, poolTokens]);

  const {
    tokenFrom,
    tokenTo,
    slippageTolerance,
    deadline,
    setTokenFrom,
    setTokenTo,
    swapDirection,
    setSlippageTolerance,
  } = useSwapStore();

  // Form state
  const [amountFrom, setAmountFrom] = useState('');
  const [amountTo, setAmountTo] = useState('');
  const [reserve1, setReserve1] = useState<string | null>(null);
  const [reserve2, setReserve2] = useState<string | null>(null);
  const [swapStatus, setSwapStatus] = useState<SwapStatus>('ready');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const swapSubRef = useRef<Subscription | null>(null);

  // Cleanup swap subscription on unmount
  useEffect(() => {
    return () => {
      swapSubRef.current?.unsubscribe();
    };
  }, []);
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);
  const [showSlippage, setShowSlippage] = useState(false);
  const [loadingReserves, setLoadingReserves] = useState(false);

  // Computed balances
  const fromBalance = useMemo(() => {
    if (!tokenFrom) return 0;
    return parseFloat(tokenFrom.balance) / Math.pow(10, tokenFrom.decimals);
  }, [tokenFrom]);

  const toBalance = useMemo(() => {
    if (!tokenTo) return 0;
    return parseFloat(tokenTo.balance) / Math.pow(10, tokenTo.decimals);
  }, [tokenTo]);

  // Fetch pool reserves when token pair changes
  useEffect(() => {
    if (!tokenFrom || !tokenTo) {
      setReserve1(null);
      setReserve2(null);
      return;
    }

    let cancelled = false;
    setLoadingReserves(true);

    getPoolReserves(tokenFrom.address, tokenTo.address)
      .then(result => {
        if (cancelled) return;
        if (result) {
          setReserve1(result.reserve1);
          setReserve2(result.reserve2);
        } else {
          setReserve1(null);
          setReserve2(null);
        }
        setLoadingReserves(false);
      })
      .catch(() => {
        if (!cancelled) {
          setReserve1(null);
          setReserve2(null);
          setLoadingReserves(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tokenFrom, tokenTo]);

  // Calculate output when input amount changes
  const handleAmountFromChange = useCallback(
    (text: string) => {
      if (!/^\d*\.?\d*$/.test(text)) return;
      setAmountFrom(text);

      if (!text || !tokenFrom || !tokenTo || !reserve1 || !reserve2) {
        setAmountTo('');
        return;
      }

      try {
        const inputBN = ethers.utils
          .parseUnits(text || '0', tokenFrom.decimals)
          .toString();
        const outputBN = getSwapOutputAmount(inputBN, reserve1, reserve2);
        const outputFormatted = ethers.utils.formatUnits(
          outputBN,
          tokenTo.decimals,
        );
        setAmountTo(parseFloat(outputFormatted).toString());
      } catch {
        setAmountTo('');
      }
    },
    [tokenFrom, tokenTo, reserve1, reserve2],
  );

  // Calculate input when output amount changes
  const handleAmountToChange = useCallback(
    (text: string) => {
      if (!/^\d*\.?\d*$/.test(text)) return;
      setAmountTo(text);

      if (!text || !tokenFrom || !tokenTo || !reserve1 || !reserve2) {
        setAmountFrom('');
        return;
      }

      try {
        const outputBN = ethers.utils
          .parseUnits(text || '0', tokenTo.decimals)
          .toString();
        const inputBN = getSwapInputAmount(outputBN, reserve1, reserve2);
        if (inputBN === '0') {
          setAmountFrom('');
          return;
        }
        const inputFormatted = ethers.utils.formatUnits(
          inputBN,
          tokenFrom.decimals,
        );
        setAmountFrom(parseFloat(inputFormatted).toString());
      } catch {
        setAmountFrom('');
      }
    },
    [tokenFrom, tokenTo, reserve1, reserve2],
  );

  // Handle direction swap
  const handleSwapDirection = () => {
    swapDirection();
    const tempAmount = amountFrom;
    setAmountFrom(amountTo);
    setAmountTo(tempAmount);
  };

  // Validation
  const validate = useCallback((): SwapStatus => {
    if (!providerConnected) return 'connecting';
    if (!tokenFrom || !tokenTo) return 'noTokens';
    if (!amountFrom || parseFloat(amountFrom) <= 0) return 'noAmount';
    if (parseFloat(amountFrom) > fromBalance) return 'insufficientBalance';
    if (!reserve1 || !reserve2) return 'noPool';
    return 'ready';
  }, [
    providerConnected,
    tokenFrom,
    tokenTo,
    amountFrom,
    fromBalance,
    reserve1,
    reserve2,
  ]);

  const validationStatus = useMemo(() => validate(), [validate]);

  const canSubmit = validationStatus === 'ready' && swapStatus === 'ready';

  const isInProgress = [
    'approving',
    'approved',
    'broadcast',
  ].includes(swapStatus);

  const getButtonLabel = (): string => {
    if (swapStatus === 'approving') return `${t('loading')}... (Approving)`;
    if (swapStatus === 'approved') return `${t('loading')}... (Swapping)`;
    if (swapStatus === 'broadcast') return t('sending_tx_to_nw');
    if (swapStatus === 'finalized') return t('transaction_finalized');
    if (swapStatus === 'error') return errorMsg ?? 'Error';

    switch (validationStatus) {
      case 'noTokens':
        return t('select') + ' tokens';
      case 'noAmount':
        return t('insert_amount');
      case 'insufficientBalance':
        return t('amount_too_high');
      case 'noPool':
        return loadingReserves ? t('loading') : t('no_pool_data');
      case 'connecting':
        return t('connecting');
      default:
        return t('swap_tokens');
    }
  };

  // Execute swap
  const handleSwap = () => {
    if (!canSubmit || !tokenFrom || !tokenTo || !evmAddress) return;

    setSwapStatus('approving');
    setErrorMsg(null);
    setTxHash(null);

    let amountFromBN: string;
    let amountToBN: string;

    try {
      amountFromBN = ethers.utils
        .parseUnits(amountFrom, tokenFrom.decimals)
        .toString();
      amountToBN = ethers.utils
        .parseUnits(amountTo, tokenTo.decimals)
        .toString();
    } catch {
      setSwapStatus('error');
      setErrorMsg(t('not_valid'));
      return;
    }

    // Unsubscribe any previous swap before starting a new one
    swapSubRef.current?.unsubscribe();
    swapSubRef.current = executeSwap(
      evmAddress,
      {address: tokenFrom.address, decimals: tokenFrom.decimals, amount: amountFromBN},
      {address: tokenTo.address, decimals: tokenTo.decimals, amount: amountToBN},
      {slippageTolerance, deadline},
    ).subscribe({
      next: (update: SwapStatusUpdate) => {
        switch (update.status) {
          case 'approving':
          case 'approve-started':
            setSwapStatus('approving');
            break;
          case 'approved':
            setSwapStatus('approved');
            break;
          case 'broadcast':
            setSwapStatus('broadcast');
            if (update.txHash) setTxHash(update.txHash);
            break;
          case 'finalized':
            setSwapStatus('finalized');
            if (update.txHash) setTxHash(update.txHash);
            break;
          case 'error':
            setSwapStatus('error');
            setErrorMsg(update.error ?? 'Swap failed');
            break;
        }
      },
      error: err => {
        setSwapStatus('error');
        setErrorMsg(err.message ?? 'Swap failed');
      },
    });
  };

  const handleReset = () => {
    setAmountFrom('');
    setAmountTo('');
    setSwapStatus('ready');
    setErrorMsg(null);
    setTxHash(null);
  };

  const formatBalance = (bal: number): string => {
    if (bal === 0) return '0';
    if (bal < 0.0001) return '<0.0001';
    return bal.toLocaleString(undefined, {maximumFractionDigits: 4});
  };

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: Colors.primaryBg}}
      contentContainerStyle={{padding: 16}}
      keyboardShouldPersistTaps="handled">
      {/* From token */}
      <TokenInputSection
        label="From"
        token={tokenFrom}
        balance={fromBalance}
        amount={amountFrom}
        onAmountChange={handleAmountFromChange}
        onSelectToken={() => setShowFromModal(true)}
        onMax={() =>
          handleAmountFromChange(fromBalance.toString())
        }
        disabled={isInProgress}
        formatBalance={formatBalance}
      />

      {/* Swap direction button */}
      <View style={{alignItems: 'center', marginVertical: -8, zIndex: 1}}>
        <TouchableOpacity
          onPress={handleSwapDirection}
          disabled={isInProgress}
          activeOpacity={0.7}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: Colors.purple,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 3,
            borderColor: Colors.primaryBg,
          }}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* To token */}
      <TokenInputSection
        label="To"
        token={tokenTo}
        balance={toBalance}
        amount={amountTo}
        onAmountChange={handleAmountToChange}
        onSelectToken={() => setShowToModal(true)}
        disabled={isInProgress}
        formatBalance={formatBalance}
      />

      {/* Pool info */}
      {tokenFrom && tokenTo && (
        <View
          style={{
            backgroundColor: Colors.cardBg,
            borderRadius: 20,
            padding: 14,
            marginTop: 16,
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: Colors.textLight,
              marginBottom: 8,
            }}>
            POOL INFO
          </Text>
          {loadingReserves ? (
            <Text style={{color: Colors.textLight, fontSize: 13}}>
              {t('loading_pool_data')}
            </Text>
          ) : reserve1 && reserve2 ? (
            <>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}>
                <Text style={{fontSize: 13, color: Colors.textLight}}>
                  {tokenFrom.symbol} Reserve
                </Text>
                <Text style={{fontSize: 13, color: Colors.text, fontWeight: '500'}}>
                  {formatBalance(
                    parseFloat(
                      ethers.utils.formatUnits(reserve1, tokenFrom.decimals),
                    ),
                  )}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}>
                <Text style={{fontSize: 13, color: Colors.textLight}}>
                  {tokenTo.symbol} Reserve
                </Text>
                <Text style={{fontSize: 13, color: Colors.text, fontWeight: '500'}}>
                  {formatBalance(
                    parseFloat(
                      ethers.utils.formatUnits(reserve2, tokenTo.decimals),
                    ),
                  )}
                </Text>
              </View>
            </>
          ) : (
            <Text style={{color: Colors.error, fontSize: 13}}>
              {t('no_pool_data')}
            </Text>
          )}
        </View>
      )}

      {/* Slippage setting */}
      <TouchableOpacity
        onPress={() => setShowSlippage(!showSlippage)}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          padding: 14,
          backgroundColor: Colors.cardBg,
          borderRadius: 20,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }}>
        <Text style={{fontSize: 13, color: Colors.textLight}}>
          Slippage Tolerance
        </Text>
        <Text style={{fontSize: 13, fontWeight: '600', color: Colors.purple}}>
          {slippageTolerance}% ▾
        </Text>
      </TouchableOpacity>

      {showSlippage && (
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            marginTop: 8,
          }}>
          {[0.1, 0.5, 0.8, 1.0, 3.0].map(val => (
            <TouchableOpacity
              key={val}
              onPress={() => {
                setSlippageTolerance(val);
                setShowSlippage(false);
              }}
              activeOpacity={0.7}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor:
                  slippageTolerance === val ? Colors.purple : '#fff',
                borderWidth: 1,
                borderColor:
                  slippageTolerance === val ? Colors.purple : Colors.grey,
              }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: slippageTolerance === val ? '#fff' : Colors.text,
                }}>
                {val}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Swap status stepper */}
      {swapStatus !== 'ready' && swapStatus !== 'error' && (
        <View
          style={{
            backgroundColor: Colors.cardBg,
            borderRadius: 20,
            padding: 16,
            marginTop: 16,
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}>
          <SwapStepper status={swapStatus} />
        </View>
      )}

      {/* Error display */}
      {swapStatus === 'error' && errorMsg && (
        <View
          style={{
            backgroundColor: Colors.error + '15',
            borderRadius: 12,
            padding: 16,
            marginTop: 16,
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
            borderRadius: 20,
            padding: 12,
            marginTop: 12,
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

      {/* Swap / Done button */}
      {swapStatus === 'finalized' ? (
        <TouchableOpacity
          onPress={handleReset}
          activeOpacity={0.7}
          style={{
            marginTop: 20,
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
          onPress={handleSwap}
          disabled={!canSubmit || isInProgress}
          activeOpacity={0.7}
          style={{
            marginTop: 20,
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

      {/* Error retry */}
      {swapStatus === 'error' && (
        <TouchableOpacity
          onPress={handleReset}
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

      <View style={{height: 40}} />

      {/* Token selection modals */}
      <TokenSelectionModal
        visible={showFromModal}
        tokens={allTokens}
        excludeAddress={tokenTo?.address}
        onSelect={token => {
          setTokenFrom(token);
          setShowFromModal(false);
          setAmountFrom('');
          setAmountTo('');
        }}
        onClose={() => setShowFromModal(false)}
      />
      <TokenSelectionModal
        visible={showToModal}
        tokens={allTokens}
        excludeAddress={tokenFrom?.address}
        onSelect={token => {
          setTokenTo(token);
          setShowToModal(false);
          setAmountFrom('');
          setAmountTo('');
        }}
        onClose={() => setShowToModal(false)}
      />
    </ScrollView>
  );
}

// --- Token Input Section ---

interface TokenInputSectionProps {
  label: string;
  token: TokenBalance | null;
  balance: number;
  amount: string;
  onAmountChange: (text: string) => void;
  onSelectToken: () => void;
  onMax?: () => void;
  disabled: boolean;
  formatBalance: (bal: number) => string;
}

function TokenInputSection({
  label,
  token,
  balance,
  amount,
  onAmountChange,
  onSelectToken,
  onMax,
  disabled,
  formatBalance,
}: TokenInputSectionProps) {
  const {t} = useTranslation();

  return (
    <View
      style={{
        backgroundColor: Colors.cardBg,
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}>
      {/* Label + balance */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: Colors.textLight,
            letterSpacing: 0.5,
          }}>
          {label.toUpperCase()}
        </Text>
        {token && (
          <Text style={{fontSize: 12, color: Colors.textLight}}>
            {t('balance')}: {formatBalance(balance)}
          </Text>
        )}
      </View>

      {/* Token selector + amount input */}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
        <TouchableOpacity
          onPress={onSelectToken}
          disabled={disabled}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: Colors.primaryBg,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}>
          {/* Token icon */}
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: Colors.purple + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 8,
            }}>
            <Text
              style={{fontSize: 12, fontWeight: '700', color: Colors.purple}}>
              {token?.symbol?.charAt(0) ?? '?'}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 15,
              fontWeight: '600',
              color: Colors.text,
              marginRight: 4,
            }}>
            {token?.symbol ?? t('select')}
          </Text>
          <Text style={{color: Colors.textLight, fontSize: 12}}>▼</Text>
        </TouchableOpacity>

        <TextInput
          value={amount}
          onChangeText={onAmountChange}
          placeholder="0.00"
          placeholderTextColor={Colors.textLight}
          keyboardType="decimal-pad"
          editable={!disabled && !!token}
          style={{
            flex: 1,
            fontSize: 20,
            fontWeight: '600',
            color: Colors.text,
            textAlign: 'right',
            padding: 8,
          }}
        />
      </View>

      {/* Max button */}
      {onMax && token && (
        <TouchableOpacity
          onPress={onMax}
          disabled={disabled}
          activeOpacity={0.7}
          style={{alignSelf: 'flex-end', marginTop: 6}}>
          <Text
            style={{fontSize: 12, fontWeight: '600', color: Colors.purple}}>
            MAX
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// --- Swap Stepper ---

const SWAP_STEPS = [
  {key: 'approving', label: 'Approving token...'},
  {key: 'approved', label: 'Token approved'},
  {key: 'broadcast', label: 'Swap submitted'},
  {key: 'finalized', label: 'Swap finalized'},
];

function SwapStepper({status}: {status: SwapStatus}) {
  const currentIndex = SWAP_STEPS.findIndex(s => s.key === status);

  return (
    <View>
      {SWAP_STEPS.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <View
            key={step.key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: index < SWAP_STEPS.length - 1 ? 12 : 0,
            }}>
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
              <Text style={{color: '#fff', fontSize: 11, fontWeight: '700'}}>
                {isComplete ? '✓' : index + 1}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: isCurrent ? '600' : '400',
                color:
                  isComplete || isCurrent ? Colors.text : Colors.textLight,
              }}>
              {step.label}
            </Text>
            {isCurrent && (
              <Text
                style={{marginLeft: 8, color: Colors.purple, fontSize: 12}}>
                ●
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}
