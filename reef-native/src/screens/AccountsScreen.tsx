/**
 * AccountsScreen — account list with add/select/detail actions.
 * Mirrors accounts_page.dart.
 * Uses inline sub-screen navigation (no stack navigator needed yet).
 */

import React, {useState, useEffect} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActionSheetIOS,
  Modal,
  TextInput,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useTranslation} from 'react-i18next';
import Svg, {
  Path,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import {ReefAccount} from '../types';
import {useAccounts} from '../hooks/useAccounts';
import AccountCard from '../components/AccountCard';
import AddAccountScreen from './AddAccountScreen';
import MnemonicGenerateScreen from './MnemonicGenerateScreen';
import MnemonicImportScreen from './MnemonicImportScreen';
import JsonImportScreen from './JsonImportScreen';
import AccountDetailsScreen from './AccountDetailsScreen';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';

type SubScreen =
  | 'list'
  | 'add'
  | 'create'
  | 'import-seed'
  | 'import-json'
  | 'details';

function shortenAddr(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

function fmtBalance(balance: string): string {
  const num = parseFloat(balance) / 1e18;
  if (num === 0) return '0';
  if (num < 0.001) return '< 0.001';
  return num.toLocaleString(undefined, {maximumFractionDigits: 3});
}

export default function AccountsScreen() {
  const {t} = useTranslation();
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';
  const insets = useSafeAreaInsets();
  const {accounts, selectedAddress, selectAccount, loadAccounts, claimEvm, renameAccount, deleteAccount} =
    useAccounts();

  const [subScreen, setSubScreen] = useState<SubScreen>('list');
  const [detailAccount, setDetailAccount] = useState<ReefAccount | null>(null);
  const [renameTarget, setRenameTarget] = useState<ReefAccount | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleAccountPress = (account: ReefAccount) => {
    selectAccount(account.address);
  };

  const handleClaimEvm = (account: ReefAccount) => {
    Alert.alert(
      'Claim EVM Address',
      `Bind an EVM address to "${account.name}"? This requires a small REEF transaction fee.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Claim',
          onPress: async () => {
            try {
              await claimEvm(account.address);
              Alert.alert('Success', 'EVM address claimed successfully.');
              loadAccounts();
            } catch (err: any) {
              Alert.alert(
                'Error',
                err.message ?? 'Failed to claim EVM address.',
              );
            }
          },
        },
      ],
    );
  };

  const handleAccountLongPress = (account: ReefAccount) => {
    setDetailAccount(account);
    setSubScreen('details');
  };

  const handleMore = (account: ReefAccount) => {
    const options = ['Rename', 'Copy Native Address'];
    if (account.evmAddress) {
      options.push('Copy EVM Address');
    }
    options.push('Delete');
    options.push('Cancel');

    const destructiveIndex = options.indexOf('Delete');
    const cancelIndex = options.indexOf('Cancel');

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        destructiveButtonIndex: destructiveIndex,
        cancelButtonIndex: cancelIndex,
        title: account.name,
      },
      buttonIndex => {
        const selected = options[buttonIndex];
        if (selected === 'Rename') {
          setRenameValue(account.name);
          setRenameTarget(account);
        } else if (selected === 'Copy Native Address') {
          Clipboard.setString(account.address);
          Alert.alert('Copied', 'Native address copied to clipboard.');
        } else if (selected === 'Copy EVM Address' && account.evmAddress) {
          Clipboard.setString(account.evmAddress);
          Alert.alert('Copied', 'EVM address copied to clipboard.');
        } else if (selected === 'Delete') {
          Alert.alert(
            'Delete Account',
            `Are you sure you want to delete "${account.name}"? Make sure you have backed up your recovery phrase.`,
            [
              {text: 'Cancel', style: 'cancel'},
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await deleteAccount(account.address);
                  loadAccounts();
                },
              },
            ],
          );
        }
      },
    );
  };

  const handleRenameConfirm = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    await renameAccount(renameTarget.address, renameValue.trim());
    setRenameTarget(null);
    loadAccounts();
  };

  const handleDone = () => {
    setSubScreen('list');
    loadAccounts();
  };

  // Sub-screen routing
  if (subScreen === 'add') {
    return (
      <AddAccountScreen
        onCreateNew={() => setSubScreen('create')}
        onImportSeed={() => setSubScreen('import-seed')}
        onRestoreJson={() => setSubScreen('import-json')}
        onClose={() => setSubScreen('list')}
      />
    );
  }

  if (subScreen === 'create') {
    return (
      <MnemonicGenerateScreen
        onDone={handleDone}
        onCancel={() => setSubScreen('add')}
      />
    );
  }

  if (subScreen === 'import-seed') {
    return (
      <MnemonicImportScreen
        onDone={handleDone}
        onCancel={() => setSubScreen('add')}
      />
    );
  }

  if (subScreen === 'import-json') {
    return (
      <JsonImportScreen
        onDone={handleDone}
        onCancel={() => setSubScreen('add')}
      />
    );
  }

  if (subScreen === 'details' && detailAccount) {
    return (
      <AccountDetailsScreen
        account={detailAccount}
        onClose={() => setSubScreen('list')}
        onDeleted={handleDone}
      />
    );
  }

  // Shared rename modal
  const renderRenameModal = () => (
    <Modal
      visible={!!renameTarget}
      transparent
      animationType="fade"
      onRequestClose={() => setRenameTarget(null)}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: isLight ? 'rgba(44, 2, 77, 0.3)' : 'rgba(0,0,0,0.4)',
        }}>
        <View
          style={{
            backgroundColor: isLight ? '#fff' : Colors.cardBg,
            borderRadius: 20,
            padding: 24,
            width: '80%',
            shadowColor: '#000',
            shadowOffset: {width: 0, height: 4},
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: isLight ? '#2c024d' : Colors.text,
              marginBottom: 16,
            }}>
            Rename Account
          </Text>
          <TextInput
            value={renameValue}
            onChangeText={setRenameValue}
            placeholder="Account name"
            placeholderTextColor={isLight ? '#cbc3da' : undefined}
            autoFocus
            selectTextOnFocus
            style={{
              borderWidth: 1,
              borderColor: isLight ? 'rgba(78, 0, 205, 0.1)' : Colors.grey,
              borderRadius: 12,
              padding: 14,
              fontSize: 16,
              color: isLight ? '#2c024d' : Colors.text,
              marginBottom: 20,
            }}
          />
          <View style={{flexDirection: 'row', gap: 10}}>
            <TouchableOpacity
              onPress={() => setRenameTarget(null)}
              activeOpacity={0.7}
              style={{
                flex: 1,
                backgroundColor: isLight ? '#fcf0ff' : Colors.primaryBg,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}>
              <Text
                style={{
                  color: isLight ? '#2c024d' : Colors.text,
                  fontSize: 15,
                  fontWeight: '600',
                }}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleRenameConfirm}
              activeOpacity={0.7}
              style={{
                flex: 1,
                backgroundColor: isLight ? '#4e00cd' : Colors.accent,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                opacity: renameValue.trim() ? 1 : 0.5,
              }}>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: '700',
                }}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Sort accounts: selected first
  const sortedAccounts = [...accounts].sort((a, b) => {
    if (a.address === selectedAddress) return -1;
    if (b.address === selectedAddress) return 1;
    return 0;
  });

  // ─── Light Mode: Figma "Accounts" design ─────────────────────────────────
  if (isLight) {
    return (
      <ScrollView
        style={{flex: 1, backgroundColor: '#fff7fe'}}
        contentContainerStyle={{paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: 80}}>

        {/* ── Hero Section ── */}
        <View style={{marginBottom: 32}}>
          <Text style={{
            fontSize: 28,
            fontWeight: '800',
            color: '#2c024d',
            letterSpacing: -0.7,
          }}>
            Manage Accounts
          </Text>
        </View>

        {/* ── Account Cards ── */}
        {sortedAccounts.length === 0 ? (
          <View style={{
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: 'rgba(78, 0, 205, 0.15)',
            borderRadius: 32,
            padding: 40,
            alignItems: 'center',
            gap: 16,
          }}>
            <Text style={{color: '#494457', fontSize: 14, textAlign: 'center'}}>
              {t('no_account_currently')}
            </Text>
            <TouchableOpacity
              onPress={() => setSubScreen('add')}
              activeOpacity={0.8}
              style={{
                height: 48,
                borderRadius: 9999,
                overflow: 'hidden',
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 32,
              }}>
              <Svg
                style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
                viewBox="0 0 1 1"
                preserveAspectRatio="none">
                <Defs>
                  <SvgLinearGradient id="addBtnGrad" x1="0" y1="0" x2="0.3" y2="1">
                    <Stop offset="0" stopColor="#b70054" />
                    <Stop offset="1" stopColor="#4e00cd" />
                  </SvgLinearGradient>
                </Defs>
                <Rect x="0" y="0" width="1" height="1" fill="url(#addBtnGrad)" />
              </Svg>
              <Text style={{color: '#fff', fontWeight: '700', fontSize: 14, zIndex: 1}}>
                {t('add_account')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{gap: 20, marginBottom: 32}}>
            {sortedAccounts.map(account => {
              const isSel = account.address === selectedAddress;
              const hasEvm = !!account.evmAddress;

              return (
                <TouchableOpacity
                  key={account.address}
                  onPress={() => handleAccountPress(account)}
                  onLongPress={() => handleAccountLongPress(account)}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    borderRadius: 32,
                    borderWidth: 1,
                    borderColor: isSel ? 'rgba(78, 0, 205, 0.15)' : 'rgba(203, 195, 218, 0.15)',
                    padding: 25,
                    gap: 20,
                    shadowColor: '#4e00cd',
                    shadowOffset: {width: 0, height: isSel ? 20 : 8},
                    shadowOpacity: isSel ? 0.08 : 0.04,
                    shadowRadius: isSel ? 40 : 20,
                    elevation: isSel ? 6 : 2,
                  }}>

                  {/* ── Account header: avatar + name + selected badge ── */}
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 16}}>
                    {/* Avatar */}
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      overflow: 'hidden',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Svg style={{position: 'absolute'}} width={48} height={48} viewBox="0 0 48 48">
                        <Defs>
                          <SvgLinearGradient id={`avatarGrad-${account.address.slice(-4)}`} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                            <Stop offset="0" stopColor={isSel ? '#4e00cd' : '#cbc3da'} />
                            <Stop offset="1" stopColor={isSel ? '#b70054' : '#9b8fb5'} />
                          </SvgLinearGradient>
                        </Defs>
                        <Rect width={48} height={48} rx={24} fill={`url(#avatarGrad-${account.address.slice(-4)})`} />
                      </Svg>
                      {/* Person icon */}
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={{zIndex: 1}}>
                        <Path
                          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                          stroke="#fff"
                          strokeWidth={1.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                    </View>

                    {/* Name + truncated address */}
                    <View style={{flex: 1, gap: 4}}>
                      <Text style={{fontSize: 20, fontWeight: '800', color: '#2c024d'}}>
                        {account.name}
                      </Text>
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                        <Text style={{fontSize: 13, fontFamily: 'monospace', color: '#494457'}}>
                          {shortenAddr(account.address, 6)}
                        </Text>
                        {/* Copy button */}
                        <TouchableOpacity
                          onPress={e => {
                            e.stopPropagation();
                            Clipboard.setString(account.address);
                          }}
                          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                          <Svg width={13} height={15} viewBox="0 0 24 24" fill="none">
                            <Path
                              d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75m11.25-3.375h-9a1.125 1.125 0 00-1.125 1.125V6.75m11.25-3.375v3.375M18 3.375h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-9.75A1.125 1.125 0 017.5 14.25V4.5c0-.621.504-1.125 1.125-1.125H18z"
                              stroke="#cbc3da"
                              strokeWidth={1.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </Svg>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Selected badge */}
                    {isSel && (
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: 'rgba(0, 180, 110, 0.08)',
                        borderRadius: 9999,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                      }}>
                        <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: '#00b46e'}} />
                        <Text style={{fontSize: 11, fontWeight: '600', color: '#00b46e'}}>
                          Selected
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* ── Balance ── */}
                  <View style={{gap: 4}}>
                    <Text style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: '#494457',
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}>
                      Balance
                    </Text>
                    <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 8}}>
                      <Text style={{fontSize: 28, fontWeight: '800', color: '#2c024d', letterSpacing: -0.7}}>
                        {fmtBalance(account.balance)}
                      </Text>
                      <Text style={{fontSize: 14, fontWeight: '700', color: '#494457'}}>
                        REEF
                      </Text>
                    </View>
                  </View>

                  {/* ── EVM row or Claim CTA ── */}
                  {hasEvm ? (
                    <TouchableOpacity
                      onPress={() => handleAccountLongPress(account)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                      <View style={{
                        backgroundColor: 'rgba(78, 0, 205, 0.08)',
                        borderRadius: 9999,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                      }}>
                        <Text style={{fontSize: 10, fontWeight: '700', color: '#4e00cd', letterSpacing: 0.5}}>
                          EVM
                        </Text>
                      </View>
                      <Text style={{fontSize: 13, fontFamily: 'monospace', color: '#494457', flex: 1}}>
                        {shortenAddr(account.evmAddress!, 6)}
                      </Text>
                      {/* Chevron */}
                      <Svg width={8} height={14} viewBox="0 0 8 14" fill="none">
                        <Path d="M1 1l6 6-6 6" stroke="#cbc3da" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    </TouchableOpacity>
                  ) : !account.isEvmClaimed ? (
                    <View style={{
                      backgroundColor: 'rgba(183, 0, 84, 0.04)',
                      borderRadius: 24,
                      padding: 20,
                      gap: 16,
                      alignItems: 'center',
                    }}>
                      {/* Warning row */}
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                        <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                          <Path
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 4.88c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                            stroke="#b70054"
                            strokeWidth={1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </Svg>
                        <Text style={{fontSize: 12, fontWeight: '800', color: '#2c024d', letterSpacing: 0.3, textTransform: 'uppercase'}}>
                          No EVM Address
                        </Text>
                      </View>
                      <Text style={{fontSize: 13, color: '#494457', textAlign: 'center', lineHeight: 19}}>
                        To interact with dApps and smart contracts, you need to claim an EVM address.
                      </Text>
                      {/* Claim button */}
                      <TouchableOpacity
                        onPress={e => {
                          e.stopPropagation();
                          handleClaimEvm(account);
                        }}
                        activeOpacity={0.8}
                        style={{
                          height: 48,
                          borderRadius: 9999,
                          overflow: 'hidden',
                          justifyContent: 'center',
                          alignItems: 'center',
                          paddingHorizontal: 32,
                          width: '100%',
                        }}>
                        <Svg
                          style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
                          viewBox="0 0 1 1"
                          preserveAspectRatio="none">
                          <Defs>
                            <SvgLinearGradient id={`claimGrad-${account.address.slice(-4)}`} x1="0" y1="0" x2="0.3" y2="1">
                              <Stop offset="0" stopColor="#b70054" />
                              <Stop offset="1" stopColor="#4e00cd" />
                            </SvgLinearGradient>
                          </Defs>
                          <Rect x="0" y="0" width="1" height="1" fill={`url(#claimGrad-${account.address.slice(-4)})`} />
                        </Svg>
                        <Text style={{fontSize: 15, fontWeight: '700', color: '#fff', zIndex: 1}}>
                          Claim EVM Address
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}

            {/* ── Add Account Button ── */}
            <TouchableOpacity
              onPress={() => setSubScreen('add')}
              activeOpacity={0.8}
              style={{
                height: 64,
                borderRadius: 9999,
                overflow: 'hidden',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 10,
                shadowColor: '#4e00cd',
                shadowOffset: {width: 0, height: 20},
                shadowOpacity: 0.15,
                shadowRadius: 40,
                elevation: 8,
              }}>
              <Svg
                style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
                viewBox="0 0 1 1"
                preserveAspectRatio="none">
                <Defs>
                  <SvgLinearGradient id="addAcctGrad" x1="0" y1="0" x2="0.3" y2="1">
                    <Stop offset="0" stopColor="#b70054" />
                    <Stop offset="1" stopColor="#4e00cd" />
                  </SvgLinearGradient>
                </Defs>
                <Rect x="0" y="0" width="1" height="1" fill="url(#addAcctGrad)" />
              </Svg>
              {/* Plus icon */}
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{zIndex: 1}}>
                <Path
                  d="M12 4.5v15m7.5-7.5h-15"
                  stroke="#fff"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={{fontSize: 18, fontWeight: '800', color: '#fff', zIndex: 1}}>
                Add Account
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Rename modal — shared between light/dark */}
        {renderRenameModal()}
      </ScrollView>
    );
  }

  // ─── Dark Mode (existing design) ────────────────────────────────────────────

  // Main account list
  return (
    <ScrollView
      style={{flex: 1, backgroundColor: Colors.primaryBg}}
      contentContainerStyle={{padding: 16}}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}>
        <Text style={{fontSize: 22, fontWeight: '700', color: Colors.text}}>
          {t('my_account')}
        </Text>
        <TouchableOpacity
          onPress={() => setSubScreen('add')}
          activeOpacity={0.7}
          style={{
            backgroundColor: Colors.purple,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}>
          <Text style={{color: '#fff', fontWeight: '600', fontSize: 13}}>
            + {t('add')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Account list */}
      {accounts.length === 0 ? (
        <View
          style={{
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: Colors.grey,
            borderRadius: 16,
            padding: 32,
            alignItems: 'center',
          }}>
          <Text
            style={{
              color: Colors.textLight,
              fontSize: 14,
              textAlign: 'center',
              marginBottom: 16,
            }}>
            {t('no_account_currently')}
          </Text>
          <TouchableOpacity
            onPress={() => setSubScreen('add')}
            activeOpacity={0.7}
            style={{
              backgroundColor: Colors.purple,
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}>
            <Text style={{color: '#fff', fontWeight: '600'}}>
              {t('add_account')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Selected account first */}
          {sortedAccounts.map(account => (
              <AccountCard
                key={account.address}
                account={account}
                isSelected={account.address === selectedAddress}
                onPress={() => handleAccountPress(account)}
                onLongPress={() => handleAccountLongPress(account)}
                onMore={() => handleMore(account)}
                onClaimEvm={
                  !account.isEvmClaimed
                    ? () => handleClaimEvm(account)
                    : undefined
                }
              />
            ))}
        </>
      )}
      {/* Rename modal — shared */}
      {renderRenameModal()}
    </ScrollView>
  );
}
