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
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {TokenBalance, NFT, TransactionRecord} from '../types';
import {useAccountStore} from '../stores/useAccountStore';
import {useTokenStore} from '../stores/useTokenStore';
import {useAppConfigStore} from '../stores/useAppConfigStore';
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
      {/* Balance header */}
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 20,
          padding: 24,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: Colors.grey,
          alignItems: 'center',
        }}>
        {/* Balance display */}
        <TouchableOpacity onPress={toggleDisplayBalance} activeOpacity={0.7}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: '700',
              color: Colors.text,
              marginBottom: 4,
            }}>
            {displayBalance
              ? `$${totalUsdBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : '••••••'}
          </Text>
        </TouchableOpacity>
        <Text style={{fontSize: 13, color: Colors.textLight, marginBottom: 20}}>
          {t('balance')}
        </Text>

        {/* Action buttons */}
        <View style={{flexDirection: 'row', gap: 12, width: '100%'}}>
          <TouchableOpacity
            onPress={() => setSubScreen('send')}
            activeOpacity={0.7}
            style={{
              flex: 1,
              backgroundColor: Colors.purple,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
            }}>
            <Text style={{color: '#fff', fontSize: 15, fontWeight: '600'}}>
              ↑ {t('send')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSubScreen('receive')}
            activeOpacity={0.7}
            style={{
              flex: 1,
              backgroundColor: Colors.purpleDark,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
            }}>
            <Text style={{color: '#fff', fontSize: 15, fontWeight: '600'}}>
              ↓ {t('scan_qr_code')}
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
              backgroundColor: Colors.primaryBg,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: Colors.grey,
            }}>
            <Text style={{color: Colors.text, fontSize: 14, fontWeight: '600'}}>
              💳 Buy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSubScreen('dapp')}
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
            <Text style={{color: Colors.text, fontSize: 14, fontWeight: '600'}}>
              🌐 dApps
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab switcher */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 4,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: Colors.grey,
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
                activeTab === tab ? Colors.purple : 'transparent',
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
      {tokens.map(token => {
        const balance =
          parseFloat(token.balance) / Math.pow(10, token.decimals);
        const usdValue = balance * token.price;

        return (
          <TouchableOpacity
            key={token.address}
            onPress={() => onSend(token)}
            activeOpacity={0.7}
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
            {/* Token icon */}
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: Colors.purple + '15',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: Colors.purple,
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
        <Text style={{color: Colors.textLight, fontSize: 14}}>
          {t('loading')}
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
      {nfts.map(nft => (
        <TouchableOpacity
          key={`${nft.contractAddress}-${nft.nftId}`}
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
          {/* NFT image placeholder */}
          <View
            style={{
              height: 120,
              backgroundColor: Colors.purple + '10',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Text style={{fontSize: 36}}>🖼</Text>
          </View>

          <View style={{padding: 10}}>
            <Text
              style={{fontSize: 13, fontWeight: '600', color: Colors.text}}
              numberOfLines={1}>
              {nft.name || `NFT #${nft.nftId}`}
            </Text>
            <Text style={{fontSize: 11, color: Colors.textLight, marginTop: 2}}>
              ID: {nft.nftId}
              {nft.balance > 1 ? ` · ×${nft.balance}` : ''}
            </Text>
          </View>
        </TouchableOpacity>
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
      {txHistory.map(tx => (
        <View
          key={tx.hash}
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
              {typeIcons[tx.type] ?? '•'}
            </Text>
          </View>

          {/* Tx info */}
          <View style={{flex: 1}}>
            <Text
              style={{fontSize: 14, fontWeight: '600', color: Colors.text}}>
              {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
            </Text>
            <Text
              style={{fontSize: 12, color: Colors.textLight, marginTop: 2}}>
              {new Date(tx.timestamp).toLocaleDateString()}
            </Text>
          </View>

          {/* Amount */}
          {tx.amount && (
            <Text style={{fontSize: 14, fontWeight: '600', color: Colors.text}}>
              {tx.amount} {tx.token?.symbol ?? ''}
            </Text>
          )}

          {/* Status dot */}
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: statusColors[tx.status] ?? Colors.textLight,
              marginLeft: 8,
            }}
          />
        </View>
      ))}
    </View>
  );
}
