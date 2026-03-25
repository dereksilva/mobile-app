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
import {useThemeStore} from '../stores/useThemeStore';
import Svg, {Rect, Defs, LinearGradient as SvgLinearGradient, Stop} from 'react-native-svg';

const MIN_PASSWORD_LENGTH = 6;

interface CreatePasswordScreenProps {
  onPasswordCreated: () => void;
}

export default function CreatePasswordScreen({
  onPasswordCreated,
}: CreatePasswordScreenProps) {
  const {t} = useTranslation();
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';
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

  /* ── Strength indicator ── */
  const strengthLevel =
    password.length === 0
      ? 0
      : password.length < MIN_PASSWORD_LENGTH
        ? 1
        : password.length < 10
          ? 2
          : 3;
  const strengthColors = isLight
    ? ['#cbc3da', '#b70054', '#4e00cd', '#0a8754']
    : ['transparent', Colors.error, Colors.purple, Colors.green];
  const strengthLabels = ['', 'Weak', 'Good', 'Strong'];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{flex: 1, backgroundColor: isLight ? '#fff7fe' : Colors.splashBg}}>
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
              backgroundColor: isLight ? '#4e00cd' : Colors.purple,
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
              color: isLight ? '#2c024d' : Colors.text,
              marginBottom: 8,
            }}>
            {t('password_for_reef_app')}
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: isLight ? '#494457' : Colors.textLight,
              textAlign: 'center',
            }}>
            Create a password to secure your wallet
          </Text>
        </View>

        {/* New password */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: isLight ? '#494457' : Colors.textLight,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
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
          placeholderTextColor={isLight ? '#cbc3da' : Colors.textLight}
          style={{
            width: '100%',
            backgroundColor: isLight ? '#fff' : Colors.cardBg,
            borderRadius: isLight ? 32 : 12,
            paddingHorizontal: isLight ? 24 : 16,
            paddingVertical: isLight ? undefined : 14,
            height: isLight ? 64 : undefined,
            fontSize: 16,
            color: isLight ? '#2c024d' : Colors.text,
            borderWidth: 1,
            borderColor: isLight ? 'rgba(78,0,205,0.05)' : Colors.grey,
            marginBottom: 8,
          }}
        />

        {/* Strength indicator */}
        {password.length > 0 && (
          <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
            {[1, 2, 3].map(level => (
              <View
                key={level}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  marginRight: level < 3 ? 6 : 0,
                  backgroundColor:
                    strengthLevel >= level
                      ? strengthColors[level]
                      : isLight ? '#cbc3da' : Colors.grey,
                }}
              />
            ))}
            <Text
              style={{
                marginLeft: 10,
                fontSize: 11,
                fontWeight: '600',
                color: strengthColors[strengthLevel] || (isLight ? '#494457' : Colors.textLight),
              }}>
              {strengthLabels[strengthLevel]}
            </Text>
          </View>
        )}

        {/* Confirm password */}
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: isLight ? '#494457' : Colors.textLight,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginBottom: 8,
            marginTop: 4,
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
            borderWidth: 1,
            borderColor:
              error && password !== confirmPassword
                ? Colors.error
                : isLight ? 'rgba(78,0,205,0.05)' : Colors.grey,
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
        {isLight ? (
          <TouchableOpacity
            onPress={handleCreate}
            disabled={!isValid || isSaving}
            activeOpacity={0.8}
            style={{
              marginTop: 16,
              width: '100%',
              height: 64,
              borderRadius: 9999,
              overflow: 'hidden',
              justifyContent: 'center',
              alignItems: 'center',
              opacity: isValid && !isSaving ? 1 : 0.45,
            }}>
            <Svg
              style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}
              viewBox="0 0 1 1"
              preserveAspectRatio="none">
              <Defs>
                <SvgLinearGradient id="createPwCtaGrad" x1="0" y1="0" x2="0.3" y2="1">
                  <Stop offset="0" stopColor="#b70054" />
                  <Stop offset="1" stopColor="#4e00cd" />
                </SvgLinearGradient>
              </Defs>
              <Rect x="0" y="0" width="1" height="1" fill="url(#createPwCtaGrad)" />
            </Svg>
            <Text style={{fontSize: 16, fontWeight: '700', color: '#fff', zIndex: 1}}>
              {isSaving ? t('loading') : t('continue_')}
            </Text>
          </TouchableOpacity>
        ) : (
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
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
