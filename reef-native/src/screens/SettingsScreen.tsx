/**
 * SettingsScreen — app configuration and preferences.
 * Mirrors settings_page.dart from Flutter.
 *
 * Sections:
 * - General: Language, Display Balance, Navigate on Account Switch
 * - Security: Password management, Biometric Auth
 * - Developer: Network switcher, Connection diagnostics (hidden by default)
 *
 * Developer mode unlocked by tapping the "Settings" title 4 times.
 */

import React, {useState, useEffect, useCallback} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Svg, {Path} from 'react-native-svg';

/** SVG icon for settings rows (Heroicons outline, 24x24) */
function SettingsIcon({d, color = Colors.purple, size = 20}: {d: string; color?: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{marginRight: 12}}>
      <Path d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Heroicons outline paths for settings icons
const SETTINGS_ICONS = {
  walletconnect: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-6 18h6',  // device-phone-mobile
  language: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418',  // globe-alt
  eye: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z',  // eye
  home: 'M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',  // home
  lock: 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',  // lock-closed
  key: 'M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z',  // key
  moon: 'M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z', // moon
  sun: 'M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z', // sun
};
import {useAppConfigStore} from '../stores/useAppConfigStore';
import {useLocaleStore} from '../stores/useLocaleStore';
import {useWalletConnectStore} from '../stores/useWalletConnectStore';
import {useBiometrics} from '../hooks/useBiometrics';
import {Colors, useColors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';
import ChangePasswordModal from '../components/ChangePasswordModal';
import LanguageSelectionModal from '../components/LanguageSelectionModal';
import NetworkSwitcher from '../components/NetworkSwitcher';
import ConnectionDiagnostics from '../components/ConnectionDiagnostics';
import WalletConnectScreen from './WalletConnectScreen';

const DEV_UNLOCK_TAPS = 4;

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  hi: 'हिन्दी',
  it: 'Italiano',
};

type SubScreen = 'settings' | 'walletconnect';

export default function SettingsScreen() {
  const {t} = useTranslation();
  const Colors = useColors();

  // Stores
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';
  const insets = useSafeAreaInsets();
  const toggleTheme = useThemeStore(s => s.toggleTheme);
  const displayBalance = useAppConfigStore(s => s.displayBalance);
  const toggleDisplayBalance = useAppConfigStore(s => s.toggleDisplayBalance);
  const biometricAuth = useAppConfigStore(s => s.biometricAuth);
  const setBiometricAuth = useAppConfigStore(s => s.setBiometricAuth);
  const navigateOnAccountSwitch = useAppConfigStore(
    s => s.navigateOnAccountSwitch,
  );
  const toggleNavigateOnAccountSwitch = useAppConfigStore(
    s => s.toggleNavigateOnAccountSwitch,
  );
  const developerMode = useAppConfigStore(s => s.developerMode);
  const setDeveloperMode = useAppConfigStore(s => s.setDeveloperMode);
  const selectedLanguage = useLocaleStore(s => s.selectedLanguage);
  const wcSessionCount = useWalletConnectStore(s => s.sessions.length);

  // Biometrics
  const {isAvailable: biometricsAvailable, checkAvailability} = useBiometrics();

  // Local state
  const [subScreen, setSubScreen] = useState<SubScreen>('settings');
  const [devTapCount, setDevTapCount] = useState(0);
  const [showDevSettings, setShowDevSettings] = useState(developerMode);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  useEffect(() => {
    if (developerMode) setShowDevSettings(true);
  }, [developerMode]);

  // Developer mode unlock — 4 taps on title
  const handleTitleTap = useCallback(() => {
    if (developerMode) return; // Already unlocked

    const nextCount = devTapCount + 1;
    setDevTapCount(nextCount);

    if (nextCount >= DEV_UNLOCK_TAPS) {
      setDeveloperMode(true);
      setShowDevSettings(true);
      Alert.alert('🎉', t('you_are_a_dev'));
      setDevTapCount(0);
    } else {
      const remaining = DEV_UNLOCK_TAPS - nextCount;
      // Toast-style feedback
      Alert.alert(
        '',
        `${t('tap')} ${remaining} ${t('more_times_to_enable')}`,
      );
    }
  }, [devTapCount, developerMode, setDeveloperMode, t]);

  const handleBiometricToggle = useCallback(
    (enabled: boolean) => {
      if (enabled && !biometricsAvailable) {
        Alert.alert('', t('biometric_auth'));
        return;
      }
      setBiometricAuth(enabled);
    },
    [biometricsAvailable, setBiometricAuth, t],
  );

  // Sub-screen routing
  if (subScreen === 'walletconnect') {
    return (
      <WalletConnectScreen onBack={() => setSubScreen('settings')} />
    );
  }

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: Colors.primaryBg}}
      contentContainerStyle={{paddingBottom: 40, paddingTop: isLight ? insets.top : 0}}>
      {/* Header */}
      <TouchableOpacity
        onPress={handleTitleTap}
        activeOpacity={1}
        style={{padding: 16, paddingBottom: 8}}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: Colors.text,
          }}>
          {t('settings')}
        </Text>
      </TouchableOpacity>

      {/* ── WALLETCONNECT ── */}
      <SettingsRow
        iconPath={SETTINGS_ICONS.walletconnect}
        label="WalletConnect"
        value={wcSessionCount > 0 ? `${wcSessionCount}` : undefined}
        onPress={() => setSubScreen('walletconnect')}
      />

      {/* ── GENERAL Section ── */}
      <SectionHeader label={t('general')} />

      {/* Language */}
      <SettingsRow
        iconPath={SETTINGS_ICONS.language}
        label={t('select_language')}
        value={LANGUAGE_LABELS[selectedLanguage] || selectedLanguage}
        onPress={() => setShowLanguageModal(true)}
      />

      {/* Theme Toggle */}
      <SettingsRow
        iconPath={theme === 'dark' ? SETTINGS_ICONS.moon : SETTINGS_ICONS.sun}
        label={theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
        value={theme === 'dark' ? 'On' : 'Off'}
        onPress={toggleTheme}
      />

      {/* Display Balance */}
      <SettingsToggle
        iconPath={SETTINGS_ICONS.eye}
        label={t('display_balance')}
        value={displayBalance}
        onToggle={toggleDisplayBalance}
      />

      {/* Navigate on Account Switch */}
      <SettingsToggle
        iconPath={SETTINGS_ICONS.home}
        label={t('go_to_home_on_account_switch')}
        value={navigateOnAccountSwitch}
        onToggle={toggleNavigateOnAccountSwitch}
      />

      {/* ── SECURITY Section ── */}
      <SectionHeader label={t('security')} />

      {/* Change Password */}
      <SettingsRow
        iconPath={SETTINGS_ICONS.lock}
        label={t('change_password')}
        onPress={() => setShowPasswordModal(true)}
      />

      {/* Biometric Auth */}
      <SettingsToggle
        iconPath={SETTINGS_ICONS.key}
        label={t('biometric_auth')}
        value={biometricAuth}
        onToggle={handleBiometricToggle}
        disabled={!biometricsAvailable}
      />

      {/* ── DEVELOPER Section ── */}
      {(developerMode || showDevSettings) && (
        <>
          <TouchableOpacity
            onPress={() => setShowDevSettings(prev => !prev)}
            activeOpacity={0.7}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 14,
                marginTop: 16,
              }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: Colors.textLight,
                  letterSpacing: 0.5,
                }}>
                {t('developer_settings').toUpperCase()}
              </Text>
              <Text style={{fontSize: 16, color: Colors.textLight}}>
                {showDevSettings ? '▲' : '▼'}
              </Text>
            </View>
          </TouchableOpacity>

          {showDevSettings && (
            <View style={{paddingHorizontal: 16}}>
              {/* Network Switcher */}
              <View
                style={{
                  backgroundColor: Colors.cardBg,
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 12,
                  shadowColor: '#000',
                  shadowOffset: {width: 0, height: 2},
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 2,
                }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: Colors.textLight,
                    letterSpacing: 0.5,
                    marginBottom: 12,
                  }}>
                  {t('switch_network').toUpperCase()}
                </Text>
                <NetworkSwitcher />
              </View>

              {/* Connection Diagnostics */}
              <View
                style={{
                  backgroundColor: Colors.cardBg,
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 12,
                  shadowColor: '#000',
                  shadowOffset: {width: 0, height: 2},
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 2,
                }}>
                <ConnectionDiagnostics />
              </View>
            </View>
          )}
        </>
      )}

      {/* ── ABOUT Section ── */}
      <SectionHeader label={t('about')} />

      <View
        style={{
          marginHorizontal: 16,
          backgroundColor: Colors.cardBg,
          borderRadius: 20,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 2},
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <Text style={{fontSize: 14, color: Colors.textLight}}>
            {t('version')}
          </Text>
          <Text style={{fontSize: 14, fontWeight: '600', color: Colors.text}}>
            1.2.0
          </Text>
        </View>
      </View>

      {/* Modals */}
      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
      <LanguageSelectionModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />
    </ScrollView>
  );
}

// --- Section Header ---

function SectionHeader({label}: {label: string}) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textLight,
        letterSpacing: 0.5,
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 10,
      }}>
      {label.toUpperCase()}
    </Text>
  );
}

// --- Settings Row (tappable) ---

interface SettingsRowProps {
  iconPath: string;
  label: string;
  value?: string;
  onPress: () => void;
}

function SettingsRow({iconPath, label, value, onPress}: SettingsRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.cardBg,
        marginHorizontal: 16,
        marginBottom: 2,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}>
      <SettingsIcon d={iconPath} />
      <Text style={{flex: 1, fontSize: 15, color: Colors.text}}>{label}</Text>
      {value && (
        <Text
          style={{
            fontSize: 14,
            color: Colors.textLight,
            marginRight: 8,
          }}>
          {value}
        </Text>
      )}
      <Text style={{fontSize: 16, color: Colors.textLight}}>›</Text>
    </TouchableOpacity>
  );
}

// --- Settings Toggle (switch) ---

interface SettingsToggleProps {
  iconPath: string;
  label: string;
  value: boolean;
  onToggle: (val: boolean) => void;
  disabled?: boolean;
}

function SettingsToggle({
  iconPath,
  label,
  value,
  onToggle,
  disabled,
}: SettingsToggleProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.cardBg,
        marginHorizontal: 16,
        marginBottom: 2,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
        opacity: disabled ? 0.5 : 1,
      }}>
      <SettingsIcon d={iconPath} />
      <Text style={{flex: 1, fontSize: 15, color: Colors.text}}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{false: Colors.grey, true: Colors.purple + '60'}}
        thumbColor={value ? Colors.purple : '#f4f3f4'}
      />
    </View>
  );
}
