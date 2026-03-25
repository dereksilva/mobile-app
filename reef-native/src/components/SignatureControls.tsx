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
import Svg, {
  Path,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import {useTranslation} from 'react-i18next';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';
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
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';
  const {biometricAuth, setBiometricAuth} = useAppConfigStore();
  const {isAvailable, checkAvailability, authenticate} = useBiometrics();

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [useBiometric, setUseBiometric] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  // ─── Light Mode ──────────────────────────────────────────────────────────
  if (isLight) {
    return (
      <View style={{gap: 24}}>
        {/* Password entry (hidden when using biometrics) */}
        {!useBiometric && (
          <View style={{gap: 12}}>
            <Text style={{
              fontSize: 10,
              fontWeight: '700',
              color: '#494457',
              letterSpacing: 1,
              textTransform: 'uppercase',
              paddingLeft: 4,
            }}>
              Password for Reef App
            </Text>
            <View style={{position: 'relative'}}>
              <TextInput
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  setPasswordError(null);
                }}
                secureTextEntry={!showPassword}
                placeholder="Enter your secure password"
                placeholderTextColor="#cbc3da"
                editable={!isProcessing}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 32,
                  height: 64,
                  paddingLeft: 24,
                  paddingRight: 56,
                  fontSize: 14,
                  color: '#2c024d',
                  shadowColor: '#000',
                  shadowOffset: {width: 0, height: 1},
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                  borderWidth: passwordError ? 1 : 0,
                  borderColor: passwordError ? Colors.error : 'transparent',
                }}
              />
              {/* Eye toggle */}
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
                style={{
                  position: 'absolute',
                  right: 20,
                  top: 20,
                }}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  {showPassword ? (
                    <Path
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      stroke="#494457"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <Path
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.878"
                      stroke="#494457"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </Svg>
              </TouchableOpacity>
            </View>
            {passwordError && (
              <Text style={{color: Colors.error, fontSize: 13, fontWeight: '500', paddingLeft: 4}}>
                {passwordError}
              </Text>
            )}
          </View>
        )}

        {/* Biometric toggle */}
        {isAvailable && (
          <TouchableOpacity
            onPress={() => handleToggleBiometric(!useBiometric)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 4,
            }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: useBiometric ? '#4e00cd' : 'rgba(203, 195, 218, 0.4)',
                backgroundColor: useBiometric ? '#4e00cd' : 'transparent',
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
            <Text style={{fontSize: 14, color: '#494457'}}>
              🔐 {t('enable_biometric_authentication')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Sign Transaction gradient button */}
        <TouchableOpacity
          onPress={handleApprove}
          disabled={isProcessing || (!useBiometric && !password.trim())}
          activeOpacity={0.8}
          style={{
            height: 64,
            borderRadius: 9999,
            overflow: 'hidden',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: isProcessing || (!useBiometric && !password.trim()) ? 0.5 : 1,
            shadowColor: '#b70054',
            shadowOffset: {width: 0, height: 20},
            shadowOpacity: 0.3,
            shadowRadius: 40,
            elevation: 12,
          }}>
          {/* Gradient background */}
          <Svg
            style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
            viewBox="0 0 1 1"
            preserveAspectRatio="none">
            <Defs>
              <SvgLinearGradient id="signBtnGrad" x1="0" y1="0" x2="0.3" y2="1">
                <Stop offset="0" stopColor="#b70054" />
                <Stop offset="1" stopColor="#4e00cd" />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width="1" height="1" fill="url(#signBtnGrad)" />
          </Svg>
          <Text style={{
            fontSize: 18,
            fontWeight: '800',
            color: '#fff',
            zIndex: 1,
          }}>
            {isProcessing
              ? t('loading')
              : useBiometric
                ? `🔐 ${buttonLabel}`
                : buttonLabel}
          </Text>
        </TouchableOpacity>

        {/* Cancel text button */}
        <TouchableOpacity
          onPress={onCancel}
          disabled={isProcessing}
          activeOpacity={0.7}
          style={{
            alignItems: 'center',
            paddingVertical: 8,
          }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#4e00cd',
          }}>
            {t('cancel')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Dark Mode ───────────────────────────────────────────────────────────
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
              backgroundColor: Colors.cardBg,
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
            backgroundColor: Colors.cardBg,
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
