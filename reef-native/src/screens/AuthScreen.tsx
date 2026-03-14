/**
 * AuthScreen — password and biometric authentication.
 * Shown when returning user has a password set.
 * Mirrors the auth UI from splash_screen.dart lines 380-523.
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import * as Storage from '../services/StorageService';
import {useBiometrics} from '../hooks/useBiometrics';
import {useAppConfigStore} from '../stores/useAppConfigStore';
import {Colors} from '../utils/colors';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export default function AuthScreen({onAuthenticated}: AuthScreenProps) {
  const {t} = useTranslation();
  const [password, setPassword] = useState('');
  const [wrongPassword, setWrongPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const biometricEnabled = useAppConfigStore(s => s.biometricAuth);
  const {isAvailable: bioAvailable, isLockedOut, authenticate, checkAvailability} =
    useBiometrics();

  // Auto-trigger biometric on mount if enabled
  useEffect(() => {
    if (biometricEnabled) {
      checkAvailability().then(available => {
        if (available) {
          handleBiometric();
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePasswordSubmit = async () => {
    if (!password.trim() || isVerifying) return;
    setIsVerifying(true);
    setWrongPassword(false);

    const ok = await Storage.verifyPasswordSecure(password);
    setIsVerifying(false);

    if (ok) {
      onAuthenticated();
    } else {
      setWrongPassword(true);
      setPassword('');
    }
  };

  const handleBiometric = async () => {
    const success = await authenticate();
    if (success) {
      onAuthenticated();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{
        flex: 1,
        backgroundColor: Colors.splashBg,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
      }}>
      {/* Logo */}
      <View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: Colors.purple,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 40,
        }}>
        <Text style={{color: '#fff', fontSize: 36, fontWeight: '700'}}>R</Text>
      </View>

      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: Colors.textLight,
          letterSpacing: 1,
          marginBottom: 16,
        }}>
        {t('password_for_reef_app')}
      </Text>

      {/* Password input */}
      <TextInput
        value={password}
        onChangeText={text => {
          setPassword(text);
          setWrongPassword(false);
        }}
        onSubmitEditing={handlePasswordSubmit}
        secureTextEntry
        autoFocus
        placeholder={t('password')}
        placeholderTextColor={Colors.textLight}
        returnKeyType="done"
        style={{
          width: '100%',
          backgroundColor: '#fff',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 16,
          color: Colors.text,
          borderWidth: wrongPassword ? 1.5 : 1,
          borderColor: wrongPassword ? Colors.error : Colors.grey,
        }}
      />

      {/* Error message */}
      {wrongPassword && (
        <Text
          style={{
            color: Colors.error,
            fontSize: 13,
            marginTop: 8,
            fontWeight: '500',
          }}>
          {t('incorrect_password')}
        </Text>
      )}

      {/* Submit button */}
      <TouchableOpacity
        onPress={handlePasswordSubmit}
        disabled={!password.trim() || isVerifying}
        activeOpacity={0.7}
        style={{
          marginTop: 20,
          width: '100%',
          backgroundColor:
            password.trim() && !isVerifying ? Colors.purple : Colors.grey,
          borderRadius: 12,
          paddingVertical: 14,
          alignItems: 'center',
        }}>
        <Text
          style={{
            color: password.trim() && !isVerifying ? '#fff' : Colors.textLight,
            fontSize: 16,
            fontWeight: '600',
          }}>
          {isVerifying ? t('loading') : t('send')}
        </Text>
      </TouchableOpacity>

      {/* Biometric button */}
      {biometricEnabled && bioAvailable && !isLockedOut && (
        <TouchableOpacity
          onPress={handleBiometric}
          activeOpacity={0.7}
          style={{
            marginTop: 16,
            paddingVertical: 12,
            paddingHorizontal: 24,
          }}>
          <Text
            style={{
              color: Colors.purple,
              fontSize: 14,
              fontWeight: '600',
            }}>
            {t('authenticate_with_biometrics')}
          </Text>
        </TouchableOpacity>
      )}

      {isLockedOut && (
        <Text
          style={{
            color: Colors.textLight,
            fontSize: 12,
            marginTop: 12,
            textAlign: 'center',
          }}>
          Biometric locked out. Please use your password.
        </Text>
      )}
    </KeyboardAvoidingView>
  );
}
