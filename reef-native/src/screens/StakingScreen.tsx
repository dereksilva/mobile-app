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
    if (activeTab === 'validators' || flow === 'validators') {
      loadValidators();
    }
  }, [activeTab, flow, loadValidators]);

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
                activeTab === tab.key ? '#fff' : 'transparent',
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
                  activeTab === tab.key ? Colors.text : Colors.textLight,
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
              backgroundColor: '#fff',
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
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: Colors.grey,
            marginBottom: 16,
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
                  color: Colors.purple,
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
            style={{
              backgroundColor: Colors.purple,
              borderRadius: 24,
              paddingVertical: 14,
              alignItems: 'center',
              marginTop: 16,
              shadowColor: Colors.purple,
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
            backgroundColor: '#fff',
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
            YOUR STAKING
          </Text>

          <InfoRow label="Staked" value={`${formatReef(ledger?.active ?? '0')} REEF`} />
          <InfoRow
            label="Staked Value"
            value={formatUsd(stakedBalance * reefPrice)}
          />
          {unbondingBalance > 0 && (
            <InfoRow
              label="Unbonding"
              value={`${unbondingBalance.toLocaleString(undefined, {maximumFractionDigits: 2})} REEF`}
            />
          )}
          {nominations && nominations.length > 0 && (
            <InfoRow
              label="Nominated"
              value={`${nominations.length} validator${nominations.length !== 1 ? 's' : ''}`}
            />
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
            {unbondingBalance > 0 && (
              <TouchableOpacity
                onPress={onWithdraw}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  backgroundColor: Colors.green,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}>
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: '600',
                  }}>
                  Withdraw
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Network Stats Card */}
      {stakingInfo && (
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: Colors.grey,
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
            backgroundColor: '#fff',
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
                backgroundColor: sortBy === s ? Colors.purple : '#fff',
                borderWidth: 1,
                borderColor: sortBy === s ? Colors.purple : Colors.grey,
              }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: sortBy === s ? '#fff' : Colors.text,
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
              backgroundColor: '#fff',
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
                  backgroundColor: '#fff',
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
  onConfirm: () => void;
  onBack: () => void;
}) {
  const amountNum = parseFloat(stakeAmount) || 0;
  const usdValue = amountNum * reefPrice;

  const presets = [
    {label: '25%', factor: 0.25},
    {label: '50%', factor: 0.5},
    {label: '75%', factor: 0.75},
    {label: 'MAX', factor: 1.0},
  ];

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
          backgroundColor: '#fff',
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
            backgroundColor: '#fff',
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
}: {
  validators: ValidatorInfo[];
  selectedValidators: string[];
  onToggle: (address: string) => void;
  loading: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
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
    <View style={{flex: 1, backgroundColor: Colors.primaryBg}}>
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
          Select Validators
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
            backgroundColor: '#fff',
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
                : '#fff',
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
            Continue with {selectedValidators.length} Validator
            {selectedValidators.length !== 1 ? 's' : ''}
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
  onConfirm: () => void;
  onBack: () => void;
}) {
  const amountNum = parseFloat(amount) || 0;
  const validatorMap = new Map(allValidators.map(v => [v.address, v]));

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
          backgroundColor: '#fff',
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
            backgroundColor: '#fff',
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
        backgroundColor: '#fff',
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
            style={{fontSize: 14, fontWeight: '600', color: Colors.text}}
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
          <Text style={{fontSize: 13, fontWeight: '600', color: Colors.text}}>
            {validator.commission.toFixed(1)}%
          </Text>
        </View>
        <View>
          <Text
            style={{fontSize: 11, color: Colors.textLight, marginBottom: 2}}>
            Total Staked
          </Text>
          <Text style={{fontSize: 13, fontWeight: '600', color: Colors.text}}>
            {formatReef(validator.totalStake)}
          </Text>
        </View>
        <View>
          <Text
            style={{fontSize: 11, color: Colors.textLight, marginBottom: 2}}>
            Nominators
          </Text>
          <Text style={{fontSize: 13, fontWeight: '600', color: Colors.text}}>
            {validator.nominatorCount}
          </Text>
        </View>
      </View>
    </View>
  );
}
