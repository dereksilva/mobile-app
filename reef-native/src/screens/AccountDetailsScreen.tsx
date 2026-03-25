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
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';

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
        backgroundColor: Colors.cardBg,
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
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';
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

  // ─── Light Mode ────────────────────────────────────────────────────────────
  if (isLight) {
    const shortAddr = (addr: string) =>
      addr.length > 16 ? `${addr.slice(0, 8)}...${addr.slice(-8)}` : addr;

    return (
      <ScrollView
        style={{flex: 1, backgroundColor: '#fff7fe'}}
        contentContainerStyle={{paddingHorizontal: 24, paddingTop: 24, paddingBottom: 80}}>

        {/* ── Header ── */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          marginBottom: 32,
        }}>
          <TouchableOpacity
            onPress={onClose}
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
          <Text style={{
            fontSize: 20,
            fontWeight: '700',
            color: '#2c024d',
            letterSpacing: -0.5,
          }}>
            {t('more_actions')}
          </Text>
        </View>

        {/* ── Account Info Card (glassmorphism) ── */}
        <View style={{
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          borderRadius: 32,
          borderWidth: 1,
          borderColor: 'rgba(78, 0, 205, 0.05)',
          padding: 25,
          shadowColor: '#4e00cd',
          shadowOffset: {width: 0, height: 20},
          shadowOpacity: 0.08,
          shadowRadius: 40,
          elevation: 4,
          marginBottom: 32,
          alignItems: 'center',
          gap: 12,
        }}>
          {/* Avatar with gradient border ring */}
          <View style={{width: 72, height: 72, borderRadius: 36, overflow: 'hidden', justifyContent: 'center', alignItems: 'center'}}>
            <Svg style={{position: 'absolute'}} width={72} height={72} viewBox="0 0 72 72">
              <Defs>
                <SvgLinearGradient id="avatarBorderGrad" x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse">
                  <Stop offset="0" stopColor="#4e00cd" />
                  <Stop offset="1" stopColor="#b70054" />
                </SvgLinearGradient>
              </Defs>
              <Rect width={72} height={72} rx={36} fill="url(#avatarBorderGrad)" />
            </Svg>
            <View style={{
              width: 66,
              height: 66,
              borderRadius: 33,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
            }}>
              <Text style={{fontSize: 26, fontWeight: '800', color: '#4e00cd'}}>
                {account.name?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
          </View>

          {/* Account name */}
          <Text style={{fontSize: 22, fontWeight: '800', color: '#2c024d'}}>
            {account.name}
          </Text>

          {/* Native address */}
          <View style={{alignItems: 'center', gap: 2}}>
            <Text style={{fontSize: 11, fontWeight: '600', color: '#494457', letterSpacing: 0.8, textTransform: 'uppercase'}}>
              {t('address')}
            </Text>
            <Text style={{fontSize: 12, fontFamily: 'monospace', color: '#2c024d'}} selectable>
              {shortAddr(account.address)}
            </Text>
          </View>

          {/* EVM address */}
          {account.evmAddress && (
            <View style={{alignItems: 'center', gap: 2}}>
              <Text style={{fontSize: 11, fontWeight: '600', color: '#494457', letterSpacing: 0.8, textTransform: 'uppercase'}}>
                {t('reef_evm')}
              </Text>
              <Text style={{fontSize: 12, fontFamily: 'monospace', color: '#2c024d'}} selectable>
                {shortAddr(account.evmAddress)}
              </Text>
            </View>
          )}
        </View>

        {/* ── Action Buttons ── */}
        <View style={{gap: 10}}>
          {/* Select Account */}
          <TouchableOpacity
            onPress={handleSelect}
            activeOpacity={0.7}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(203, 195, 218, 0.15)',
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                stroke="#4e00cd"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={{fontSize: 15, fontWeight: '600', color: '#2c024d'}}>
              {t('select_account')}
            </Text>
          </TouchableOpacity>

          {/* Copy Native Address */}
          <TouchableOpacity
            onPress={handleCopyAddress}
            activeOpacity={0.7}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(203, 195, 218, 0.15)',
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
            }}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125H5.625a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H8.25m8.25 0H19.5a1.125 1.125 0 011.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-1.5m-8.25-12h5.625c.621 0 1.125.504 1.125 1.125v12"
                stroke="#4e00cd"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={{fontSize: 15, fontWeight: '600', color: '#2c024d'}}>
              {t('copy_native_address')}
            </Text>
          </TouchableOpacity>

          {/* Copy EVM / Connect EVM */}
          {account.evmAddress ? (
            <TouchableOpacity
              onPress={handleCopyEvmAddress}
              activeOpacity={0.7}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(203, 195, 218, 0.15)',
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125H5.625a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H8.25m8.25 0H19.5a1.125 1.125 0 011.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-1.5m-8.25-12h5.625c.621 0 1.125.504 1.125 1.125v12"
                  stroke="#4e00cd"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={{fontSize: 15, fontWeight: '600', color: '#2c024d'}}>
                {t('copy_evm_address')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleClaimEvm}
              activeOpacity={0.7}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(203, 195, 218, 0.15)',
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              }}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.04a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 116.364 6.364l-1.757 1.757"
                  stroke="#4e00cd"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text style={{fontSize: 15, fontWeight: '600', color: '#4e00cd'}}>
                {isBinding ? t('loading') : t('connect_evm')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Delete Account — destructive */}
          <TouchableOpacity
            onPress={handleDelete}
            activeOpacity={0.7}
            style={{
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(220, 38, 38, 0.1)',
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              marginTop: 8,
            }}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                stroke="#dc2626"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={{fontSize: 15, fontWeight: '600', color: '#dc2626'}}>
              {t('delete_account')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ─── Dark Mode (existing design) ────────────────────────────────────────────
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
          backgroundColor: Colors.cardBg,
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
