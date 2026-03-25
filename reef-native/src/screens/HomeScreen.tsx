/**
 * HomeScreen — main dashboard with balance, tokens, NFTs, activity.
 * Mirrors home_page.dart from Flutter.
 *
 * Sub-screens:
 * - Balance header with send/receive actions
 * - Token list tab
 * - NFT grid tab
 * - Activity tab
 * - Inline navigation to Send, SendNFT, and Receive screens
 */

import React, {useState, useMemo, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {TokenBalance, NFT, TransactionRecord} from '../types';
import {useAccountStore} from '../stores/useAccountStore';
import {useTokenStore} from '../stores/useTokenStore';
import {useAppConfigStore} from '../stores/useAppConfigStore';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import {Colors, useColors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';
import {useStakingStore} from '../stores/useStakingStore';
import SendScreen from './SendScreen';
import SendNFTScreen from './SendNFTScreen';
import ReceiveScreen from './ReceiveScreen';
import BuyScreen from './BuyScreen';
import DAppBrowserScreen from './DAppBrowserScreen';

type SubScreen = 'home' | 'send' | 'sendNft' | 'receive' | 'buy' | 'dapp';
type HomeTab = 'tokens' | 'nfts' | 'activity';

export default function HomeScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const selectedAddress = useAccountStore(s => s.selectedAddress);
  const accountsData = useAccountStore(s => s.accounts);
  const accounts = accountsData.data ?? [];
  const tokensData = useTokenStore(s => s.selectedErc20s);
  const tokens = tokensData.data ?? [];
  const nftsData = useTokenStore(s => s.selectedNFTs);
  const nfts = nftsData.data ?? [];
  const txHistoryData = useTokenStore(s => s.txHistory);
  const txHistory = txHistoryData.data ?? [];
  const reefPrice = useTokenStore(s => s.reefPrice);
  const stakingApy = useStakingStore(s => s.estimatedApy);
  const displayBalance = useAppConfigStore(s => s.displayBalance);
  const toggleDisplayBalance = useAppConfigStore(s => s.toggleDisplayBalance);

  const [subScreen, setSubScreen] = useState<SubScreen>('home');
  const [activeTab, setActiveTab] = useState<HomeTab>('tokens');
  const [sendToken, setSendToken] = useState<TokenBalance | undefined>();
  const [sendNft, setSendNft] = useState<NFT | null>(null);

  const selectedAccount = useMemo(
    () => accounts.find(a => a.address === selectedAddress) ?? null,
    [accounts, selectedAddress],
  );

  // Calculate total USD balance
  const totalUsdBalance = useMemo(() => {
    return tokens.reduce((sum, tk) => {
      const bal = parseFloat(tk.balance) / Math.pow(10, tk.decimals);
      return sum + bal * tk.price;
    }, 0);
  }, [tokens]);

  // Sub-screen routing
  if (subScreen === 'send') {
    return (
      <SendScreen
        onClose={() => {
          setSubScreen('home');
          setSendToken(undefined);
        }}
        initialToken={sendToken}
      />
    );
  }

  if (subScreen === 'sendNft' && sendNft) {
    return (
      <SendNFTScreen
        nft={sendNft}
        onClose={() => {
          setSubScreen('home');
          setSendNft(null);
        }}
      />
    );
  }

  if (subScreen === 'receive' && selectedAccount) {
    return (
      <ReceiveScreen
        account={selectedAccount}
        onClose={() => setSubScreen('home')}
      />
    );
  }

  if (subScreen === 'buy') {
    return <BuyScreen onBack={() => setSubScreen('home')} />;
  }

  if (subScreen === 'dapp') {
    return <DAppBrowserScreen onBack={() => setSubScreen('home')} />;
  }

  const theme = useThemeStore.getState().theme;
  const isLight = theme === 'light';

  // Shared tab content
  const tabContent = (
    <>
      {activeTab === 'tokens' && (
        <TokenList
          tokens={tokens}
          displayBalance={displayBalance}
          onSend={token => {
            setSendToken(token);
            setSubScreen('send');
          }}
        />
      )}
      {activeTab === 'nfts' && (
        <NFTGrid
          nfts={nfts}
          onSend={nft => {
            setSendNft(nft);
            setSubScreen('sendNft');
          }}
        />
      )}
      {activeTab === 'activity' && <ActivityList txHistory={txHistory} />}
    </>
  );

  const balanceString = displayBalance
    ? `$${totalUsdBalance.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '••••••';

  // ─── Light Mode: Fluid Ecosystem design ────────────────────────────────────
  if (isLight) {
    const actionButtons = [
      {
        label: 'Send',
        icon: 'M6 18L18 6M18 6H9M18 6V15',
        onPress: () => setSubScreen('send'),
      },
      {
        label: 'Receive',
        icon: 'M18 6L6 18M6 18H15M6 18V9',
        onPress: () => setSubScreen('receive'),
      },
      {
        label: 'Buy',
        icon: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z',
        onPress: () => setSubScreen('buy'),
      },
      {
        label: 'dApps',
        icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
        onPress: () => setSubScreen('dapp'),
      },
    ];

    return (
      <ScrollView
        style={{flex: 1, backgroundColor: '#fff7fe'}}
        contentContainerStyle={{paddingHorizontal: 24, paddingBottom: 40, gap: 40}}>

        {/* ── Balance Section ── */}
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
            viewBox="0 0 342 196"
            preserveAspectRatio="none">
            <Defs>
              <RadialGradient id="balanceGrad" cx="171" cy="98" r="197" gradientUnits="userSpaceOnUse">
                <Stop offset="0" stopColor="#b70054" stopOpacity={0.15} />
                <Stop offset="0.5" stopColor="#4e00cd" stopOpacity={0.05} />
                <Stop offset="1" stopColor="#4e00cd" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="342" height="196" fill="url(#balanceGrad)" />
          </Svg>

          <Text style={{
            fontSize: 14,
            fontWeight: '400',
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: '#494457',
          }}>
            Total Balance
          </Text>
          <TouchableOpacity onPress={toggleDisplayBalance} activeOpacity={0.7}>
            <Text style={{
              fontSize: 48,
              fontWeight: '800',
              color: '#2c024d',
              letterSpacing: -2.4,
              paddingBottom: 4,
            }}>
              {balanceString}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Quick Actions ── */}
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          {actionButtons.map(btn => (
            <TouchableOpacity
              key={btn.label}
              onPress={btn.onPress}
              activeOpacity={0.8}
              style={{alignItems: 'center', gap: 8, paddingHorizontal: 8.75}}>
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                overflow: 'hidden',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#4e00cd',
                shadowOffset: {width: 0, height: 10},
                shadowOpacity: 0.2,
                shadowRadius: 15,
                elevation: 8,
              }}>
                {/* Gradient background */}
                <Svg
                  style={{position: 'absolute', top: 0, left: 0}}
                  width={56}
                  height={56}
                  viewBox="0 0 56 56">
                  <Defs>
                    <SvgLinearGradient id={`btnGrad-${btn.label}`} x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                      <Stop offset="0" stopColor="#b70054" />
                      <Stop offset="1" stopColor="#4e00cd" />
                    </SvgLinearGradient>
                  </Defs>
                  <Rect width="56" height="56" rx="28" fill={`url(#btnGrad-${btn.label})`} />
                </Svg>
                {/* Icon */}
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{zIndex: 1}}>
                  <Path d={btn.icon} stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>
              <Text style={{fontSize: 12, fontWeight: '600', color: '#494457'}}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Content Tabs Section ── */}
        <View style={{gap: 24, paddingTop: 8}}>
          {/* Tab bar */}
          <View style={{
            flexDirection: 'row',
            gap: 32,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(203, 195, 218, 0.2)',
            paddingHorizontal: 8,
          }}>
            {(['tokens', 'nfts', 'activity'] as HomeTab[]).map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
                style={{
                  paddingBottom: 18,
                  borderBottomWidth: 2,
                  borderBottomColor: activeTab === tab ? '#4e00cd' : 'transparent',
                  marginBottom: -1,
                }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: activeTab === tab ? '600' : '500',
                  color: activeTab === tab ? '#4e00cd' : 'rgba(73, 68, 87, 0.6)',
                  letterSpacing: 0.35,
                  textTransform: 'uppercase',
                }}>
                  {t(tab)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab content */}
          {tabContent}
        </View>

        {/* ── Stake & Earn Promotional Card ── */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Staking' as never)}
          style={{
            borderRadius: 32,
            overflow: 'hidden',
            paddingHorizontal: 32,
            paddingTop: 40,
            paddingBottom: 32,
            shadowColor: '#4e00cd',
            shadowOffset: {width: 0, height: 20},
            shadowOpacity: 0.2,
            shadowRadius: 25,
            elevation: 12,
          }}>
          {/* Gradient background */}
          <Svg
            style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
            viewBox="0 0 1 1"
            preserveAspectRatio="none">
            <Defs>
              <SvgLinearGradient id="promoGrad" x1="0" y1="0" x2="0.7" y2="1">
                <Stop offset="0" stopColor="#4e00cd" />
                <Stop offset="1" stopColor="#b70054" />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width="1" height="1" fill="url(#promoGrad)" />
          </Svg>
          {/* Decorative 4-point star */}
          <View style={{position: 'absolute', bottom: -40, right: -40, opacity: 0.15}}>
            <Svg width={192} height={192} viewBox="0 0 192 192" fill="none">
              <Path
                d="M96 0C96 53.019 138.981 96 192 96C138.981 96 96 138.981 96 192C96 138.981 53.019 96 0 96C53.019 96 96 53.019 96 0Z"
                fill="white"
              />
            </Svg>
          </View>
          {/* Card content */}
          <View style={{gap: 8, maxWidth: 205}}>
            <Text style={{fontSize: 24, fontWeight: '700', color: '#fff', lineHeight: 30}}>
              Stake & Earn{'\n'}Rewards
            </Text>
            <Text style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.8)',
              lineHeight: 20,
              paddingBottom: 16,
            }}>
              Contribute to the reef{'\n'}ecosystem and earn up to{'\n'}{stakingApy > 0 ? `${stakingApy.toFixed(0)}%` : ''} APR.
            </Text>
            <View style={{
              alignSelf: 'flex-start',
              backgroundColor: '#fff',
              borderRadius: 9999,
              paddingHorizontal: 24,
              paddingVertical: 8,
            }}>
              <Text style={{fontSize: 14, fontWeight: '600', color: '#4e00cd'}}>
                Start Staking
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Dark Mode: existing layout ────────────────────────────────────────────
  return (
    <ScrollView
      style={{flex: 1, backgroundColor: Colors.primaryBg}}
      contentContainerStyle={{padding: 16}}>
      {/* Balance header — hero card */}
      <View
        style={{
          backgroundColor: Colors.darkBg,
          borderRadius: 24,
          padding: 28,
          marginBottom: 20,
          alignItems: 'center',
        }}>
        {/* Balance display */}
        <TouchableOpacity onPress={toggleDisplayBalance} activeOpacity={0.7}>
          <Text
            style={{
              fontSize: 36,
              fontWeight: '800',
              color: Colors.white,
              marginBottom: 4,
              letterSpacing: -0.5,
            }}>
            {balanceString}
          </Text>
        </TouchableOpacity>
        <Text style={{fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 24}}>
          {t('balance')}
        </Text>

        {/* Action buttons */}
        <View style={{flexDirection: 'row', gap: 12, width: '100%'}}>
          <TouchableOpacity
            onPress={() => setSubScreen('send')}
            activeOpacity={0.7}
            accessibilityLabel="Send tokens"
            style={{
              flex: 1,
              backgroundColor: Colors.accent,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
            }}>
            <Text style={{color: '#fff', fontSize: 15, fontWeight: '700'}}>
              ↑ {t('send')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSubScreen('receive')}
            activeOpacity={0.7}
            accessibilityLabel="Receive tokens"
            style={{
              flex: 1,
              backgroundColor: Colors.purpleDark,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: 'center',
            }}>
            <Text style={{color: '#fff', fontSize: 15, fontWeight: '700'}}>
              ↓ Receive
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick actions row */}
        <View style={{flexDirection: 'row', gap: 12, width: '100%', marginTop: 12}}>
          <TouchableOpacity
            onPress={() => setSubScreen('buy')}
            activeOpacity={0.7}
            accessibilityLabel="Buy REEF"
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 14,
              paddingVertical: 12,
              alignItems: 'center',
            }}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" stroke="rgba(255,255,255,0.8)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={{color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600'}}>
                Buy
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSubScreen('dapp')}
            activeOpacity={0.7}
            accessibilityLabel="Open dApp browser"
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: 14,
              paddingVertical: 12,
              alignItems: 'center',
            }}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" stroke="rgba(255,255,255,0.8)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={{color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600'}}>
                dApps
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab switcher */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: Colors.cardBg,
          borderRadius: 14,
          padding: 4,
          marginBottom: 16,
        }}>
        {(['tokens', 'nfts', 'activity'] as HomeTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor:
                activeTab === tab ? Colors.accent : 'transparent',
            }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: activeTab === tab ? '#fff' : Colors.textLight,
              }}>
              {t(tab)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {tabContent}

      <View style={{height: 20}} />
    </ScrollView>
  );
}

// --- Token List ---

function TokenList({
  tokens,
  displayBalance,
  onSend,
}: {
  tokens: TokenBalance[];
  displayBalance: boolean;
  onSend: (token: TokenBalance) => void;
}) {
  const {t} = useTranslation();
  const theme = useThemeStore.getState().theme;
  const isLight = theme === 'light';

  if (tokens.length === 0) {
    return (
      <View style={{padding: 40, alignItems: 'center'}}>
        <Text style={{color: Colors.textLight, fontSize: 14}}>
          {t('loading')}
        </Text>
      </View>
    );
  }

  return (
    <View style={{gap: isLight ? 16 : 10}}>
      {tokens.map((token, index) => {
        const balance =
          parseFloat(token.balance) / Math.pow(10, token.decimals);
        const usdValue = balance * token.price;

        return (
          <TouchableOpacity
            key={token.address || `token-${index}`}
            onPress={() => onSend(token)}
            activeOpacity={0.7}
            style={{
              backgroundColor: isLight ? 'rgba(255, 247, 254, 0.6)' : Colors.cardBg,
              borderRadius: isLight ? 48 : 16,
              padding: isLight ? 17 : 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: isLight ? 'space-between' : undefined,
              ...(isLight
                ? {
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                    shadowColor: '#000',
                    shadowOffset: {width: 0, height: 1},
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                  }
                : {
                    shadowColor: '#000',
                    shadowOffset: {width: 0, height: 1},
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }),
            }}>
            {/* Left side: icon + info */}
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 16}}>
              {/* Token icon */}
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: isLight ? 'rgba(78, 0, 205, 0.12)' : Colors.accent + '18',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: isLight ? '#4e00cd' : Colors.accent,
                  }}>
                  {token.symbol.charAt(0)}
                </Text>
              </View>

              {/* Token info */}
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: isLight ? '#2c024d' : Colors.text,
                    lineHeight: 24,
                  }}
                  numberOfLines={1}>
                  {token.name}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: isLight ? '#494457' : Colors.textLight,
                    lineHeight: 16,
                  }}>
                  {token.symbol}
                </Text>
              </View>
            </View>

            {/* Balance */}
            <View style={{alignItems: 'flex-end'}}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: isLight ? '#2c024d' : Colors.text,
                  lineHeight: 24,
                }}>
                {displayBalance
                  ? balance.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })
                  : '••••'}
              </Text>
              {displayBalance && token.price > 0 && (
                <Text
                  style={{
                    fontSize: 12,
                    color: isLight ? '#494457' : Colors.textLight,
                    lineHeight: 16,
                  }}>
                  ${usdValue.toFixed(2)}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// --- NFT Grid ---

function NFTCard({nft, onSend}: {nft: NFT; onSend: (nft: NFT) => void}) {
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const hasImage = !!nft.iconUrl && !imgError;

  return (
    <TouchableOpacity
      onPress={() => onSend(nft)}
      activeOpacity={0.7}
      style={{
        width: '47%',
        backgroundColor: Colors.cardBg,
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.grey,
      }}>
      {/* NFT image */}
      <View
        style={{
          height: 160,
          backgroundColor: Colors.purple + '10',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        {hasImage ? (
          <>
            <Image
              source={{uri: nft.iconUrl}}
              style={{width: '100%', height: '100%'}}
              resizeMode="cover"
              onLoad={() => setImgLoading(false)}
              onError={() => {
                setImgLoading(false);
                setImgError(true);
              }}
            />
            {imgLoading && (
              <ActivityIndicator
                style={{position: 'absolute'}}
                color={Colors.purple}
              />
            )}
          </>
        ) : (
          <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
            <Path
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
              stroke={Colors.textLight}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </View>

      {/* Name + balance badge */}
      <View
        style={{
          padding: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <View style={{flex: 1, marginRight: 6}}>
          <Text
            style={{fontSize: 13, fontWeight: '600', color: Colors.text}}
            numberOfLines={1}>
            {nft.name || `NFT #${nft.nftId}`}
          </Text>
          <Text style={{fontSize: 11, color: Colors.textLight, marginTop: 2}}>
            ID: {nft.nftId}
          </Text>
        </View>
        {nft.balance > 1 && (
          <View
            style={{
              backgroundColor: Colors.purple,
              borderRadius: 12,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}>
            <Text style={{color: '#fff', fontSize: 11, fontWeight: '600'}}>
              x{nft.balance}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function NFTGrid({
  nfts,
  onSend,
}: {
  nfts: NFT[];
  onSend: (nft: NFT) => void;
}) {
  const {t} = useTranslation();

  if (nfts.length === 0) {
    return (
      <View style={{padding: 40, alignItems: 'center'}}>
        <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
          <Path
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            stroke={Colors.textLight}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text style={{color: Colors.textLight, fontSize: 14, marginTop: 12}}>
          No NFTs found
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
      }}>
      {nfts.map((nft, index) => (
        <NFTCard
          key={`${nft.contractAddress || index}-${nft.nftId || index}`}
          nft={nft}
          onSend={onSend}
        />
      ))}
    </View>
  );
}

// --- Activity List ---

function ActivityList({txHistory}: {txHistory: TransactionRecord[]}) {
  const {t} = useTranslation();

  if (txHistory.length === 0) {
    return (
      <View style={{padding: 40, alignItems: 'center'}}>
        <Text style={{color: Colors.textLight, fontSize: 14}}>
          {t('activities')}
        </Text>
      </View>
    );
  }

  const typeIcons: Record<string, string> = {
    transfer: '↑',
    swap: '↔',
    bind: '🔗',
    approve: '✓',
    other: '•',
  };

  const statusColors: Record<string, string> = {
    pending: Colors.textLight,
    success: Colors.green,
    error: Colors.error,
  };

  return (
    <View>
      {txHistory.map((tx, index) => (
        <View
          key={`${tx.hash || 'tx'}-${index}`}
          style={{
            backgroundColor: Colors.cardBg,
            borderRadius: 14,
            padding: 14,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: Colors.grey,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          {/* Type icon */}
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor:
                (statusColors[tx.status] ?? Colors.textLight) + '15',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
            <Text style={{fontSize: 16}}>
              {tx.type === 'transfer'
                ? tx.inbound
                  ? '↓'
                  : '↑'
                : (typeIcons[tx.type] ?? '•')}
            </Text>
          </View>

          {/* Tx info */}
          <View style={{flex: 1}}>
            <Text
              style={{fontSize: 14, fontWeight: '600', color: Colors.text}}>
              {tx.type === 'transfer'
                ? tx.inbound
                  ? 'Received'
                  : 'Sent'
                : tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
              {tx.token?.symbol ? ` ${tx.token.symbol}` : ''}
            </Text>
            {tx.type === 'transfer' && tx.inbound && tx.fromAddress ? (
              <Text
                style={{fontSize: 12, color: Colors.textLight, marginTop: 2}}
                numberOfLines={1}>
                From: {tx.fromAddress.slice(0, 6)}...{tx.fromAddress.slice(-4)}
              </Text>
            ) : tx.toAddress ? (
              <Text
                style={{fontSize: 12, color: Colors.textLight, marginTop: 2}}
                numberOfLines={1}>
                To: {tx.toAddress.slice(0, 6)}...{tx.toAddress.slice(-4)}
              </Text>
            ) : null}
            <Text
              style={{fontSize: 11, color: Colors.textLight, marginTop: 2}}>
              {new Date(tx.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {/* Amount + status */}
          <View style={{alignItems: 'flex-end'}}>
            {tx.amount ? (
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: tx.inbound ? Colors.green : Colors.text,
                }}>
                {tx.inbound ? '+' : tx.type === 'transfer' ? '-' : ''}
                {tx.amount} {tx.token?.symbol ?? ''}
              </Text>
            ) : (
              <Text style={{fontSize: 12, color: Colors.textLight}}>—</Text>
            )}
            <Text
              style={{
                fontSize: 11,
                color: statusColors[tx.status] ?? Colors.textLight,
                marginTop: 2,
                fontWeight: '500',
              }}>
              {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
