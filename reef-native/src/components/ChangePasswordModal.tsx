/**
 * ChangePasswordModal — set, change, or remove the app password.
 * Mirrors change_password_modal.dart from Flutter.
 *
 * Flows:
 * - No password set  → new password + confirm → save
 * - Password exists  → current password + new + confirm → save
 * - Remove password  → current password → confirm removal
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import * as Storage from '../services/StorageService';
import {Colors} from '../utils/colors';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

const MIN_PASSWORD_LENGTH = 6;

export default function ChangePasswordModal({
  visible,
  onClose,
}: ChangePasswordModalProps) {
  const {t} = useTranslation();

  const [hasExistingPassword, setHasExistingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentError, setCurrentError] = useState('');
  const [newError, setNewError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'change' | 'remove'>('change');

  useEffect(() => {
    if (visible) {
      Storage.hasPasswordSet().then(setHasExistingPassword);
      // Reset state
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentError('');
      setNewError('');
      setConfirmError('');
      setLoading(false);
      setMode('change');
    }
  }, [visible]);

  const validateNewPassword = (value: string): boolean => {
    if (value.length > 0 && value.length < MIN_PASSWORD_LENGTH) {
      setNewError(t('password_too_short'));
      return false;
    }
    setNewError('');
    return true;
  };

  const validateConfirmPassword = (value: string): boolean => {
    if (value.length > 0 && value !== newPassword) {
      setConfirmError(t('password_do_not_match'));
      return false;
    }
    setConfirmError('');
    return true;
  };

  const canSubmit = (): boolean => {
    if (mode === 'remove') {
      return currentPassword.length > 0 && !loading;
    }
    if (hasExistingPassword && currentPassword.length === 0) return false;
    if (newPassword.length < MIN_PASSWORD_LENGTH) return false;
    if (confirmPassword !== newPassword) return false;
    if (loading) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setLoading(true);

    try {
      // Verify current password if one exists
      if (hasExistingPassword) {
        const isValid = await Storage.verifyPasswordSecure(currentPassword);
        if (!isValid) {
          setCurrentError(t('incorrect_password_entered'));
          setLoading(false);
          return;
        }
      }

      if (mode === 'remove') {
        await Storage.removePassword();
        Alert.alert('', t('password_removed'));
        onClose();
        return;
      }

      // Save new password
      await Storage.savePasswordSecure(newPassword);
      Alert.alert(
        '',
        hasExistingPassword
          ? t('password_changed_successfully')
          : t('password_set_successfully'),
      );
      onClose();
    } catch {
      setCurrentError(t('incorrect_password'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePassword = () => {
    if (!hasExistingPassword) return;
    Alert.alert(
      t('remove_password'),
      t('remove_password_confirm'),
      [
        {text: t('cancel'), style: 'cancel'},
        {
          text: t('yes'),
          style: 'destructive',
          onPress: () => setMode('remove'),
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}>
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}>
          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              paddingBottom: 40,
            }}>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
              }}>
              <Text
                style={{fontSize: 20, fontWeight: '700', color: Colors.text}}>
                {mode === 'remove'
                  ? t('remove_password')
                  : hasExistingPassword
                    ? t('change_password')
                    : t('set_password')}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={{fontSize: 28, color: Colors.textLight}}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Current password (if exists) */}
            {hasExistingPassword && (
              <View style={{marginBottom: 16}}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: Colors.textLight,
                    letterSpacing: 0.5,
                    marginBottom: 8,
                  }}>
                  {t('current_password').toUpperCase()}
                </Text>
                <TextInput
                  value={currentPassword}
                  onChangeText={val => {
                    setCurrentPassword(val);
                    setCurrentError('');
                  }}
                  secureTextEntry
                  placeholder={t('password')}
                  placeholderTextColor={Colors.textLight}
                  style={{
                    backgroundColor: Colors.primaryBg,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 15,
                    color: Colors.text,
                    borderWidth: 1,
                    borderColor: currentError ? Colors.error : Colors.grey,
                  }}
                />
                {!!currentError && (
                  <Text
                    style={{
                      color: Colors.error,
                      fontSize: 12,
                      marginTop: 4,
                      marginLeft: 4,
                    }}>
                    {currentError}
                  </Text>
                )}
              </View>
            )}

            {/* New password fields (hidden in remove mode) */}
            {mode === 'change' && (
              <>
                <View style={{marginBottom: 16}}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: Colors.textLight,
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}>
                    {t('new_password')}
                  </Text>
                  <TextInput
                    value={newPassword}
                    onChangeText={val => {
                      setNewPassword(val);
                      validateNewPassword(val);
                      if (confirmPassword) {
                        setConfirmError(
                          confirmPassword !== val
                            ? t('password_do_not_match')
                            : '',
                        );
                      }
                    }}
                    secureTextEntry
                    placeholder={t('password')}
                    placeholderTextColor={Colors.textLight}
                    style={{
                      backgroundColor: Colors.primaryBg,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 15,
                      color: Colors.text,
                      borderWidth: 1,
                      borderColor: newError ? Colors.error : Colors.grey,
                    }}
                  />
                  {!!newError && (
                    <Text
                      style={{
                        color: Colors.error,
                        fontSize: 12,
                        marginTop: 4,
                        marginLeft: 4,
                      }}>
                      {newError}
                    </Text>
                  )}
                </View>

                <View style={{marginBottom: 24}}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: Colors.textLight,
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}>
                    {t('confirm_password').toUpperCase()}
                  </Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={val => {
                      setConfirmPassword(val);
                      validateConfirmPassword(val);
                    }}
                    secureTextEntry
                    placeholder={t('repetitive_password')}
                    placeholderTextColor={Colors.textLight}
                    style={{
                      backgroundColor: Colors.primaryBg,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      fontSize: 15,
                      color: Colors.text,
                      borderWidth: 1,
                      borderColor: confirmError ? Colors.error : Colors.grey,
                    }}
                  />
                  {!!confirmError && (
                    <Text
                      style={{
                        color: Colors.error,
                        fontSize: 12,
                        marginTop: 4,
                        marginLeft: 4,
                      }}>
                      {confirmError}
                    </Text>
                  )}
                </View>
              </>
            )}

            {mode === 'remove' && (
              <Text
                style={{
                  fontSize: 14,
                  color: Colors.textLight,
                  marginBottom: 24,
                  lineHeight: 20,
                }}>
                {t('remove_password_confirm')}
              </Text>
            )}

            {/* Submit button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit()}
              activeOpacity={0.7}
              style={{
                backgroundColor: canSubmit()
                  ? mode === 'remove'
                    ? Colors.error
                    : Colors.purple
                  : Colors.grey,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                marginBottom: hasExistingPassword && mode === 'change' ? 12 : 0,
              }}>
              <Text
                style={{
                  color: canSubmit() ? '#fff' : Colors.textLight,
                  fontSize: 16,
                  fontWeight: '600',
                }}>
                {loading
                  ? t('loading')
                  : mode === 'remove'
                    ? t('remove_password')
                    : hasExistingPassword
                      ? t('change_password')
                      : t('set_password')}
              </Text>
            </TouchableOpacity>

            {/* Remove password link (only if password exists and in change mode) */}
            {hasExistingPassword && mode === 'change' && (
              <TouchableOpacity
                onPress={handleRemovePassword}
                style={{alignItems: 'center', paddingVertical: 8}}>
                <Text style={{color: Colors.error, fontSize: 14}}>
                  {t('remove_password')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
