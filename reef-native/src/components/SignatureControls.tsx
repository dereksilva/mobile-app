/**
 * SignatureControls — authentication + approve/reject buttons for signing.
 * Mirrors SignatureControls.dart from Flutter.
 *
 * Supports:
 * - Password entry with validation
 * - Biometric authentication (fingerprint/face)
 * - Biometric toggle checkbox
 * - Approve / Cancel buttons
 */

import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, TextInput, TouchableOpacity, Alert} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Colors} from '../utils/colors';
import {useAppConfigStore} from '../stores/useAppConfigStore';
import {useBiometrics} from '../hooks/useBiometrics';
import * as StorageService from '../services/StorageService';

interface SignatureControlsProps {
  /** Whether signing an extrinsic (true) or raw message (false) */
  isExtrinsic: boolean;
  /** Called when user authenticates and approves */
  onApprove: (password: string | null) => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Whether the signing operation is in progress */
  isProcessing: boolean;
}

export default function SignatureControls({
  isExtrinsic,
  onApprove,
  onCancel,
  isProcessing,
}: SignatureControlsProps) {
  const {t} = useTranslation();
  const {biometricAuth, setBiometricAuth} = useAppConfigStore();
  const {isAvailable, checkAvailability, authenticate} = useBiometrics();

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [useBiometric, setUseBiometric] = useState(false);

  // Check biometric availability on mount
  useEffect(() => {
    checkAvailability().then(available => {
      setUseBiometric(available && biometricAuth);
    });
  }, [checkAvailability, biometricAuth]);

  const handleApprove = useCallback(async () => {
    setPasswordError(null);

    if (useBiometric) {
      // Biometric auth
      const success = await authenticate();
      if (success) {
        onApprove(null);
      } else {
        Alert.alert(t('incorrect_password'), t('authenticate_with_biometrics'));
      }
    } else {
      // Password auth
      if (!password.trim()) {
        setPasswordError(t('incorrect_password'));
        return;
      }

      const valid = await StorageService.verifyPasswordSecure(password.trim());
      if (valid) {
        onApprove(password.trim());
      } else {
        setPasswordError(t('change_password_password_incorrect'));
      }
    }
  }, [useBiometric, password, authenticate, onApprove, t]);

  const handleToggleBiometric = useCallback(
    (enabled: boolean) => {
      setUseBiometric(enabled);
      setBiometricAuth(enabled);
    },
    [setBiometricAuth],
  );

  const buttonLabel = isExtrinsic
    ? t('sign_transaction')
    : t('sign_message');

  return (
    <View style={{marginTop: 16}}>
      {/* Divider */}
      <View
        style={{
          height: 1,
          backgroundColor: Colors.grey,
          marginBottom: 16,
        }}
      />

      {/* Password entry (hidden when using biometrics) */}
      {!useBiometric && (
        <>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: Colors.textLight,
              letterSpacing: 0.5,
              marginBottom: 8,
            }}>
            {t('password_for_reef_app')}
          </Text>
          <TextInput
            value={password}
            onChangeText={text => {
              setPassword(text);
              setPasswordError(null);
            }}
            secureTextEntry
            placeholder={t('password')}
            placeholderTextColor={Colors.textLight}
            editable={!isProcessing}
            style={{
              width: '100%',
              backgroundColor: '#fff',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: Colors.text,
              borderWidth: 1,
              borderColor: passwordError ? Colors.error : Colors.grey,
              marginBottom: 4,
            }}
          />
          {passwordError && (
            <Text
              style={{
                color: Colors.error,
                fontSize: 13,
                fontWeight: '500',
                marginBottom: 8,
              }}>
              {passwordError}
            </Text>
          )}
        </>
      )}

      {/* Biometric toggle */}
      {isAvailable && (
        <TouchableOpacity
          onPress={() => handleToggleBiometric(!useBiometric)}
          activeOpacity={0.7}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            marginBottom: 8,
          }}>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              borderWidth: 2,
              borderColor: useBiometric ? Colors.accent : Colors.grey,
              backgroundColor: useBiometric ? Colors.accent : 'transparent',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}>
            {useBiometric && (
              <Text style={{color: '#fff', fontSize: 14, fontWeight: '700'}}>
                ✓
              </Text>
            )}
          </View>
          <Text style={{fontSize: 14, color: Colors.text}}>
            🔐 {t('enable_biometric_authentication')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Buttons row */}
      <View
        style={{
          flexDirection: 'row',
          marginTop: 12,
          gap: 12,
        }}>
        {/* Approve button (70%) */}
        <TouchableOpacity
          onPress={handleApprove}
          disabled={isProcessing || (!useBiometric && !password.trim())}
          activeOpacity={0.7}
          style={{
            flex: 7,
            backgroundColor:
              isProcessing || (!useBiometric && !password.trim())
                ? Colors.grey
                : Colors.accent,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
          }}>
          <Text
            style={{
              color:
                isProcessing || (!useBiometric && !password.trim())
                  ? Colors.textLight
                  : '#fff',
              fontSize: 16,
              fontWeight: '600',
            }}>
            {isProcessing
              ? t('loading')
              : useBiometric
                ? `🔐 ${buttonLabel}`
                : buttonLabel}
          </Text>
        </TouchableOpacity>

        {/* Cancel button (30%) */}
        <TouchableOpacity
          onPress={onCancel}
          disabled={isProcessing}
          activeOpacity={0.7}
          style={{
            flex: 3,
            backgroundColor: '#fff',
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: Colors.grey,
          }}>
          <Text
            style={{
              color: Colors.textLight,
              fontSize: 16,
              fontWeight: '600',
            }}>
            {t('cancel')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
