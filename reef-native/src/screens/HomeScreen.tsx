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

import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {TokenBalance, NFT, TransactionRecord} from '../types';
import {useAccountStore} from '../stores/useAccountStore';
import {useTokenStore} from '../stores/useTokenStore';
import {useAppConfigStore} from '../stores/useAppConfigStore';
import Svg, {Path} from 'react-native-svg';
import {Colors} from '../utils/colors';
import SendScreen from './SendScreen';
import SendNFTScreen from './SendNFTScreen';
import ReceiveScreen from './ReceiveScreen';
import BuyScreen from './BuyScreen';
import DAppBrowserScreen from './DAppBrowserScreen';

type SubScreen = 'home' | 'send' | 'sendNft' | 'receive' | 'buy' | 'dapp';
type HomeTab = 'tokens' | 'nfts' | 'activity';

export default function HomeScreen() {
  const {t} = useTranslation();

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
            {displayBalance
              ? `$${totalUsdBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : '••••••'}
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
    <View>
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
              backgroundColor: Colors.cardBg,
              borderRadius: 16,
              padding: 16,
              marginBottom: 10,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 1},
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}>
            {/* Token icon */}
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: Colors.accent + '18',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: Colors.accent,
                }}>
                {token.symbol.charAt(0)}
              </Text>
            </View>

            {/* Token info */}
            <View style={{flex: 1}}>
              <Text
                style={{fontSize: 15, fontWeight: '600', color: Colors.text}}
                numberOfLines={1}>
                {token.name}
              </Text>
              <Text
                style={{fontSize: 12, color: Colors.textLight, marginTop: 2}}>
                {token.symbol}
              </Text>
            </View>

            {/* Balance */}
            <View style={{alignItems: 'flex-end'}}>
              <Text
                style={{fontSize: 15, fontWeight: '600', color: Colors.text}}>
                {displayBalance
                  ? balance.toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })
                  : '••••'}
              </Text>
              {displayBalance && token.price > 0 && (
                <Text
                  style={{
                    fontSize: 12,
                    color: Colors.textLight,
                    marginTop: 2,
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
        backgroundColor: '#fff',
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
          key={tx.hash || `tx-${index}`}
          style={{
            backgroundColor: '#fff',
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
