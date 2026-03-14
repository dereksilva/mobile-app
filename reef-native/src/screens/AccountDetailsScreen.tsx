/**
 * AccountDetailsScreen — view account details, actions menu.
 * Mirrors the account_box.dart options: select, delete, copy, export, EVM bind.
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {useTranslation} from 'react-i18next';
import {ReefAccount} from '../types';
import {useAccounts} from '../hooks/useAccounts';
import AccountCard from '../components/AccountCard';
import {Colors} from '../utils/colors';

interface AccountDetailsScreenProps {
  account: ReefAccount;
  onClose: () => void;
  onDeleted: () => void;
}

interface ActionButtonProps {
  title: string;
  color?: string;
  onPress: () => void;
}

function ActionButton({title, color, onPress}: ActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: Colors.grey,
      }}>
      <Text
        style={{
          fontSize: 15,
          fontWeight: '500',
          color: color ?? Colors.text,
        }}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export default function AccountDetailsScreen({
  account,
  onClose,
  onDeleted,
}: AccountDetailsScreenProps) {
  const {t} = useTranslation();
  const {selectAccount, deleteAccount, claimEvm} = useAccounts();
  const [isBinding, setIsBinding] = useState(false);

  const handleCopyAddress = () => {
    Clipboard.setString(account.address);
    Alert.alert(t('copy_native_address'), account.address);
  };

  const handleCopyEvmAddress = () => {
    if (account.evmAddress) {
      Clipboard.setString(account.evmAddress);
      Alert.alert(t('copy_evm_address'), account.evmAddress);
    }
  };

  const handleSelect = () => {
    selectAccount(account.address);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      t('delete_account'),
      `${t('permanently_lose')} ${t('access_to')} "${account.name}" ${t('unless_saved')}`,
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await deleteAccount(account.address);
            onDeleted();
          },
        },
      ],
    );
  };

  const handleClaimEvm = async () => {
    setIsBinding(true);
    try {
      const success = await claimEvm(account.address);
      if (success) {
        Alert.alert(t('bind_modal_connected'));
      } else {
        Alert.alert('Error', 'Failed to bind EVM address');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
    setIsBinding(false);
  };

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: Colors.primaryBg}}
      contentContainerStyle={{padding: 24}}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}>
        <Text style={{fontSize: 20, fontWeight: '700', color: Colors.text}}>
          {t('more_actions')}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={{color: Colors.textLight, fontSize: 16}}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Account card preview */}
      <AccountCard account={account} isSelected={false} onPress={() => {}} />

      {/* Full addresses */}
      <View
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: Colors.grey,
        }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: Colors.textLight,
            marginBottom: 4,
          }}>
          {t('address')}
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontFamily: 'monospace',
            color: Colors.text,
            marginBottom: 12,
          }}
          selectable>
          {account.address}
        </Text>

        {account.evmAddress && (
          <>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: Colors.textLight,
                marginBottom: 4,
              }}>
              {t('reef_evm')}
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: 'monospace',
                color: Colors.text,
              }}
              selectable>
              {account.evmAddress}
            </Text>
          </>
        )}
      </View>

      {/* Actions */}
      <ActionButton title={t('select_account')} onPress={handleSelect} />
      <ActionButton title={t('copy_native_address')} onPress={handleCopyAddress} />

      {account.evmAddress ? (
        <ActionButton title={t('copy_evm_address')} onPress={handleCopyEvmAddress} />
      ) : (
        <ActionButton
          title={isBinding ? t('loading') : t('connect_evm')}
          color={Colors.purple}
          onPress={handleClaimEvm}
        />
      )}

      <ActionButton
        title={t('delete_account')}
        color={Colors.error}
        onPress={handleDelete}
      />
    </ScrollView>
  );
}
