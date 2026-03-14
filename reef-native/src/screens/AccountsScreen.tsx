/**
 * AccountsScreen — account list with add/select/detail actions.
 * Mirrors accounts_page.dart.
 * Uses inline sub-screen navigation (no stack navigator needed yet).
 */

import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, ScrollView} from 'react-native';
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
  const {accounts, selectedAddress, selectAccount, loadAccounts} =
    useAccounts();

  const [subScreen, setSubScreen] = useState<SubScreen>('list');
  const [detailAccount, setDetailAccount] = useState<ReefAccount | null>(null);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleAccountPress = (account: ReefAccount) => {
    selectAccount(account.address);
  };

  const handleAccountLongPress = (account: ReefAccount) => {
    setDetailAccount(account);
    setSubScreen('details');
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
              />
            ))}
        </>
      )}
    </ScrollView>
  );
}
