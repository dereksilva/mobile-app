/**
 * JsonImportScreen — restore account from encrypted JSON backup.
 * User pastes/enters JSON and provides the password used to encrypt it.
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
import {useAccounts} from '../hooks/useAccounts';
import {Colors} from '../utils/colors';

interface JsonImportScreenProps {
  onDone: () => void;
  onCancel: () => void;
}

export default function JsonImportScreen({
  onDone,
  onCancel,
}: JsonImportScreenProps) {
  const {t} = useTranslation();
  const {importFromJson} = useAccounts();

  const [jsonText, setJsonText] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleImport = async () => {
    setError(null);

    // Parse JSON
    let json: any;
    try {
      json = JSON.parse(jsonText.trim());
    } catch {
      setError('Invalid JSON format');
      return;
    }

    if (!password.trim()) {
      setError(t('incorrect_password'));
      return;
    }

    setIsSaving(true);

    try {
      await importFromJson(json, password.trim(), name.trim());
      onDone();
    } catch (err: any) {
      if (err.message.includes('already added')) {
        setError(t('account_already_added'));
      } else if (
        err.message.includes('Invalid password') ||
        err.message.includes('corrupt')
      ) {
        setError(t('the_pass_is_incorrect'));
      } else {
        setError(err.message);
      }
      setIsSaving(false);
    }
  };

  const canSubmit = jsonText.trim() && password.trim() && !isSaving;

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
          {t('restore_from_json')}
        </Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={{color: Colors.textLight, fontSize: 16}}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Account name */}
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
        placeholder={t('name_your_account')}
        placeholderTextColor={Colors.textLight}
        style={{
          width: '100%',
          backgroundColor: Colors.cardBg,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 16,
          color: Colors.text,
          borderWidth: 1,
          borderColor: Colors.grey,
          marginBottom: 20,
        }}
      />

      {/* JSON input */}
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: Colors.textLight,
          letterSpacing: 0.5,
          marginBottom: 8,
        }}>
        ACCOUNT JSON
      </Text>
      <TextInput
        value={jsonText}
        onChangeText={text => {
          setJsonText(text);
          setError(null);
        }}
        multiline
        numberOfLines={6}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder='Paste your JSON backup here...'
        placeholderTextColor={Colors.textLight}
        style={{
          width: '100%',
          backgroundColor: Colors.cardBg,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 13,
          fontFamily: 'monospace',
          color: Colors.text,
          borderWidth: 1,
          borderColor: Colors.grey,
          marginBottom: 20,
          minHeight: 120,
          textAlignVertical: 'top',
        }}
      />

      {/* Password */}
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: Colors.textLight,
          letterSpacing: 0.5,
          marginBottom: 8,
        }}>
        {t('password')}
      </Text>
      <Text
        style={{
          fontSize: 12,
          color: Colors.textLight,
          marginBottom: 8,
        }}>
        {t('enter_same_pass')}
      </Text>
      <TextInput
        value={password}
        onChangeText={text => {
          setPassword(text);
          setError(null);
        }}
        secureTextEntry
        placeholder={t('password')}
        placeholderTextColor={Colors.textLight}
        style={{
          width: '100%',
          backgroundColor: Colors.cardBg,
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

      {/* Import button */}
      <TouchableOpacity
        onPress={handleImport}
        disabled={!canSubmit}
        activeOpacity={0.7}
        style={{
          marginTop: 16,
          backgroundColor: canSubmit ? Colors.purple : Colors.grey,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        }}>
        <Text
          style={{
            color: canSubmit ? '#fff' : Colors.textLight,
            fontSize: 16,
            fontWeight: '600',
          }}>
          {isSaving ? t('loading') : t('import_the_account')}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
