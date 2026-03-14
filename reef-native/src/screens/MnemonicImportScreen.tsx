/**
 * MnemonicImportScreen — import account from existing seed phrase.
 * Step 1: Enter mnemonic
 * Step 2: Enter name
 * Mirrors account_modals.dart import flow.
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {checkMnemonicValid} from '../reef-chain/accountApi';
import {useAccounts} from '../hooks/useAccounts';
import {Colors} from '../utils/colors';

interface MnemonicImportScreenProps {
  onDone: () => void;
  onCancel: () => void;
}

export default function MnemonicImportScreen({
  onDone,
  onCancel,
}: MnemonicImportScreenProps) {
  const {t} = useTranslation();
  const {importFromMnemonic} = useAccounts();

  const [step, setStep] = useState<1 | 2>(1);
  const [mnemonic, setMnemonic] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const mnemonicTrimmed = mnemonic.trim().toLowerCase();
  const wordCount = mnemonicTrimmed
    ? mnemonicTrimmed.split(/\s+/).length
    : 0;
  const isValidWordCount = wordCount === 12 || wordCount === 24;
  const isValidMnemonic = isValidWordCount && checkMnemonicValid(mnemonicTrimmed);

  const handleNext = () => {
    setError(null);
    if (!isValidMnemonic) {
      setError(t('invalid_mnemonic_seed'));
      return;
    }
    setStep(2);
  };

  const handleImport = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);

    try {
      await importFromMnemonic(mnemonicTrimmed, name.trim(), '');
      onDone();
    } catch (err: any) {
      if (err.message.includes('already added')) {
        setError(t('account_already_added'));
      } else {
        setError(err.message);
      }
      setIsSaving(false);
    }
  };

  if (step === 1) {
    return (
      <ScrollView
        style={{flex: 1, backgroundColor: Colors.primaryBg}}
        contentContainerStyle={{padding: 24}}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}>
          <Text style={{fontSize: 20, fontWeight: '700', color: Colors.text}}>
            {t('import_the_account')}
          </Text>
          <TouchableOpacity onPress={onCancel}>
            <Text style={{color: Colors.textLight, fontSize: 16}}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Label */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: Colors.textLight,
            letterSpacing: 0.5,
            marginBottom: 8,
          }}>
          {t('existing_seed')}
        </Text>

        {/* Mnemonic input */}
        <TextInput
          value={mnemonic}
          onChangeText={text => {
            setMnemonic(text);
            setError(null);
          }}
          multiline
          numberOfLines={4}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="word1 word2 word3 ..."
          placeholderTextColor={Colors.textLight}
          style={{
            width: '100%',
            backgroundColor: '#fff',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 15,
            color: Colors.text,
            borderWidth: 1,
            borderColor: error ? Colors.error : Colors.grey,
            marginBottom: 8,
            minHeight: 100,
            textAlignVertical: 'top',
          }}
        />

        {/* Word count indicator */}
        <Text
          style={{
            fontSize: 12,
            color: isValidWordCount ? Colors.green : Colors.textLight,
            marginBottom: 8,
          }}>
          {wordCount} word{wordCount !== 1 ? 's' : ''} entered
          {isValidWordCount ? ' ✓' : ' (need 12 or 24)'}
        </Text>

        {/* Error */}
        {error && (
          <Text
            style={{
              color: Colors.error,
              fontSize: 13,
              marginBottom: 8,
              fontWeight: '500',
            }}>
            {error}
          </Text>
        )}

        {/* Next button */}
        <TouchableOpacity
          onPress={handleNext}
          disabled={!isValidWordCount}
          activeOpacity={0.7}
          style={{
            marginTop: 16,
            backgroundColor: isValidWordCount ? Colors.purple : Colors.grey,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
          }}>
          <Text
            style={{
              color: isValidWordCount ? '#fff' : Colors.textLight,
              fontSize: 16,
              fontWeight: '600',
            }}>
            {t('next_step')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Step 2: Name entry
  return (
    <ScrollView
      style={{flex: 1, backgroundColor: Colors.primaryBg}}
      contentContainerStyle={{padding: 24}}
      keyboardShouldPersistTaps="handled">
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}>
        <TouchableOpacity onPress={() => setStep(1)}>
          <Text style={{color: Colors.purple, fontSize: 16}}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel}>
          <Text style={{color: Colors.textLight, fontSize: 16}}>✕</Text>
        </TouchableOpacity>
      </View>

      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: Colors.textLight,
          letterSpacing: 0.5,
          marginBottom: 8,
        }}>
        {t('descriptive_account_name')}
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        autoFocus
        placeholder={t('name_your_account')}
        placeholderTextColor={Colors.textLight}
        style={{
          width: '100%',
          backgroundColor: '#fff',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 16,
          color: Colors.text,
          borderWidth: 1,
          borderColor: Colors.grey,
          marginBottom: 12,
        }}
      />

      {/* Error */}
      {error && (
        <Text
          style={{
            color: Colors.error,
            fontSize: 13,
            marginBottom: 8,
            fontWeight: '500',
          }}>
          {error}
        </Text>
      )}

      {/* Import */}
      <TouchableOpacity
        onPress={handleImport}
        disabled={!name.trim() || isSaving}
        activeOpacity={0.7}
        style={{
          marginTop: 16,
          backgroundColor:
            name.trim() && !isSaving ? Colors.purple : Colors.grey,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        }}>
        <Text
          style={{
            color: name.trim() && !isSaving ? '#fff' : Colors.textLight,
            fontSize: 16,
            fontWeight: '600',
          }}>
          {isSaving ? t('loading') : t('import_the_account')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
