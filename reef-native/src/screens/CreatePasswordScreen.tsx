/**
 * CreatePasswordScreen — first-time password setup.
 * Shown after the intro carousel on first launch.
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import * as Storage from '../services/StorageService';
import {Colors} from '../utils/colors';

const MIN_PASSWORD_LENGTH = 6;

interface CreatePasswordScreenProps {
  onPasswordCreated: () => void;
}

export default function CreatePasswordScreen({
  onPasswordCreated,
}: CreatePasswordScreenProps) {
  const {t} = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('password_too_short'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('password_do_not_match'));
      return;
    }

    setIsSaving(true);
    await Storage.savePasswordSecure(password);
    setIsSaving(false);

    onPasswordCreated();
  };

  const isValid =
    password.length >= MIN_PASSWORD_LENGTH && password === confirmPassword;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{flex: 1, backgroundColor: Colors.splashBg}}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 32,
        }}
        keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={{alignItems: 'center', marginBottom: 40}}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: Colors.purple,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 24,
            }}>
            <Text style={{color: '#fff', fontSize: 32, fontWeight: '700'}}>
              R
            </Text>
          </View>

          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: Colors.text,
              marginBottom: 8,
            }}>
            {t('password_for_reef_app')}
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: Colors.textLight,
              textAlign: 'center',
            }}>
            Create a password to secure your wallet
          </Text>
        </View>

        {/* New password */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: Colors.textLight,
            letterSpacing: 0.5,
            marginBottom: 8,
          }}>
          {t('new_password')}
        </Text>
        <TextInput
          value={password}
          onChangeText={text => {
            setPassword(text);
            setError(null);
          }}
          secureTextEntry
          autoFocus
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
            marginBottom: 20,
          }}
        />

        {/* Confirm password */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: Colors.textLight,
            letterSpacing: 0.5,
            marginBottom: 8,
          }}>
          {t('repetitive_password')}
        </Text>
        <TextInput
          value={confirmPassword}
          onChangeText={text => {
            setConfirmPassword(text);
            setError(null);
          }}
          onSubmitEditing={handleCreate}
          secureTextEntry
          placeholder={t('password')}
          placeholderTextColor={Colors.textLight}
          returnKeyType="done"
          style={{
            width: '100%',
            backgroundColor: Colors.cardBg,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            fontSize: 16,
            color: Colors.text,
            borderWidth: 1,
            borderColor:
              error && password !== confirmPassword ? Colors.error : Colors.grey,
            marginBottom: 8,
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

        {/* Submit */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={!isValid || isSaving}
          activeOpacity={0.7}
          style={{
            marginTop: 16,
            width: '100%',
            backgroundColor: isValid && !isSaving ? Colors.purple : Colors.grey,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
          }}>
          <Text
            style={{
              color: isValid && !isSaving ? '#fff' : Colors.textLight,
              fontSize: 16,
              fontWeight: '600',
            }}>
            {isSaving ? t('loading') : t('continue_')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
