/**
 * AddAccountScreen — choose how to add an account.
 * Mirrors add_account_modal.dart with 4 options.
 */

import React from 'react';
import {View, Text, TouchableOpacity, ScrollView} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Colors} from '../utils/colors';

interface AddAccountScreenProps {
  onCreateNew: () => void;
  onImportSeed: () => void;
  onRestoreJson: () => void;
  onClose: () => void;
}

interface OptionButtonProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
}

function OptionButton({title, subtitle, onPress}: OptionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.grey,
      }}>
      <Text style={{fontSize: 16, fontWeight: '600', color: Colors.text}}>
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            fontSize: 13,
            color: Colors.textLight,
            marginTop: 4,
          }}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function AddAccountScreen({
  onCreateNew,
  onImportSeed,
  onRestoreJson,
  onClose,
}: AddAccountScreenProps) {
  const {t} = useTranslation();

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
          marginBottom: 32,
        }}>
        <Text style={{fontSize: 22, fontWeight: '700', color: Colors.text}}>
          {t('add_account')}
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Text style={{fontSize: 16, color: Colors.textLight}}>✕</Text>
        </TouchableOpacity>
      </View>

      <OptionButton
        title={t('create_new_account')}
        subtitle="Generate a new 12-word recovery phrase"
        onPress={onCreateNew}
      />

      <OptionButton
        title={t('import_account_from_pre_existing_seed')}
        subtitle="Restore using your 12 or 24-word mnemonic"
        onPress={onImportSeed}
      />

      <OptionButton
        title={t('restore_from_json')}
        subtitle="Import from an encrypted JSON backup file"
        onPress={onRestoreJson}
      />
    </ScrollView>
  );
}
