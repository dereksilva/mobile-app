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
  Image,
} from 'react-native';

const reefLogo = require('../assets/images/reef.png');
import {useTranslation} from 'react-i18next';
import * as Storage from '../services/StorageService';
import {useBiometrics} from '../hooks/useBiometrics';
import {useAppConfigStore} from '../stores/useAppConfigStore';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';
import Svg, {Rect, Defs, LinearGradient as SvgLinearGradient, Stop} from 'react-native-svg';

interface AuthScreenProps {
  onAuthenticated: () => void;
}

export default function AuthScreen({onAuthenticated}: AuthScreenProps) {
  const {t} = useTranslation();
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';
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

  const canSubmit = password.trim() && !isVerifying;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{
        flex: 1,
        backgroundColor: isLight ? '#fff7fe' : Colors.splashBg,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
      }}>
      {/* Logo */}
      <Image
        source={reefLogo}
        style={{width: 96, height: 96, borderRadius: 48, marginBottom: 40}}
        resizeMode="contain"
      />

      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: isLight ? '#494457' : Colors.textLight,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
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
        placeholderTextColor={isLight ? '#cbc3da' : Colors.textLight}
        returnKeyType="done"
        style={{
          width: '100%',
          backgroundColor: isLight ? '#fff' : Colors.cardBg,
          borderRadius: isLight ? 32 : 12,
          paddingHorizontal: isLight ? 24 : 16,
          paddingVertical: isLight ? undefined : 14,
          height: isLight ? 64 : undefined,
          fontSize: 16,
          color: isLight ? '#2c024d' : Colors.text,
          borderWidth: wrongPassword ? 1.5 : 1,
          borderColor: wrongPassword ? Colors.error : (isLight ? 'rgba(78,0,205,0.05)' : Colors.grey),
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
      {isLight ? (
        <TouchableOpacity
          onPress={handlePasswordSubmit}
          disabled={!canSubmit}
          activeOpacity={0.8}
          style={{
            marginTop: 20,
            width: '100%',
            height: 64,
            borderRadius: 9999,
            overflow: 'hidden',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: canSubmit ? 1 : 0.45,
          }}>
          <Svg
            style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
            viewBox="0 0 1 1"
            preserveAspectRatio="none">
            <Defs>
              <SvgLinearGradient id="authCtaGrad" x1="0" y1="0" x2="0.3" y2="1">
                <Stop offset="0" stopColor="#b70054" />
                <Stop offset="1" stopColor="#4e00cd" />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width="1" height="1" fill="url(#authCtaGrad)" />
          </Svg>
          <Text style={{fontSize: 16, fontWeight: '700', color: '#fff', zIndex: 1}}>
            {isVerifying ? t('loading') : t('send')}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={handlePasswordSubmit}
          disabled={!canSubmit}
          activeOpacity={0.7}
          style={{
            marginTop: 20,
            width: '100%',
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
            {isVerifying ? t('loading') : t('send')}
          </Text>
        </TouchableOpacity>
      )}

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
              color: isLight ? '#4e00cd' : Colors.purple,
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
            color: isLight ? '#494457' : Colors.textLight,
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
