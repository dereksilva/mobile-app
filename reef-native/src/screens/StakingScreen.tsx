/**
 * StakingScreen — stake REEF tokens by nominating validators.
 *
 * Flow: Overview → Enter Amount → Select Validators → Confirm → Submit
 *
 * Features:
 * - Portfolio overview with staked/available balance
 * - Active / Validators / Nominators tabs
 * - Full staking flow: amount → validator selection → confirm → sign
 * - Unstake and withdraw unbonded
 * - Validator list with commission, stake, identity
 * - Estimated APY display
 */

import React, {useState, useMemo, useEffect, useCallback} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import {useTokenStore} from '../stores/useTokenStore';
import {useAccountStore} from '../stores/useAccountStore';
import {useStakingStore} from '../stores/useStakingStore';
import type {StakingFlow} from '../stores/useStakingStore';
import {
  getStakingInfo,
  getStakingLedger,
  getNominations,
  getValidators,
  getEraRewards,
  calculateApy,
  stakeBond,
  stakeBondExtra,
  stakeUnbond,
  stakeWithdraw,
  stakeNominate,
  estimateStakeFee,
} from '../reef-chain/stakingApi';
import type {ValidatorInfo} from '../reef-chain/stakingApi';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';
import Svg, {
  Path,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';

type StakingTab = 'active' | 'validators' | 'nominators';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const reefLogo = require('../assets/images/reef.png');

// --- Helpers ---

function formatReef(planck: string): string {
  const num = parseFloat(planck) / 1e18;
  if (num === 0) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toLocaleString(undefined, {maximumFractionDigits: 2});
}

function formatUsd(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(val < 10 ? 2 : 1)}`;
}

function shortenAddress(addr: string, chars = 6): string {
  if (!addr || addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

// --- Main Screen ---

export default function StakingScreen() {
  const tokensData = useTokenStore(s => s.selectedErc20s);
  const tokens = tokensData.data ?? [];
  const selectedAddress = useAccountStore(s => s.selectedAddress);

  const {
    stakingInfo,
    ledger,
    nominations,
    validators,
    estimatedApy,
    flow,
    stakeAmount,
    selectedValidators,
    rewardDestination,
    txHash,
    errorMessage,
    loadingInfo,
    loadingValidators,
    setStakingInfo,
    setLedger,
    setNominations,
    setValidators,
    setEraRewards,
    setEstimatedApy,
    setFlow,
    setStakeAmount,
    setSelectedValidators,
    toggleValidator,
    setRewardDestination,
    setTxHash,
    setErrorMessage,
    setLoadingInfo,
    setLoadingValidators,
    resetFlow,
  } = useStakingStore();

  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<StakingTab>('active');
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [unstakeAmount, setUnstakeAmount] = useState('');

  // Find REEF token for price data
  const reefToken = useMemo(
    () => tokens.find(tk => tk.symbol.toUpperCase() === 'REEF'),
    [tokens],
  );
  const reefPrice = reefToken?.price ?? 0;

  // Balances
  const availableBalance = useMemo(() => {
    if (!reefToken) return 0;
    return parseFloat(reefToken.balance) / 1e18;
  }, [reefToken]);

  const stakedBalance = useMemo(() => {
    if (!ledger) return 0;
    return parseFloat(ledger.active) / 1e18;
  }, [ledger]);

  const unbondingBalance = useMemo(() => {
    if (!ledger) return 0;
    return ledger.unlocking.reduce(
      (sum, chunk) => sum + parseFloat(chunk.value) / 1e18,
      0,
    );
  }, [ledger]);

  const totalValue = useMemo(
    () => (availableBalance + stakedBalance) * reefPrice,
    [availableBalance, stakedBalance, reefPrice],
  );

  // Load staking data
  const loadStakingData = useCallback(async () => {
    if (!selectedAddress) return;
    setLoadingInfo(true);
    try {
      const [info, userLedger, userNominations, eraRewardData] =
        await Promise.all([
          getStakingInfo(),
          getStakingLedger(selectedAddress),
          getNominations(selectedAddress),
          getEraRewards(14),
        ]);
      setStakingInfo(info);
      setLedger(userLedger);
      setNominations(userNominations);
      setEraRewards(eraRewardData);
      setEstimatedApy(calculateApy(eraRewardData));
    } catch (err) {
      console.error('[StakingScreen] Failed to load staking data:', err);
    } finally {
      setLoadingInfo(false);
    }
  }, [
    selectedAddress,
    setStakingInfo,
    setLedger,
    setNominations,
    setEraRewards,
    setEstimatedApy,
    setLoadingInfo,
  ]);

  useEffect(() => {
    loadStakingData();
  }, [loadStakingData]);

  // Load validators when tab switches
  const loadValidators = useCallback(async () => {
    if (validators.length > 0) return; // already loaded
    setLoadingValidators(true);
    try {
      const vals = await getValidators();
      setValidators(vals);
    } catch (err) {
      console.error('[StakingScreen] Failed to load validators:', err);
    } finally {
      setLoadingValidators(false);
    }
  }, [validators.length, setValidators, setLoadingValidators]);

  useEffect(() => {
    if (activeTab === 'validators' || flow === 'validators' || flow === 'edit-nominations') {
      loadValidators();
    }
  }, [activeTab, flow, loadValidators]);

  // Handle editing nominations standalone (no bonding)
  const handleEditNominations = () => {
    setSelectedValidators(nominations ?? []);
    setFlow('edit-nominations');
    setErrorMessage(null);
    setTxHash(null);
    loadValidators();
  };

  const handleSubmitNominations = async () => {
    if (!selectedAddress || selectedValidators.length === 0) return;
    setFlow('submitting');
    try {
      await stakeNominate(selectedAddress, selectedValidators);
      Alert.alert('Success', 'Nominations updated successfully.');
      loadStakingData();
      resetFlow();
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Failed to update nominations');
      setFlow('error');
    }
  };

  // Handle starting the stake flow
  const handleStartStake = () => {
    setFlow('amount');
    setStakeAmount('');
    setSelectedValidators(nominations ?? []);
    setErrorMessage(null);
    setTxHash(null);
  };

  // Handle amount confirmation
  const handleConfirmAmount = async () => {
    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount to stake.');
      return;
    }
    if (amount > availableBalance) {
      Alert.alert('Insufficient Balance', 'Amount exceeds available balance.');
      return;
    }
    const minBond = stakingInfo
      ? parseFloat(stakingInfo.minNominatorBond) / 1e18
      : 0;
    if (amount < minBond && !ledger) {
      Alert.alert(
        'Below Minimum',
        `Minimum stake is ${formatReef(stakingInfo!.minNominatorBond)} REEF.`,
      );
      return;
    }

    // If user already has nominations, skip validator selection
    if (ledger && nominations && nominations.length > 0) {
      setFlow('confirm');
      // Estimate fee for bond_extra
      try {
        const amountPlanck = BigInt(Math.floor(amount * 1e18)).toString();
        const fee = await estimateStakeFee(selectedAddress!, amountPlanck, []);
        setEstimatedFee(fee);
      } catch {
        setEstimatedFee(null);
      }
    } else {
      setFlow('validators');
      loadValidators();
    }
  };

  // Handle validator confirmation
  const handleConfirmValidators = async () => {
    if (selectedValidators.length === 0) {
      Alert.alert(
        'No Validators',
        'Please select at least one validator to nominate.',
      );
      return;
    }
    setFlow('confirm');
    // Estimate fee
    try {
      const amount = parseFloat(stakeAmount);
      const amountPlanck = BigInt(Math.floor(amount * 1e18)).toString();
      const fee = await estimateStakeFee(
        selectedAddress!,
        amountPlanck,
        selectedValidators,
      );
      setEstimatedFee(fee);
    } catch {
      setEstimatedFee(null);
    }
  };

  // Handle staking submission
  const handleSubmitStake = async () => {
    if (!selectedAddress) return;
    setFlow('submitting');
    setErrorMessage(null);

    try {
      const amount = parseFloat(stakeAmount);
      const amountPlanck = BigInt(Math.floor(amount * 1e18)).toString();

      let hash: string;
      if (ledger) {
        // Already bonded — bond extra
        hash = await stakeBondExtra(selectedAddress, amountPlanck);
        // If new validators selected, also nominate
        if (
          selectedValidators.length > 0 &&
          JSON.stringify(selectedValidators.sort()) !==
            JSON.stringify((nominations ?? []).sort())
        ) {
          await stakeNominate(selectedAddress, selectedValidators);
        }
      } else {
        // First-time staking — bond + nominate
        hash = await stakeBond(
          selectedAddress,
          amountPlanck,
          rewardDestination,
          selectedValidators,
        );
      }

      setTxHash(hash);
      setFlow('success');
      // Refresh staking data
      loadStakingData();
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Staking failed');
      setFlow('error');
    }
  };

  // Handle unstake
  const handleUnstake = () => {
    setUnstakeAmount('');
    setShowUnstakeModal(true);
  };

  const handleUnstakeConfirm = async () => {
    const amount = parseFloat(unstakeAmount);
    if (!amount || amount <= 0 || !selectedAddress) return;
    setShowUnstakeModal(false);
    try {
      const planck = BigInt(Math.floor(amount * 1e18)).toString();
      await stakeUnbond(selectedAddress, planck);
      Alert.alert('Success', 'Unbonding started.');
      loadStakingData();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Unstake failed');
    }
  };

  // Handle withdraw
  const handleWithdraw = async () => {
    if (!selectedAddress) return;
    try {
      await stakeWithdraw(selectedAddress);
      Alert.alert('Success', 'Unbonded tokens withdrawn.');
      loadStakingData();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Withdraw failed');
    }
  };

  // ─── Light Mode: Figma "Staking" overview ──────────────────────────────────
  if (isLight && flow === 'idle') {
    const nominationCount = nominations?.length ?? 0;

    return (
      <>
        <ScrollView
          style={{flex: 1, backgroundColor: '#fff7fe'}}
          contentContainerStyle={{paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: 80}}>

          {/* ── Hero: Total Staked Balance ── */}
          <View style={{
            alignItems: 'center',
            paddingVertical: 40,
            borderRadius: 48,
            overflow: 'hidden',
            gap: 8,
          }}>
            {/* Radial gradient background */}
            <Svg
              style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
              viewBox="0 0 342 220"
              preserveAspectRatio="none">
              <Defs>
                <RadialGradient id="stakeBalGrad" cx="171" cy="110" r="220" gradientUnits="userSpaceOnUse">
                  <Stop offset="0" stopColor="#b70054" stopOpacity={0.12} />
                  <Stop offset="0.5" stopColor="#4e00cd" stopOpacity={0.04} />
                  <Stop offset="1" stopColor="#4e00cd" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect x="0" y="0" width="342" height="220" fill="url(#stakeBalGrad)" />
            </Svg>

            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#494457',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}>
              Total Staked Balance
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={{
                fontSize: 36,
                fontWeight: '800',
                color: '#2c024d',
                letterSpacing: -1.8,
                textAlign: 'center',
                width: '100%',
                paddingHorizontal: 8,
              }}>
              {stakedBalance > 0
                ? stakedBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})
                : '0.00'}
            </Text>
            <Text style={{
              fontSize: 32,
              fontWeight: '800',
              color: '#2c024d',
              letterSpacing: -1,
              textAlign: 'center',
            }}>
              REEF
            </Text>
            {/* APY badge */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(183, 0, 84, 0.08)',
              borderRadius: 9999,
              paddingHorizontal: 12,
              paddingVertical: 4,
              gap: 4,
            }}>
              <Svg width={12} height={7} viewBox="0 0 12 7" fill="none">
                <Path d="M1 6L4.5 2.5L7 4L11 1" stroke="#b70054" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={{fontSize: 14, fontWeight: '600', color: '#b70054'}}>
                +{estimatedApy?.toFixed(1) ?? '0.0'}% APY
              </Text>
            </View>
          </View>

          {/* ── REEF Token Info Card ── */}
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderRadius: 32,
            borderWidth: 1,
            borderColor: 'rgba(203, 195, 218, 0.15)',
            padding: 25,
            gap: 12,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 4},
            shadowOpacity: 0.04,
            shadowRadius: 12,
            elevation: 2,
          }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <View style={{gap: 4}}>
                <Text style={{fontSize: 20, fontWeight: '800', color: '#2c024d'}}>REEF Token</Text>
                <Text style={{fontSize: 13, color: '#494457', opacity: 0.8}}>Global ecosystem utility</Text>
              </View>
              {/* Staking layers icon */}
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
                    d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0L21.75 16.5 12 21.75 2.25 16.5l4.179-2.25m0 0l5.571 3 5.571-3"
                    stroke="#4e00cd"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            </View>
            {/* Price row */}
            <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 8}}>
              <Text style={{fontSize: 22, fontWeight: '800', color: '#2c024d'}}>
                ${reefPrice.toFixed(4)}
              </Text>
              <Text style={{fontSize: 13, fontWeight: '600', color: '#00b46e'}}>
                +4.2%
              </Text>
            </View>
          </View>

          {/* ── Validators Card ── */}
          <View style={{
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(203, 195, 218, 0.15)',
            padding: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}>
            <View style={{gap: 4}}>
              <Text style={{fontSize: 10, fontWeight: '700', color: '#494457', letterSpacing: 1, textTransform: 'uppercase'}}>
                Validators
              </Text>
              <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 6}}>
                <Text style={{fontSize: 20, fontWeight: '800', color: '#2c024d'}}>
                  {nominationCount}
                </Text>
                <Text style={{fontSize: 11, fontWeight: '700', color: '#00b46e'}}>ACTIVE</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleEditNominations}
              activeOpacity={0.7}
              style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Text style={{fontSize: 12, fontWeight: '700', color: '#4e00cd'}}>
                MANAGE
              </Text>
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  stroke="#4e00cd"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          {/* ── Stake REEF CTA ── */}
          <TouchableOpacity
            onPress={handleStartStake}
            activeOpacity={0.8}
            style={{
              height: 64,
              borderRadius: 9999,
              overflow: 'hidden',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
              shadowColor: '#b70054',
              shadowOffset: {width: 0, height: 20},
              shadowOpacity: 0.3,
              shadowRadius: 40,
              elevation: 12,
              marginBottom: 12,
            }}>
            <Svg
              style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
              viewBox="0 0 1 1"
              preserveAspectRatio="none">
              <Defs>
                <SvgLinearGradient id="stakeCtaGrad" x1="0" y1="0" x2="0.3" y2="1">
                  <Stop offset="0" stopColor="#b70054" />
                  <Stop offset="1" stopColor="#4e00cd" />
                </SvgLinearGradient>
              </Defs>
              <Rect x="0" y="0" width="1" height="1" fill="url(#stakeCtaGrad)" />
            </Svg>
            {/* Plus icon */}
            <View style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
            }}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path d="M12 4.5v15m7.5-7.5h-15" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text style={{fontSize: 18, fontWeight: '800', color: '#fff', zIndex: 1}}>
              Stake REEF
            </Text>
          </TouchableOpacity>

          {/* ── Unstake Button ── */}
          <TouchableOpacity
            onPress={() => {
              setUnstakeAmount('');
              setShowUnstakeModal(true);
            }}
            activeOpacity={0.8}
            style={{
              height: 56,
              borderRadius: 9999,
              borderWidth: 1,
              borderColor: 'rgba(78, 0, 205, 0.12)',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              marginBottom: 40,
            }}>
            {/* Minus icon */}
            <View style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: 'rgba(78, 0, 205, 0.08)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <Path d="M19.5 12h-15" stroke="#4e00cd" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text style={{fontSize: 16, fontWeight: '700', color: '#4e00cd'}}>
              Unstake
            </Text>
          </TouchableOpacity>

          {/* ── Staking Insights ── */}
          <View style={{gap: 16}}>
            <Text style={{fontSize: 20, fontWeight: '800', color: '#2c024d', fontStyle: 'italic'}}>
              Staking Insights
            </Text>

            {/* Lock-up Period */}
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              borderRadius: 24,
              borderWidth: 1,
              borderColor: 'rgba(203, 195, 218, 0.15)',
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: 'rgba(78, 0, 205, 0.06)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    stroke="#4e00cd"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <View style={{flex: 1, gap: 2}}>
                <Text style={{fontSize: 15, fontWeight: '700', color: '#2c024d'}}>Lock-up Period</Text>
                <Text style={{fontSize: 13, color: '#494457', opacity: 0.8}}>
                  Unbonding takes {stakingInfo?.bondingDuration ?? 28} days
                </Text>
              </View>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  stroke="rgba(73, 68, 87, 0.3)"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>

            {/* Nomination Status */}
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              borderRadius: 24,
              borderWidth: 1,
              borderColor: 'rgba(203, 195, 218, 0.15)',
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: 'rgba(183, 0, 84, 0.06)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                    stroke="#b70054"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <View style={{flex: 1, gap: 2}}>
                <Text style={{fontSize: 15, fontWeight: '700', color: '#2c024d'}}>Nomination Status</Text>
                <Text style={{fontSize: 13, color: '#494457', opacity: 0.8}}>
                  {nominationCount} Active nomination{nominationCount !== 1 ? 's' : ''}
                </Text>
              </View>
              {nominationCount > 0 ? (
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: '#00b46e',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Text style={{color: '#fff', fontSize: 12, fontWeight: '800'}}>✓</Text>
                </View>
              ) : (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 4.88c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    stroke="#b70054"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Unstake modal — shared */}
        <Modal
          visible={showUnstakeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUnstakeModal(false)}>
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: 32,
          }}>
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 32,
              padding: 28,
              width: '100%',
              maxWidth: 340,
              gap: 16,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 20},
              shadowOpacity: 0.15,
              shadowRadius: 40,
              elevation: 12,
            }}>
              <Text style={{fontSize: 20, fontWeight: '800', color: '#2c024d'}}>
                Unstake REEF
              </Text>
              <Text style={{fontSize: 14, color: '#494457', lineHeight: 20, opacity: 0.8}}>
                Enter amount to unstake (max: {formatReef(ledger?.active ?? '0')} REEF).
                {'\n'}Unbonding takes {stakingInfo?.bondingDuration ?? '~'} eras.
              </Text>
              <TextInput
                value={unstakeAmount}
                onChangeText={setUnstakeAmount}
                placeholder="0.00"
                placeholderTextColor="#cbc3da"
                keyboardType="decimal-pad"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
                autoFocus
                style={{
                  backgroundColor: 'rgba(252, 240, 255, 0.5)',
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 18,
                  fontWeight: '700',
                  color: '#2c024d',
                  borderWidth: 1,
                  borderColor: 'rgba(78, 0, 205, 0.1)',
                }}
              />
              <View style={{flexDirection: 'row', gap: 12}}>
                <TouchableOpacity
                  onPress={() => setShowUnstakeModal(false)}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 9999,
                    borderWidth: 1,
                    borderColor: 'rgba(78, 0, 205, 0.1)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                  <Text style={{fontSize: 15, fontWeight: '700', color: '#494457'}}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleUnstakeConfirm}
                  disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0}
                  style={{
                    flex: 1,
                    height: 52,
                    borderRadius: 9999,
                    backgroundColor: !unstakeAmount || parseFloat(unstakeAmount) <= 0
                      ? 'rgba(203, 195, 218, 0.3)'
                      : Colors.error,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: !unstakeAmount || parseFloat(unstakeAmount) <= 0 ? 0.5 : 1,
                  }}>
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: '#fff',
                  }}>
                    Unstake
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // --- Render Flow Screens ---

  if (flow === 'amount') {
    return (
      <StakeAmountView
        available={availableBalance}
        reefPrice={reefPrice}
        minBond={
          stakingInfo
            ? parseFloat(stakingInfo.minNominatorBond) / 1e18
            : 0
        }
        stakeAmount={stakeAmount}
        onAmountChange={setStakeAmount}
        rewardDestination={rewardDestination}
        onRewardDestChange={setRewardDestination}
        isExisting={!!ledger}
        estimatedApy={estimatedApy}
        onConfirm={handleConfirmAmount}
        onBack={resetFlow}
      />
    );
  }

  if (flow === 'validators') {
    return (
      <ValidatorSelectView
        validators={validators}
        selectedValidators={selectedValidators}
        onToggle={toggleValidator}
        loading={loadingValidators}
        onConfirm={handleConfirmValidators}
        onBack={() => setFlow('amount')}
      />
    );
  }

  if (flow === 'edit-nominations') {
    return (
      <ValidatorSelectView
        validators={validators}
        selectedValidators={selectedValidators}
        onToggle={toggleValidator}
        loading={loadingValidators}
        onConfirm={handleSubmitNominations}
        onBack={resetFlow}
        title="Edit Nominations"
        confirmLabel="Update Nominations"
      />
    );
  }

  if (flow === 'confirm') {
    return (
      <StakeConfirmView
        amount={stakeAmount}
        reefPrice={reefPrice}
        validators={selectedValidators}
        allValidators={validators}
        rewardDestination={rewardDestination}
        isExisting={!!ledger}
        estimatedFee={estimatedFee}
        estimatedApy={estimatedApy}
        onConfirm={handleSubmitStake}
        onBack={() =>
          setFlow(ledger && nominations?.length ? 'amount' : 'validators')
        }
      />
    );
  }

  if (flow === 'submitting') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.primaryBg,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 40,
        }}>
        <ActivityIndicator size="large" color={Colors.purple} />
        <Text
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: Colors.text,
            marginTop: 20,
          }}>
          Submitting transaction...
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: Colors.textLight,
            marginTop: 8,
            textAlign: 'center',
          }}>
          Please approve the signing request when prompted.
        </Text>
      </View>
    );
  }

  if (flow === 'success') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.primaryBg,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 40,
        }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: Colors.green,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
          }}>
          <Text style={{color: '#fff', fontSize: 32, fontWeight: '700'}}>
            ✓
          </Text>
        </View>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: Colors.text,
            marginBottom: 8,
          }}>
          Staking Successful!
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: Colors.textLight,
            textAlign: 'center',
            marginBottom: 20,
          }}>
          You've staked {stakeAmount} REEF
        </Text>
        {txHash && (
          <Text
            style={{
              fontSize: 12,
              fontFamily: 'monospace',
              color: Colors.textLight,
              marginBottom: 24,
            }}
            selectable>
            TX: {shortenAddress(txHash, 10)}
          </Text>
        )}
        <TouchableOpacity
          onPress={resetFlow}
          activeOpacity={0.7}
          style={{
            backgroundColor: Colors.purple,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 40,
          }}>
          <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>
            Done
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (flow === 'error') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.primaryBg,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 40,
        }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: Colors.error,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
          }}>
          <Text style={{color: '#fff', fontSize: 32, fontWeight: '700'}}>
            ✕
          </Text>
        </View>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: Colors.text,
            marginBottom: 8,
          }}>
          Staking Failed
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: Colors.error,
            textAlign: 'center',
            marginBottom: 24,
          }}>
          {errorMessage ?? 'An error occurred'}
        </Text>
        <TouchableOpacity
          onPress={resetFlow}
          activeOpacity={0.7}
          style={{
            backgroundColor: Colors.purple,
            borderRadius: 12,
            paddingVertical: 14,
            paddingHorizontal: 40,
          }}>
          <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Main Overview ---

  const tabs: {key: StakingTab; label: string}[] = [
    {key: 'active', label: 'Active'},
    {key: 'validators', label: 'Validators'},
    {key: 'nominators', label: 'Nominators'},
  ];

  const headerContent = (
    <>
      {/* Header with total value */}
      <View style={{alignItems: 'center', paddingTop: 20, paddingBottom: 24}}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: Colors.text,
            marginBottom: 8,
          }}>
          Staking
        </Text>
        <Text
          style={{
            fontSize: 48,
            fontWeight: '800',
            color: Colors.purple,
          }}>
          {formatUsd(totalValue)}
        </Text>
      </View>

      {/* Tab switcher */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: 16,
          backgroundColor: Colors.primaryBg,
          borderRadius: 14,
          padding: 4,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: Colors.grey,
        }}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor:
                activeTab === tab.key ? Colors.cardBg : 'transparent',
              ...(activeTab === tab.key
                ? {
                    shadowColor: '#000',
                    shadowOffset: {width: 0, height: 1},
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 2,
                  }
                : {}),
            }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: activeTab === tab.key ? '600' : '400',
                color:
                  activeTab === tab.key ? Colors.purple : Colors.textLight,
              }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  // Validators and Nominators tabs use FlatList for proper scrolling
  if (activeTab === 'validators') {
    return (
      <ValidatorsTab
        validators={validators}
        loading={loadingValidators}
        nominations={nominations}
        header={headerContent}
      />
    );
  }

  if (activeTab === 'nominators') {
    return (
      <NominatorsTab
        nominations={nominations}
        validators={validators}
        header={headerContent}
      />
    );
  }

  // Active tab uses ScrollView
  return (
    <>
      <ScrollView
        style={{flex: 1, backgroundColor: Colors.primaryBg}}
        contentContainerStyle={{paddingBottom: 40}}>
        {headerContent}
        <View style={{paddingHorizontal: 16}}>
          <ActiveTab
            reefToken={reefToken}
            reefPrice={reefPrice}
            availableBalance={availableBalance}
            stakedBalance={stakedBalance}
            unbondingBalance={unbondingBalance}
            ledger={ledger}
            nominations={nominations}
            stakingInfo={stakingInfo}
            estimatedApy={estimatedApy}
            loading={loadingInfo}
            onStake={handleStartStake}
            onUnstake={handleUnstake}
            onWithdraw={handleWithdraw}
            onEditNominations={handleEditNominations}
          />
        </View>
      </ScrollView>

      {/* Unstake amount modal — avoids Alert.prompt which triggers iOS password autofill */}
      <Modal
        visible={showUnstakeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUnstakeModal(false)}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
            padding: 32,
          }}>
          <View
            style={{
              backgroundColor: Colors.cardBg,
              borderRadius: 16,
              padding: 24,
              width: '100%',
              maxWidth: 340,
            }}>
            <Text style={{fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8}}>
              Unstake REEF
            </Text>
            <Text style={{fontSize: 14, color: Colors.textLight, marginBottom: 16, lineHeight: 20}}>
              Enter amount to unstake (max: {formatReef(ledger?.active ?? '0')} REEF).
              {'\n'}Unbonding takes {stakingInfo?.bondingDuration ?? '~'} eras.
            </Text>
            <TextInput
              value={unstakeAmount}
              onChangeText={setUnstakeAmount}
              placeholder="0.00"
              placeholderTextColor={Colors.textLight}
              keyboardType="decimal-pad"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
              autoFocus
              style={{
                backgroundColor: Colors.primaryBg,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 16,
                color: Colors.text,
                marginBottom: 20,
              }}
            />
            <View style={{flexDirection: 'row', gap: 12}}>
              <TouchableOpacity
                onPress={() => setShowUnstakeModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: Colors.grey,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}>
                <Text style={{fontSize: 15, fontWeight: '600', color: Colors.text}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUnstakeConfirm}
                disabled={!unstakeAmount || parseFloat(unstakeAmount) <= 0}
                style={{
                  flex: 1,
                  backgroundColor: !unstakeAmount || parseFloat(unstakeAmount) <= 0
                    ? Colors.grey
                    : Colors.error,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}>
                <Text style={{
                  fontSize: 15,
                  fontWeight: '600',
                  color: !unstakeAmount || parseFloat(unstakeAmount) <= 0
                    ? Colors.textLight
                    : '#fff',
                }}>
                  Unstake
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// =====================================================
// Sub-views
// =====================================================

// --- Active Tab ---

function ActiveTab({
  reefToken,
  reefPrice,
  availableBalance,
  stakedBalance,
  unbondingBalance,
  ledger,
  nominations,
  stakingInfo,
  estimatedApy,
  loading,
  onStake,
  onUnstake,
  onWithdraw,
  onEditNominations,
}: {
  reefToken: any;
  reefPrice: number;
  availableBalance: number;
  stakedBalance: number;
  unbondingBalance: number;
  ledger: any;
  nominations: string[] | null;
  stakingInfo: any;
  estimatedApy: number;
  loading: boolean;
  onStake: () => void;
  onUnstake: () => void;
  onWithdraw: () => void;
  onEditNominations: () => void;
}) {
  if (loading) {
    return (
      <View style={{padding: 40, alignItems: 'center'}}>
        <ActivityIndicator size="large" color={Colors.purple} />
        <Text style={{color: Colors.textLight, fontSize: 14, marginTop: 12}}>
          Loading staking data...
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* REEF Token Card */}
      {reefToken && (
        <View
          style={{
            backgroundColor: Colors.cardBg,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 2},
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Image
              source={reefLogo}
              style={{width: 48, height: 48, marginRight: 14}}
              resizeMode="contain"
            />
            <View style={{flex: 1}}>
              <Text
                style={{fontSize: 17, fontWeight: '700', color: Colors.text}}>
                REEF
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textLight,
                  marginTop: 2,
                }}>
                ${reefPrice.toFixed(4)}
              </Text>
            </View>
            <View style={{alignItems: 'flex-end'}}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '700',
                  color: Colors.accent,
                }}>
                {formatUsd(availableBalance * reefPrice)}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textLight,
                  marginTop: 2,
                }}>
                {formatReef(reefToken.balance)} REEF
              </Text>
            </View>
          </View>

          {/* Stake button */}
          <TouchableOpacity
            onPress={onStake}
            activeOpacity={0.7}
            accessibilityLabel="Stake REEF tokens"
            style={{
              backgroundColor: Colors.accent,
              borderRadius: 24,
              paddingVertical: 14,
              alignItems: 'center',
              marginTop: 16,
              shadowColor: Colors.accent,
              shadowOffset: {width: 0, height: 4},
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}>
            <Text style={{color: '#fff', fontSize: 16, fontWeight: '700'}}>
              Stake
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Staking Info Card */}
      {(stakedBalance > 0 || unbondingBalance > 0) && (
        <View
          style={{
            backgroundColor: Colors.cardBg,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
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
              letterSpacing: 0.5,
              marginBottom: 16,
            }}>
            YOUR STAKING
          </Text>

          <InfoRow label="Staked" value={`${formatReef(ledger?.active ?? '0')} REEF`} />
          <InfoRow
            label="Staked Value"
            value={formatUsd(stakedBalance * reefPrice)}
          />
          {ledger && ledger.unlocking.length > 0 && (
            <UnbondingDetails
              unlocking={ledger.unlocking}
              activeEra={stakingInfo?.activeEra ?? 0}
            />
          )}
          {nominations && nominations.length > 0 && (
            <InfoRow
              label="Nominated"
              value={`${nominations.length} validator${nominations.length !== 1 ? 's' : ''}`}
            />
          )}

          {/* Edit Nominations button */}
          {nominations && nominations.length > 0 && (
            <TouchableOpacity
              onPress={onEditNominations}
              activeOpacity={0.7}
              style={{
                marginTop: 12,
                backgroundColor: Colors.purple + '15',
                borderRadius: 10,
                paddingVertical: 10,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: Colors.purple + '40',
              }}>
              <Text
                style={{
                  color: Colors.purple,
                  fontSize: 13,
                  fontWeight: '600',
                }}>
                Edit Nominations
              </Text>
            </TouchableOpacity>
          )}

          {/* Unstake / Withdraw buttons */}
          <View style={{flexDirection: 'row', gap: 10, marginTop: 16}}>
            <TouchableOpacity
              onPress={onUnstake}
              activeOpacity={0.7}
              style={{
                flex: 1,
                backgroundColor: Colors.primaryBg,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: Colors.grey,
              }}>
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 14,
                  fontWeight: '600',
                }}>
                Unstake
              </Text>
            </TouchableOpacity>
            {ledger && ledger.unlocking.length > 0 && (() => {
              const activeEra = stakingInfo?.activeEra ?? 0;
              const withdrawable = ledger.unlocking.some(
                (c: any) => c.era <= activeEra,
              );
              const withdrawableAmount = ledger.unlocking
                .filter((c: any) => c.era <= activeEra)
                .reduce((sum: number, c: any) => sum + parseFloat(c.value) / 1e18, 0);
              return (
                <TouchableOpacity
                  onPress={onWithdraw}
                  disabled={!withdrawable}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    backgroundColor: withdrawable ? Colors.green : Colors.grey,
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: 'center',
                    opacity: withdrawable ? 1 : 0.6,
                  }}>
                  <Text
                    style={{
                      color: withdrawable ? '#fff' : Colors.textLight,
                      fontSize: 14,
                      fontWeight: '600',
                    }}>
                    {withdrawable
                      ? `Withdraw ${withdrawableAmount.toLocaleString(undefined, {maximumFractionDigits: 2})} REEF`
                      : 'Withdraw'}
                  </Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        </View>
      )}

      {/* Network Stats Card */}
      {stakingInfo && (
        <View
          style={{
            backgroundColor: Colors.cardBg,
            borderRadius: 20,
            padding: 20,
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
              letterSpacing: 0.5,
              marginBottom: 16,
            }}>
            NETWORK STAKING
          </Text>

          <InfoRow
            label="Est. APY"
            value={`${estimatedApy.toFixed(1)}%`}
            valueColor={Colors.green}
          />
          <InfoRow
            label="Total Staked"
            value={`${formatReef(stakingInfo.totalStaked)} REEF`}
          />
          <InfoRow
            label="Min. Stake"
            value={`${formatReef(stakingInfo.minNominatorBond)} REEF`}
          />
          <InfoRow
            label="Active Era"
            value={`#${stakingInfo.activeEra}`}
          />
          <InfoRow
            label="Unbonding Period"
            value={`${stakingInfo.bondingDuration} eras`}
          />
          <InfoRow
            label="Nominators"
            value={`${stakingInfo.currentNominatorsCount}${stakingInfo.maxNominatorsCount ? ` / ${stakingInfo.maxNominatorsCount}` : ''}`}
          />
        </View>
      )}
    </>
  );
}

// --- Validators Tab ---

function ValidatorsTab({
  validators,
  loading,
  nominations,
  header,
}: {
  validators: ValidatorInfo[];
  loading: boolean;
  nominations: string[] | null;
  header: React.ReactElement;
}) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'stake' | 'commission'>('stake');

  const filtered = useMemo(() => {
    let list = [...validators];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        v =>
          v.address.toLowerCase().includes(q) ||
          (v.identity && v.identity.toLowerCase().includes(q)),
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'stake') {
        return parseFloat(b.totalStake) - parseFloat(a.totalStake);
      }
      return a.commission - b.commission;
    });

    return list;
  }, [validators, search, sortBy]);

  const listHeader = (
    <>
      {header}
      <View style={{paddingHorizontal: 16}}>
        {/* Search */}
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search validators..."
          placeholderTextColor={Colors.textLight}
          autoCapitalize="none"
          style={{
            backgroundColor: Colors.cardBg,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 15,
            color: Colors.text,
            borderWidth: 1,
            borderColor: Colors.grey,
            marginBottom: 12,
          }}
        />

        {/* Sort */}
        <View style={{flexDirection: 'row', gap: 8, marginBottom: 16}}>
          {(['stake', 'commission'] as const).map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => setSortBy(s)}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: sortBy === s ? Colors.purple : Colors.cardBg,
                borderWidth: 1,
                borderColor: sortBy === s ? Colors.purple : Colors.grey,
              }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: sortBy === s ? '#fff' : Colors.purple,
                }}>
                {s === 'stake' ? 'By Stake' : 'By Commission'}
              </Text>
            </TouchableOpacity>
          ))}
          <Text
            style={{
              fontSize: 12,
              color: Colors.textLight,
              alignSelf: 'center',
              marginLeft: 'auto',
            }}>
            {filtered.length} validators
          </Text>
        </View>
      </View>

      {loading && (
        <View style={{padding: 40, alignItems: 'center'}}>
          <ActivityIndicator size="large" color={Colors.purple} />
          <Text style={{color: Colors.textLight, fontSize: 14, marginTop: 12}}>
            Loading validators...
          </Text>
        </View>
      )}
    </>
  );

  return (
    <FlatList
      style={{flex: 1, backgroundColor: Colors.primaryBg}}
      data={loading ? [] : filtered}
      keyExtractor={item => item.address}
      ListHeaderComponent={listHeader}
      renderItem={({item}) => (
        <View style={{paddingHorizontal: 16}}>
          <ValidatorCard
            validator={item}
            isNominated={nominations?.includes(item.address) ?? false}
          />
        </View>
      )}
      contentContainerStyle={{paddingBottom: 40}}
    />
  );
}

// --- Nominators Tab ---

function NominatorsTab({
  nominations,
  validators,
  header,
}: {
  nominations: string[] | null;
  validators: ValidatorInfo[];
  header: React.ReactElement;
}) {
  const validatorMap = useMemo(
    () => new Map(validators.map(v => [v.address, v])),
    [validators],
  );

  // Build data for FlatList — each nomination address
  const data = nominations ?? [];

  const listHeader = (
    <>
      {header}
      <View style={{paddingHorizontal: 16}}>
        {data.length === 0 ? (
          <View
            style={{
              backgroundColor: Colors.cardBg,
              borderRadius: 16,
              padding: 32,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: Colors.grey,
            }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: Colors.text,
                marginBottom: 8,
              }}>
              No Nominations
            </Text>
            <Text
              style={{
                color: Colors.textLight,
                fontSize: 14,
                textAlign: 'center',
              }}>
              You haven't nominated any validators yet. Start staking to
              nominate validators and earn rewards.
            </Text>
          </View>
        ) : (
          <Text
            style={{
              fontSize: 12,
              color: Colors.textLight,
              marginBottom: 12,
            }}>
            Your {data.length} nominated validator
            {data.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </>
  );

  return (
    <FlatList
      style={{flex: 1, backgroundColor: Colors.primaryBg}}
      data={data}
      keyExtractor={item => item}
      ListHeaderComponent={listHeader}
      renderItem={({item: addr}) => {
        const v = validatorMap.get(addr);
        return (
          <View style={{paddingHorizontal: 16}}>
            {v ? (
              <ValidatorCard validator={v} isNominated />
            ) : (
              <View
                style={{
                  backgroundColor: Colors.cardBg,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: Colors.grey,
                }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: 'monospace',
                    color: Colors.text,
                  }}>
                  {shortenAddress(addr)}
                </Text>
              </View>
            )}
          </View>
        );
      }}
      contentContainerStyle={{paddingBottom: 40}}
    />
  );
}

// =====================================================
// Flow Views
// =====================================================

// --- Stake Amount View ---

function StakeAmountView({
  available,
  reefPrice,
  minBond,
  stakeAmount,
  onAmountChange,
  rewardDestination,
  onRewardDestChange,
  isExisting,
  estimatedApy,
  onConfirm,
  onBack,
}: {
  available: number;
  reefPrice: number;
  minBond: number;
  stakeAmount: string;
  onAmountChange: (text: string) => void;
  rewardDestination: 'Staked' | 'Stash';
  onRewardDestChange: (dest: 'Staked' | 'Stash') => void;
  isExisting: boolean;
  estimatedApy: number;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const theme = useThemeStore(s => s.theme);
  const isLightMode = theme === 'light';
  const insets = useSafeAreaInsets();
  const amountNum = parseFloat(stakeAmount) || 0;
  const usdValue = amountNum * reefPrice;

  const presets = [
    {label: '25%', factor: 0.25},
    {label: '50%', factor: 0.5},
    {label: '75%', factor: 0.75},
    {label: 'MAX', factor: 1.0},
  ];

  // ─── Light Mode: Figma "Stake More REEF" design ─────────────────────────
  if (isLightMode) {
    return (
      <View style={{flex: 1, backgroundColor: '#fff7fe', paddingTop: insets.top}}>
        {/* ── Top Navigation ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            paddingHorizontal: 24,
            paddingVertical: 16,
            backgroundColor: 'rgba(255, 247, 254, 0.7)',
          }}>
          <TouchableOpacity
            onPress={onBack}
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
        </View>

        <ScrollView
          style={{flex: 1}}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 32,
            paddingBottom: 128,
          }}
          keyboardShouldPersistTaps="handled">
          {/* ── Hero Section ── */}
          <View style={{gap: 16, marginBottom: 48}}>
            <Text
              style={{
                fontSize: 36,
                fontWeight: '800',
                color: '#2c024d',
                letterSpacing: -0.9,
                lineHeight: 45,
              }}>
              {isExisting ? 'Stake More ' : 'Stake '}
              <Text style={{color: '#4e00cd'}}>REEF</Text>
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '500',
                color: '#494457',
                lineHeight: 24,
              }}>
              {isExisting
                ? 'Increase your staking position to earn greater rewards from securing Reef.'
                : 'Bond your REEF tokens to validators and earn rewards for securing the network.'}
            </Text>
          </View>

          {/* ── Amount Input Card ── */}
          <View style={{gap: 40}}>
            <View
              style={{
                backgroundColor: 'rgba(255, 247, 254, 0.7)',
                borderRadius: 48,
                borderWidth: 1,
                borderColor: 'rgba(203, 195, 218, 0.2)',
                padding: 49,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}>
              {/* Label */}
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: '#494457',
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  marginBottom: 16,
                }}>
                Amount to Stake
              </Text>

              {/* Big amount input */}
              <TextInput
                value={stakeAmount}
                onChangeText={text => {
                  if (/^\d*\.?\d*$/.test(text)) onAmountChange(text);
                }}
                placeholder="0.00"
                placeholderTextColor="#f1dbff"
                keyboardType="decimal-pad"
                textAlign="center"
                style={{
                  fontSize: 36,
                  fontWeight: '800',
                  color: '#2c024d',
                  padding: 0,
                  minWidth: 200,
                  textAlign: 'center',
                }}
              />

              {/* Balance pill */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: 'rgba(78, 0, 205, 0.05)',
                  borderRadius: 9999,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  marginTop: 16,
                }}>
                {/* Wallet icon */}
                <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h1.5M3 12v6.75A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V12M3 12V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25V12M3 12h18"
                    stroke="#4e00cd"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: '#4e00cd',
                    letterSpacing: 0.3,
                  }}>
                  BALANCE:{' '}
                  {available.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{' '}
                  REEF
                </Text>
              </View>
            </View>

            {/* ── Percentage Chips ── */}
            <View style={{flexDirection: 'row', gap: 12}}>
              {presets.map((p, idx) => {
                const isMax = p.label === 'MAX';
                return (
                  <TouchableOpacity
                    key={p.label}
                    onPress={() =>
                      onAmountChange((available * p.factor).toFixed(2))
                    }
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      height: 54,
                      borderRadius: 48,
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: isMax ? 'hidden' : undefined,
                      backgroundColor: isMax
                        ? undefined
                        : 'rgba(255, 247, 254, 0.7)',
                      borderWidth: isMax ? 0 : 1,
                      borderColor: 'rgba(203, 195, 218, 0.15)',
                      ...(isMax
                        ? {
                            shadowColor: '#b70054',
                            shadowOffset: {width: 0, height: 10},
                            shadowOpacity: 0.2,
                            shadowRadius: 15,
                            elevation: 4,
                          }
                        : {}),
                    }}>
                    {isMax && (
                      <Svg
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                        }}
                        viewBox="0 0 1 1"
                        preserveAspectRatio="none">
                        <Defs>
                          <SvgLinearGradient
                            id="maxChipGrad"
                            x1="0"
                            y1="0"
                            x2="0.3"
                            y2="1">
                            <Stop offset="0" stopColor="#b70054" />
                            <Stop offset="1" stopColor="#4e00cd" />
                          </SvgLinearGradient>
                        </Defs>
                        <Rect
                          x="0"
                          y="0"
                          width="1"
                          height="1"
                          fill="url(#maxChipGrad)"
                        />
                      </Svg>
                    )}
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: isMax ? '#fff' : '#2c024d',
                        textAlign: 'center',
                        zIndex: 1,
                      }}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Contextual Stats Bento ── */}
            <View style={{flexDirection: 'row', gap: 16}}>
              {/* Est. APR */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#fcf0ff',
                  borderRadius: 48,
                  padding: 24,
                  gap: 8,
                }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: '#494457',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}>
                  Est. APR
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: '#004d5a',
                    lineHeight: 28,
                  }}>
                  {estimatedApy > 0 ? `${estimatedApy.toFixed(1)}%` : '—'}
                </Text>
              </View>

              {/* Lock Period */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: '#fcf0ff',
                  borderRadius: 48,
                  padding: 24,
                  gap: 8,
                }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: '#494457',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}>
                  Lock Period
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '400',
                    color: '#2c024d',
                    lineHeight: 28,
                  }}>
                  28 epochs
                </Text>
              </View>
            </View>

            {/* ── Information Prompt ── */}
            <View
              style={{
                backgroundColor: 'rgba(241, 219, 255, 0.3)',
                borderRadius: 48,
                borderLeftWidth: 4,
                borderLeftColor: '#b70054',
                padding: 20,
                flexDirection: 'row',
                gap: 20,
              }}>
              {/* Info icon */}
              <Svg width={20} height={22} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  stroke="#b70054"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text
                style={{
                  flex: 1,
                  fontSize: 14,
                  color: '#494457',
                  lineHeight: 22.75,
                }}>
                {isExisting
                  ? 'Staking more REEF will update your active bonding position. Rewards will begin accumulating immediately after confirmation.'
                  : 'Your REEF will be bonded to the network. You can unstake at any time, but funds are subject to a cooling-off period before they become transferable.'}
              </Text>
            </View>

            {/* ── Reward Destination (new stakers only) ── */}
            {!isExisting && (
              <View
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  borderRadius: 32,
                  borderWidth: 1,
                  borderColor: 'rgba(203, 195, 218, 0.15)',
                  padding: 25,
                  gap: 12,
                  shadowColor: '#000',
                  shadowOffset: {width: 0, height: 1},
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: '#4e00cd',
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}>
                  Reward Destination
                </Text>
                {(['Staked', 'Stash'] as const).map(dest => (
                  <TouchableOpacity
                    key={dest}
                    onPress={() => onRewardDestChange(dest)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      borderBottomWidth: dest === 'Staked' ? 1 : 0,
                      borderBottomColor: 'rgba(203, 195, 218, 0.15)',
                    }}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        borderWidth: 2,
                        borderColor:
                          rewardDestination === dest
                            ? '#4e00cd'
                            : '#cbc3da',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}>
                      {rewardDestination === dest && (
                        <View
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: '#4e00cd',
                          }}
                        />
                      )}
                    </View>
                    <View>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '500',
                          color: '#2c024d',
                        }}>
                        {dest === 'Staked'
                          ? 'Restake (Compound)'
                          : 'Payout to Wallet'}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#494457',
                          marginTop: 2,
                        }}>
                        {dest === 'Staked'
                          ? 'Rewards are automatically restaked'
                          : 'Rewards are sent to your account'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Minimum bond info */}
            {minBond > 0 && !isExisting && (
              <Text
                style={{
                  fontSize: 12,
                  color: '#494457',
                  marginLeft: 4,
                }}>
                Minimum stake:{' '}
                {minBond.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}{' '}
                REEF
              </Text>
            )}
          </View>
        </ScrollView>

        {/* ── Fixed Bottom CTA ── */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingVertical: 24,
            backgroundColor: 'transparent',
          }}>
          <TouchableOpacity
            onPress={onConfirm}
            disabled={!amountNum || amountNum <= 0}
            activeOpacity={0.8}
            style={{
              height: 68,
              borderRadius: 9999,
              overflow: 'hidden',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 12,
              opacity: amountNum > 0 ? 1 : 0.5,
              shadowColor: '#4e00cd',
              shadowOffset: {width: 0, height: 20},
              shadowOpacity: 0.2,
              shadowRadius: 40,
              elevation: 8,
            }}>
            <Svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              viewBox="0 0 1 1"
              preserveAspectRatio="none">
              <Defs>
                <SvgLinearGradient
                  id="stakeAmtBtnGrad"
                  x1="0"
                  y1="0"
                  x2="0.3"
                  y2="1">
                  <Stop offset="0" stopColor="#b70054" />
                  <Stop offset="1" stopColor="#4e00cd" />
                </SvgLinearGradient>
              </Defs>
              <Rect
                x="0"
                y="0"
                width="1"
                height="1"
                fill="url(#stakeAmtBtnGrad)"
              />
            </Svg>
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#fff',
                zIndex: 1,
              }}>
              {isExisting ? 'Confirm Staking' : 'Select Validators'}
            </Text>
            {/* Lightning / arrow icon */}
            <Svg
              width={16}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              style={{zIndex: 1}}>
              <Path
                d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
                stroke="#fff"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Dark Mode (existing design) ────────────────────────────────────────────
  return (
    <ScrollView
      style={{flex: 1, backgroundColor: Colors.primaryBg}}
      contentContainerStyle={{padding: 16}}>
      {/* Back */}
      <TouchableOpacity onPress={onBack} style={{marginBottom: 16}}>
        <Text style={{color: Colors.purple, fontSize: 16}}>← Back</Text>
      </TouchableOpacity>

      <Text
        style={{
          fontSize: 22,
          fontWeight: '700',
          color: Colors.text,
          marginBottom: 4,
        }}>
        {isExisting ? 'Stake More REEF' : 'Stake REEF'}
      </Text>
      <Text
        style={{fontSize: 14, color: Colors.textLight, marginBottom: 24}}>
        Available: {available.toLocaleString(undefined, {maximumFractionDigits: 2})} REEF
      </Text>

      {/* Amount input */}
      <View
        style={{
          backgroundColor: Colors.cardBg,
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: Colors.grey,
          marginBottom: 16,
        }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: Colors.textLight,
            letterSpacing: 0.5,
            marginBottom: 12,
          }}>
          AMOUNT
        </Text>
        <TextInput
          value={stakeAmount}
          onChangeText={text => {
            if (/^\d*\.?\d*$/.test(text)) onAmountChange(text);
          }}
          placeholder="0.00"
          placeholderTextColor={Colors.textLight}
          keyboardType="decimal-pad"
          style={{
            fontSize: 32,
            fontWeight: '700',
            color: Colors.text,
            marginBottom: 8,
          }}
        />
        <Text style={{fontSize: 14, color: Colors.textLight}}>
          ≈ {formatUsd(usdValue)}
        </Text>

        {/* Presets */}
        <View style={{flexDirection: 'row', gap: 8, marginTop: 16}}>
          {presets.map(p => (
            <TouchableOpacity
              key={p.label}
              onPress={() =>
                onAmountChange(
                  (available * p.factor).toFixed(2),
                )
              }
              activeOpacity={0.7}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: Colors.primaryBg,
                borderWidth: 1,
                borderColor: Colors.grey,
              }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: Colors.purple,
                }}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Minimum bond info */}
      {minBond > 0 && !isExisting && (
        <Text
          style={{
            fontSize: 12,
            color: Colors.textLight,
            marginBottom: 16,
            marginLeft: 4,
          }}>
          Minimum stake: {minBond.toLocaleString(undefined, {maximumFractionDigits: 0})} REEF
        </Text>
      )}

      {/* Reward destination */}
      {!isExisting && (
        <View
          style={{
            backgroundColor: Colors.cardBg,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: Colors.grey,
            marginBottom: 24,
          }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: Colors.textLight,
              letterSpacing: 0.5,
              marginBottom: 12,
            }}>
            REWARD DESTINATION
          </Text>
          {(['Staked', 'Stash'] as const).map(dest => (
            <TouchableOpacity
              key={dest}
              onPress={() => onRewardDestChange(dest)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                borderBottomWidth: dest === 'Staked' ? 1 : 0,
                borderBottomColor: Colors.grey,
              }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor:
                    rewardDestination === dest
                      ? Colors.purple
                      : Colors.grey,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}>
                {rewardDestination === dest && (
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: Colors.purple,
                    }}
                  />
                )}
              </View>
              <View>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '500',
                    color: Colors.text,
                  }}>
                  {dest === 'Staked' ? 'Restake (Compound)' : 'Payout to Wallet'}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: Colors.textLight,
                    marginTop: 2,
                  }}>
                  {dest === 'Staked'
                    ? 'Rewards are automatically restaked'
                    : 'Rewards are sent to your account'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Continue button */}
      <TouchableOpacity
        onPress={onConfirm}
        disabled={!amountNum || amountNum <= 0}
        activeOpacity={0.7}
        style={{
          backgroundColor:
            amountNum > 0 ? Colors.purple : Colors.grey,
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: 'center',
        }}>
        <Text
          style={{
            color: amountNum > 0 ? '#fff' : Colors.textLight,
            fontSize: 16,
            fontWeight: '600',
          }}>
          {isExisting ? 'Confirm' : 'Select Validators'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// --- Validator Selection View ---

function ValidatorSelectView({
  validators,
  selectedValidators,
  onToggle,
  loading,
  onConfirm,
  onBack,
  title = 'Select Validators',
  confirmLabel,
}: {
  validators: ValidatorInfo[];
  selectedValidators: string[];
  onToggle: (address: string) => void;
  loading: boolean;
  onConfirm: () => void;
  onBack: () => void;
  title?: string;
  confirmLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = [...validators].filter(v => !v.isBlocked);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        v =>
          v.address.toLowerCase().includes(q) ||
          (v.identity && v.identity.toLowerCase().includes(q)),
      );
    }

    // Sort: selected first, then by stake
    list.sort((a, b) => {
      const aSelected = selectedValidators.includes(a.address) ? 1 : 0;
      const bSelected = selectedValidators.includes(b.address) ? 1 : 0;
      if (bSelected !== aSelected) return bSelected - aSelected;
      return parseFloat(b.totalStake) - parseFloat(a.totalStake);
    });

    return list;
  }, [validators, search, selectedValidators]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.primaryBg,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <ActivityIndicator size="large" color={Colors.purple} />
        <Text style={{color: Colors.textLight, fontSize: 14, marginTop: 12}}>
          Loading validators...
        </Text>
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: Colors.primaryBg, paddingTop: insets.top}}>
      {/* Header */}
      <View style={{padding: 16, paddingBottom: 0}}>
        <TouchableOpacity onPress={onBack} style={{marginBottom: 16}}>
          <Text style={{color: Colors.purple, fontSize: 16}}>← Back</Text>
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: Colors.text,
            marginBottom: 4,
          }}>
          {title}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: Colors.textLight,
            marginBottom: 16,
          }}>
          {selectedValidators.length} selected · max 16 recommended
        </Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or address..."
          placeholderTextColor={Colors.textLight}
          autoCapitalize="none"
          style={{
            backgroundColor: Colors.cardBg,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 15,
            color: Colors.text,
            borderWidth: 1,
            borderColor: Colors.grey,
            marginBottom: 12,
          }}
        />
      </View>

      {/* Validator list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.address}
        renderItem={({item}) => (
          <TouchableOpacity
            onPress={() => onToggle(item.address)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: selectedValidators.includes(item.address)
                ? Colors.purple + '10'
                : Colors.cardBg,
              marginHorizontal: 16,
              marginBottom: 8,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: selectedValidators.includes(item.address)
                ? Colors.purple
                : Colors.grey,
            }}>
            {/* Checkbox */}
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: selectedValidators.includes(item.address)
                  ? Colors.purple
                  : Colors.grey,
                backgroundColor: selectedValidators.includes(item.address)
                  ? Colors.purple
                  : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
              {selectedValidators.includes(item.address) && (
                <Text
                  style={{color: '#fff', fontSize: 14, fontWeight: '700'}}>
                  ✓
                </Text>
              )}
            </View>

            {/* Validator info */}
            <View style={{flex: 1}}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: Colors.text,
                }}
                numberOfLines={1}>
                {item.identity ?? shortenAddress(item.address)}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: Colors.textLight,
                  marginTop: 2,
                }}>
                {item.commission.toFixed(1)}% comm · {formatReef(item.totalStake)} staked
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{paddingBottom: 100}}
      />

      {/* Confirm button */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          backgroundColor: Colors.primaryBg,
          borderTopWidth: 1,
          borderTopColor: Colors.grey,
        }}>
        <TouchableOpacity
          onPress={onConfirm}
          disabled={selectedValidators.length === 0}
          activeOpacity={0.7}
          style={{
            backgroundColor:
              selectedValidators.length > 0
                ? Colors.purple
                : Colors.grey,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
          }}>
          <Text
            style={{
              color:
                selectedValidators.length > 0
                  ? '#fff'
                  : Colors.textLight,
              fontSize: 16,
              fontWeight: '600',
            }}>
            {confirmLabel ?? `Continue with ${selectedValidators.length} Validator${selectedValidators.length !== 1 ? 's' : ''}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- Confirm View ---

function StakeConfirmView({
  amount,
  reefPrice,
  validators,
  allValidators,
  rewardDestination,
  isExisting,
  estimatedFee,
  estimatedApy,
  onConfirm,
  onBack,
}: {
  amount: string;
  reefPrice: number;
  validators: string[];
  allValidators: ValidatorInfo[];
  rewardDestination: 'Staked' | 'Stash';
  isExisting: boolean;
  estimatedFee: string | null;
  estimatedApy: number;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const theme = useThemeStore(s => s.theme);
  const isLightMode = theme === 'light';
  const amountNum = parseFloat(amount) || 0;
  const validatorMap = new Map(allValidators.map(v => [v.address, v]));
  const usdValue = amountNum * reefPrice;
  const feeNum = estimatedFee ? parseFloat(estimatedFee) / 1e18 : 0;
  const feeUsd = feeNum * reefPrice;

  // Show first 2 validators, collapse the rest
  const MAX_SHOWN = 2;
  const shownValidators = validators.slice(0, MAX_SHOWN);
  const remainingCount = validators.length - MAX_SHOWN;

  // ─── Light Mode: Figma "Confirm Staking" design ─────────────────────────
  if (isLightMode) {
    return (
      <ScrollView
        style={{flex: 1, backgroundColor: '#fff7fe'}}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 0,
          paddingBottom: 130,
        }}>
        {/* ── Top App Bar ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 16,
          }}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 17}}>
            <TouchableOpacity
              onPress={onBack}
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
            <Text
              style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#2c024d',
                letterSpacing: -0.5,
              }}>
              Confirm Staking
            </Text>
          </View>
        </View>

        {/* ── Summary Section ── */}
        <View style={{gap: 16, marginTop: 32}}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: '#2c024d',
              letterSpacing: -0.6,
              paddingHorizontal: 4,
            }}>
            Summary
          </Text>

          {/* Summary Card */}
          <View
            style={{
              backgroundColor: 'rgba(255, 247, 254, 0.7)',
              borderRadius: 32,
              borderWidth: 1,
              borderColor: 'rgba(203, 195, 218, 0.15)',
              padding: 25,
              gap: 24,
              shadowColor: '#4e00cd',
              shadowOffset: {width: 0, height: 20},
              shadowOpacity: 0.06,
              shadowRadius: 40,
              elevation: 4,
            }}>
            {/* Amount hero */}
            <View
              style={{
                alignItems: 'center',
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(203, 195, 218, 0.1)',
              }}>
              {/* Staking layers icon */}
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(78, 0, 205, 0.05)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16,
                }}>
                <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0L21.75 16.5 12 21.75 2.25 16.5l4.179-2.25m0 0l5.571 3 5.571-3"
                    stroke="#4e00cd"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: '800',
                  color: '#2c024d',
                  letterSpacing: -1.8,
                  textAlign: 'center',
                }}>
                {amountNum.toLocaleString()} REEF
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: '#494457',
                  textAlign: 'center',
                  marginTop: 4,
                }}>
                ≈ {formatUsd(usdValue)} USD
              </Text>
            </View>

            {/* Details rows */}
            <View style={{gap: 16}}>
              {/* Staking Duration */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                <Text style={{fontSize: 14, color: '#494457'}}>
                  Staking Duration
                </Text>
                <Text
                  style={{fontSize: 14, fontWeight: '600', color: '#2c024d'}}>
                  Flexible / No Lock
                </Text>
              </View>

              {/* Estimated Fee */}
              {estimatedFee && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                  <Text style={{fontSize: 14, color: '#494457'}}>
                    Estimated Fee
                  </Text>
                  <View style={{alignItems: 'flex-end'}}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#2c024d',
                      }}>
                      {formatReef(estimatedFee)} REEF
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: '#494457',
                        letterSpacing: 1,
                        textTransform: 'uppercase',
                      }}>
                      {feeUsd < 0.01 ? '< $0.01' : formatUsd(feeUsd)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Estimated Rewards */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                <Text style={{fontSize: 14, color: '#494457'}}>
                  Estimated Rewards
                </Text>
                <Text
                  style={{fontSize: 14, fontWeight: '700', color: '#b70054'}}>
                  {estimatedApy > 0 ? `~${estimatedApy.toFixed(1)}% APY` : '—'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Validators Section ── */}
        {validators.length > 0 && (
          <View style={{gap: 16, marginTop: 32}}>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                paddingHorizontal: 4,
              }}>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: '#2c024d',
                  letterSpacing: -0.6,
                }}>
                Validators
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#4e00cd',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                }}>
                {validators.length} Selected
              </Text>
            </View>

            {/* Validator Cards */}
            <View style={{gap: 12}}>
              {shownValidators.map(addr => {
                const v = validatorMap.get(addr);
                return (
                  <View
                    key={addr}
                    style={{
                      backgroundColor: '#fcf0ff',
                      borderRadius: 32,
                      padding: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 16,
                        flex: 1,
                      }}>
                      {/* Validator avatar with gradient border */}
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          overflow: 'hidden',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                        <Svg
                          style={{position: 'absolute'}}
                          width={40}
                          height={40}
                          viewBox="0 0 40 40">
                          <Defs>
                            <SvgLinearGradient
                              id={`valGrad-${addr.slice(-4)}`}
                              x1="0"
                              y1="0"
                              x2="40"
                              y2="40"
                              gradientUnits="userSpaceOnUse">
                              <Stop offset="0" stopColor="#4e00cd" />
                              <Stop offset="1" stopColor="#b70054" />
                            </SvgLinearGradient>
                          </Defs>
                          <Rect
                            width={40}
                            height={40}
                            rx={20}
                            fill={`url(#valGrad-${addr.slice(-4)})`}
                          />
                          {/* Inner white circle */}
                          <Rect
                            x={1}
                            y={1}
                            width={38}
                            height={38}
                            rx={19}
                            fill="#fff"
                          />
                        </Svg>
                        {/* Fallback person icon */}
                        <Svg
                          width={18}
                          height={18}
                          viewBox="0 0 24 24"
                          fill="none"
                          style={{zIndex: 1}}>
                          <Path
                            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                            stroke="#4e00cd"
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      </View>

                      {/* Name + Commission */}
                      <View style={{flex: 1}}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '700',
                            color: '#2c024d',
                            lineHeight: 24,
                          }}
                          numberOfLines={1}>
                          {v?.identity ?? shortenAddress(addr)}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: '#494457',
                            lineHeight: 16,
                          }}>
                          Commission:{' '}
                          {v ? `${v.commission.toFixed(0)}%` : 'N/A'}
                        </Text>
                      </View>
                    </View>

                    {/* Shield checkmark icon */}
                    <Svg width={16} height={20} viewBox="0 0 20 24" fill="none">
                      <Path
                        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                        stroke="#4e00cd"
                        strokeWidth={1.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>
                );
              })}

              {/* "+N Other Validator" ghost card */}
              {remainingCount > 0 && (
                <View
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    borderRadius: 32,
                    borderWidth: 1,
                    borderColor: '#cbc3da',
                    borderStyle: 'dashed',
                    padding: 17,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: '#494457',
                      letterSpacing: 1.2,
                      textTransform: 'uppercase',
                    }}>
                    +{remainingCount} Other Validator
                    {remainingCount > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Safety Notice ── */}
        <View
          style={{
            backgroundColor: 'rgba(78, 0, 205, 0.05)',
            borderRadius: 32,
            borderWidth: 1,
            borderColor: 'rgba(78, 0, 205, 0.1)',
            padding: 17,
            flexDirection: 'row',
            gap: 16,
            marginTop: 32,
          }}>
          {/* Info icon */}
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              stroke="#4e00cd"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text
            style={{
              flex: 1,
              fontSize: 12,
              color: '#494457',
              lineHeight: 19.5,
            }}>
            Staking funds will be moved to a bonded state. You can unstake at
            any time, but funds may be subject to a cooling-off period before
            they become transferable.
          </Text>
        </View>

        {/* ── Confirm & Sign Button ── */}
        <TouchableOpacity
          onPress={onConfirm}
          activeOpacity={0.8}
          style={{
            height: 64,
            borderRadius: 9999,
            overflow: 'hidden',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            marginTop: 32,
            shadowColor: '#b70054',
            shadowOffset: {width: 0, height: 10},
            shadowOpacity: 0.3,
            shadowRadius: 30,
            elevation: 8,
          }}>
          <Svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            viewBox="0 0 1 1"
            preserveAspectRatio="none">
            <Defs>
              <SvgLinearGradient
                id="confirmBtnGrad"
                x1="0"
                y1="0"
                x2="0.3"
                y2="1">
                <Stop offset="0" stopColor="#b70054" />
                <Stop offset="1" stopColor="#4e00cd" />
              </SvgLinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width="1"
              height="1"
              fill="url(#confirmBtnGrad)"
            />
          </Svg>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#fff',
              zIndex: 1,
            }}>
            Confirm & Sign
          </Text>
          {/* Pen/sign icon */}
          <Svg
            width={19}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            style={{zIndex: 1}}>
            <Path
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              stroke="#fff"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Dark Mode (existing design) ────────────────────────────────────────────
  return (
    <ScrollView
      style={{flex: 1, backgroundColor: Colors.primaryBg}}
      contentContainerStyle={{padding: 16}}>
      <TouchableOpacity onPress={onBack} style={{marginBottom: 16}}>
        <Text style={{color: Colors.purple, fontSize: 16}}>← Back</Text>
      </TouchableOpacity>

      <Text
        style={{
          fontSize: 22,
          fontWeight: '700',
          color: Colors.text,
          marginBottom: 24,
        }}>
        Confirm Staking
      </Text>

      {/* Amount card */}
      <View
        style={{
          backgroundColor: Colors.cardBg,
          borderRadius: 16,
          padding: 20,
          borderWidth: 1,
          borderColor: Colors.grey,
          marginBottom: 16,
        }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: Colors.textLight,
            letterSpacing: 0.5,
            marginBottom: 16,
          }}>
          STAKING DETAILS
        </Text>

        <InfoRow label="Amount" value={`${amount} REEF`} />
        <InfoRow label="Value" value={formatUsd(amountNum * reefPrice)} />
        {!isExisting && (
          <InfoRow
            label="Rewards"
            value={
              rewardDestination === 'Staked'
                ? 'Restake (Compound)'
                : 'Payout to Wallet'
            }
          />
        )}
        {estimatedFee && (
          <InfoRow label="Est. Fee" value={`${formatReef(estimatedFee)} REEF`} />
        )}
      </View>

      {/* Validators card */}
      {validators.length > 0 && (
        <View
          style={{
            backgroundColor: Colors.cardBg,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: Colors.grey,
            marginBottom: 24,
          }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: Colors.textLight,
              letterSpacing: 0.5,
              marginBottom: 12,
            }}>
            NOMINATED VALIDATORS ({validators.length})
          </Text>
          {validators.map(addr => {
            const v = validatorMap.get(addr);
            return (
              <View
                key={addr}
                style={{
                  paddingVertical: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.grey,
                }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: Colors.text,
                  }}
                  numberOfLines={1}>
                  {v?.identity ?? shortenAddress(addr)}
                </Text>
                {v && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: Colors.textLight,
                      marginTop: 2,
                    }}>
                    {v.commission.toFixed(1)}% commission
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Confirm button */}
      <TouchableOpacity
        onPress={onConfirm}
        activeOpacity={0.7}
        style={{
          backgroundColor: Colors.purple,
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: 'center',
        }}>
        <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>
          Confirm & Sign
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// =====================================================
// Shared Components
// =====================================================

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.grey,
      }}>
      <Text style={{fontSize: 14, color: Colors.textLight}}>{label}</Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: valueColor ?? Colors.text,
        }}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Shows per-chunk unbonding details with eras remaining and estimated time.
 * Reef era ≈ 24 hours.
 */
function UnbondingDetails({
  unlocking,
  activeEra,
}: {
  unlocking: {value: string; era: number}[];
  activeEra: number;
}) {
  if (unlocking.length === 0) return null;

  const totalUnbonding = unlocking.reduce(
    (sum, c) => sum + parseFloat(c.value) / 1e18,
    0,
  );

  return (
    <View style={{paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.grey}}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6}}>
        <Text style={{fontSize: 14, color: Colors.textLight}}>Unbonding</Text>
        <Text style={{fontSize: 14, fontWeight: '600', color: Colors.text}}>
          {totalUnbonding.toLocaleString(undefined, {maximumFractionDigits: 2})} REEF
        </Text>
      </View>
      {unlocking.map((chunk, idx) => {
        const amount = parseFloat(chunk.value) / 1e18;
        const erasLeft = Math.max(0, chunk.era - activeEra);
        const isReady = erasLeft === 0;
        // Reef era ≈ 24 hours
        const hoursLeft = erasLeft * 24;
        const daysLeft = Math.floor(hoursLeft / 24);
        const remainingHours = hoursLeft % 24;

        let timeStr = '';
        if (isReady) {
          timeStr = 'Ready to withdraw';
        } else if (daysLeft > 0) {
          timeStr = `~${daysLeft}d ${remainingHours}h remaining (${erasLeft} eras)`;
        } else {
          timeStr = `~${remainingHours}h remaining (${erasLeft} eras)`;
        }

        return (
          <View
            key={idx}
            style={{
              backgroundColor: isReady ? '#e8f5e9' : Colors.primaryBg,
              borderRadius: 8,
              padding: 10,
              marginTop: 4,
            }}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
              <Text style={{fontSize: 13, fontWeight: '600', color: Colors.text}}>
                {amount.toLocaleString(undefined, {maximumFractionDigits: 2})} REEF
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: isReady ? Colors.green : Colors.purple,
                }}>
                Era #{chunk.era}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: isReady ? Colors.green : Colors.textLight,
                marginTop: 2,
              }}>
              {timeStr}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ValidatorCard({
  validator,
  isNominated,
}: {
  validator: ValidatorInfo;
  isNominated: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: Colors.cardBg,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: isNominated ? Colors.purple + '50' : Colors.grey,
        borderLeftWidth: isNominated ? 3 : 1,
        borderLeftColor: isNominated ? Colors.purple : Colors.grey,
      }}>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        {/* Avatar */}
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
          <Text
            style={{fontSize: 14, fontWeight: '700', color: Colors.purple}}>
            {(validator.identity ?? validator.address).charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{flex: 1}}>
          <Text
            style={{fontSize: 14, fontWeight: '600', color: Colors.purpleLight}}
            numberOfLines={1}>
            {validator.identity ?? shortenAddress(validator.address)}
          </Text>
          {validator.identity && (
            <Text
              style={{
                fontSize: 11,
                color: Colors.textLight,
                fontFamily: 'monospace',
                marginTop: 1,
              }}>
              {shortenAddress(validator.address)}
            </Text>
          )}
        </View>

        {isNominated && (
          <View
            style={{
              backgroundColor: Colors.purple + '20',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
              marginLeft: 8,
            }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '600',
                color: Colors.purple,
              }}>
              NOMINATED
            </Text>
          </View>
        )}
      </View>

      {/* Stats row */}
      <View style={{flexDirection: 'row', marginTop: 10, gap: 16}}>
        <View>
          <Text
            style={{fontSize: 11, color: Colors.textLight, marginBottom: 2}}>
            Commission
          </Text>
          <Text style={{fontSize: 13, fontWeight: '600', color: Colors.purpleLight}}>
            {validator.commission.toFixed(1)}%
          </Text>
        </View>
        <View>
          <Text
            style={{fontSize: 11, color: Colors.textLight, marginBottom: 2}}>
            Total Staked
          </Text>
          <Text style={{fontSize: 13, fontWeight: '600', color: Colors.purpleLight}}>
            {formatReef(validator.totalStake)}
          </Text>
        </View>
        <View>
          <Text
            style={{fontSize: 11, color: Colors.textLight, marginBottom: 2}}>
            Nominators
          </Text>
          <Text style={{fontSize: 13, fontWeight: '600', color: Colors.purpleLight}}>
            {validator.nominatorCount}
          </Text>
        </View>
      </View>
    </View>
  );
}
