/**
 * JsonImportScreen — restore account from encrypted JSON backup.
 * User pastes/enters JSON and provides the password used to encrypt it.
 *
 * Light mode matches the Figma "Restore from JSON" design (node 51:989).
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Svg, {
  Path,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import {useAccounts} from '../hooks/useAccounts';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';

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
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';

  const [jsonText, setJsonText] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const handleUploadFile = async () => {
    try {
      const DocumentPicker = require('react-native-document-picker').default;
      const RNFS = require('react-native-fs');
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      const file = result[0];
      const content = await RNFS.readFile(file.uri, 'utf8');
      setJsonText(content);
      setError(null);
    } catch (err: any) {
      if (!err?.message?.includes('cancel')) {
        Alert.alert('Error', 'Could not read file. Please paste JSON manually.');
      }
    }
  };

  const canSubmit = jsonText.trim() && password.trim() && !isSaving;

  // ─── Light Mode: Figma "Restore from JSON" design ─────────────────────────
  if (isLight) {
    return (
      <ScrollView
        style={{flex: 1, backgroundColor: '#fff7fe'}}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 128,
        }}
        keyboardShouldPersistTaps="handled">
        {/* ── Back arrow ── */}
        <View style={{marginBottom: 40}}>
          <TouchableOpacity
            onPress={onCancel}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                stroke="#2c024d"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* ── Hero heading ── */}
        <View style={{gap: 16, marginBottom: 48}}>
          <Text
            style={{
              fontSize: 36,
              fontWeight: '800',
              color: '#2c024d',
              letterSpacing: -0.9,
              lineHeight: 45,
            }}>
            Restore from{'\n'}
            <Text style={{color: '#b70054'}}>JSON file</Text>
          </Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '400',
              color: '#494457',
              lineHeight: 28,
              maxWidth: 448,
            }}>
            Import your existing account by uploading or pasting your secure
            backup data.
          </Text>
        </View>

        {/* ── Form Cards ── */}
        <View style={{gap: 24}}>
          {/* Account Name Card */}
          <View
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              borderRadius: 32,
              borderWidth: 1,
              borderColor: 'rgba(203, 195, 218, 0.15)',
              padding: 25,
              gap: 12,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 1},
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: '#4e00cd',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}>
              Name your account
            </Text>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: '#cbc3da',
                paddingBottom: 13,
                paddingTop: 3,
              }}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. My Primary Wallet"
                placeholderTextColor="rgba(203, 195, 218, 0.6)"
                style={{
                  fontSize: 18,
                  fontWeight: '500',
                  color: '#2c024d',
                  padding: 0,
                }}
              />
            </View>
          </View>

          {/* JSON Data Card */}
          <View
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              borderRadius: 32,
              borderWidth: 1,
              borderColor: 'rgba(203, 195, 218, 0.15)',
              padding: 25,
              gap: 16,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 1},
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}>
            {/* Label + Upload Button */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  color: '#4e00cd',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}>
                Account JSON
              </Text>
              <TouchableOpacity
                onPress={handleUploadFile}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}>
                {/* Upload icon */}
                <Svg width={10} height={12} viewBox="0 0 14 17" fill="none">
                  <Path
                    d="M1 12.5v1.875A1.875 1.875 0 002.875 16.25h8.25A1.875 1.875 0 0013 14.375V12.5M10.188 4.625L7 1.437 3.813 4.625M7 1.437V11.563"
                    stroke="#b70054"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: '#b70054',
                  }}>
                  Upload File
                </Text>
              </TouchableOpacity>
            </View>

            {/* JSON Textarea */}
            <View
              style={{
                backgroundColor: '#fcf0ff',
                borderRadius: 32,
                paddingHorizontal: 16,
                paddingTop: 16,
                paddingBottom: 16,
                minHeight: 132,
              }}>
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
                placeholder={'Paste your {"JSON": "data"} \nhere...'}
                placeholderTextColor="rgba(203, 195, 218, 0.6)"
                style={{
                  fontSize: 14,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  color: '#2c024d',
                  lineHeight: 20,
                  padding: 0,
                  textAlignVertical: 'top',
                }}
              />
            </View>
          </View>

          {/* Password Card */}
          <View
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              borderRadius: 32,
              borderWidth: 1,
              borderColor: 'rgba(203, 195, 218, 0.15)',
              padding: 25,
              gap: 12,
              shadowColor: '#000',
              shadowOffset: {width: 0, height: 1},
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                color: '#4e00cd',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}>
              Password
            </Text>
            <View
              style={{
                borderBottomWidth: 1,
                borderBottomColor: '#cbc3da',
                paddingBottom: 13,
                paddingTop: 3,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
              <TextInput
                value={password}
                onChangeText={text => {
                  setPassword(text);
                  setError(null);
                }}
                secureTextEntry={!showPassword}
                placeholder="Enter file password"
                placeholderTextColor="rgba(203, 195, 218, 0.6)"
                style={{
                  flex: 1,
                  fontSize: 18,
                  fontWeight: '500',
                  color: '#2c024d',
                  padding: 0,
                }}
              />
              {/* Eye toggle */}
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Svg width={22} height={15} viewBox="0 0 24 18" fill="none">
                  {showPassword ? (
                    <>
                      <Path
                        d="M2.036 9.407A11.016 11.016 0 0112 3c4.638 0 8.573 2.97 9.964 6.407C20.573 12.854 16.638 15 12 15c-4.638 0-8.573-2.146-9.964-5.593z"
                        stroke="#cbc3da"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <Path
                        d="M15 9a3 3 0 11-6 0 3 3 0 016 0z"
                        stroke="#cbc3da"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  ) : (
                    <Path
                      d="M3.98 3.98l16.04 16.04M10.477 10.477a2.121 2.121 0 003.046 3.046M7.362 7.362A8.265 8.265 0 003 12c1.5 4 5.25 6 9 6a8.25 8.25 0 004.638-1.362M14.121 9.879A2.121 2.121 0 0012 8.25M21 12c-1.5 4-5.25 6-9 6M9.878 5.879A8.25 8.25 0 0112 6c3.75 0 7.5 2 9 6a11.05 11.05 0 01-1.362 2.638"
                      stroke="#cbc3da"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </Svg>
              </TouchableOpacity>
            </View>
          </View>

          {/* Error */}
          {error && (
            <Text
              style={{
                color: '#ba1a1a',
                fontSize: 14,
                fontWeight: '500',
                paddingHorizontal: 8,
              }}>
              {error}
            </Text>
          )}

          {/* ── Action Button ── */}
          <View style={{gap: 24, paddingTop: 16}}>
            <TouchableOpacity
              onPress={handleImport}
              disabled={!canSubmit}
              activeOpacity={0.8}
              style={{
                height: 68,
                borderRadius: 9999,
                overflow: 'hidden',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
                opacity: canSubmit ? 1 : 0.5,
                shadowColor: '#b70054',
                shadowOffset: {width: 0, height: 10},
                shadowOpacity: 0.2,
                shadowRadius: 15,
                elevation: 8,
              }}>
              <Svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
                viewBox="0 0 1 1"
                preserveAspectRatio="none">
                <Defs>
                  <SvgLinearGradient
                    id="importBtnGrad"
                    x1="0"
                    y1="0"
                    x2="0.3"
                    y2="1">
                    <Stop offset="0" stopColor="#b70054" />
                    <Stop offset="1" stopColor="#4e00cd" />
                  </SvgLinearGradient>
                </Defs>
                <Rect
                  x="0"
                  y="0"
                  width="1"
                  height="1"
                  fill="url(#importBtnGrad)"
                />
              </Svg>
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '700',
                      color: '#fff',
                      zIndex: 1,
                    }}>
                    Import Account
                  </Text>
                  {/* Arrow icon */}
                  <Svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{zIndex: 1}}>
                    <Path
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      stroke="#fff"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </>
              )}
            </TouchableOpacity>

            {/* Security note */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8,
              }}>
              {/* Lock/shield icon */}
              <Svg width={11} height={13} viewBox="0 0 16 19" fill="none">
                <Path
                  d="M8 1.5L1.5 4.25v4.5c0 4.556 2.775 8.306 6.5 9.75 3.725-1.444 6.5-5.194 6.5-9.75v-4.5L8 1.5z"
                  stroke="#494457"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text
                style={{
                  fontSize: 14,
                  color: '#494457',
                  textAlign: 'center',
                }}>
                Your keys never leave this device.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  // ─── Dark Mode (existing design) ────────────────────────────────────────────
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
