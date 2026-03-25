/**
 * AccountsScreen — account list with add/select/detail actions.
 * Mirrors accounts_page.dart.
 * Uses inline sub-screen navigation (no stack navigator needed yet).
 */

import React, {useState, useEffect} from 'react';
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
import {ReefAccount} from '../types';
import {useAccounts} from '../hooks/useAccounts';
import AccountCard from '../components/AccountCard';
import AddAccountScreen from './AddAccountScreen';
import MnemonicGenerateScreen from './MnemonicGenerateScreen';
import MnemonicImportScreen from './MnemonicImportScreen';
import JsonImportScreen from './JsonImportScreen';
import AccountDetailsScreen from './AccountDetailsScreen';
import {Colors} from '../utils/colors';

type SubScreen =
  | 'list'
  | 'add'
  | 'create'
  | 'import-seed'
  | 'import-json'
  | 'details';

export default function AccountsScreen() {
  const {t} = useTranslation();
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
          {accounts
            .sort((a, b) => {
              if (a.address === selectedAddress) return -1;
              if (b.address === selectedAddress) return 1;
              return 0;
            })
            .map(account => (
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
      {/* Rename modal */}
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
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}>
          <View
            style={{
              backgroundColor: Colors.cardBg,
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
                color: Colors.text,
                marginBottom: 16,
              }}>
              Rename Account
            </Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Account name"
              autoFocus
              selectTextOnFocus
              style={{
                borderWidth: 1,
                borderColor: Colors.grey,
                borderRadius: 12,
                padding: 14,
                fontSize: 16,
                color: Colors.text,
                marginBottom: 20,
              }}
            />
            <View style={{flexDirection: 'row', gap: 10}}>
              <TouchableOpacity
                onPress={() => setRenameTarget(null)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  backgroundColor: Colors.primaryBg,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}>
                <Text
                  style={{
                    color: Colors.text,
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
                  backgroundColor: Colors.accent,
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
    </ScrollView>
  );
}
