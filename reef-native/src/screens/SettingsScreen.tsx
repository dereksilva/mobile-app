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
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useAppConfigStore} from '../stores/useAppConfigStore';
import {useLocaleStore} from '../stores/useLocaleStore';
import {useWalletConnectStore} from '../stores/useWalletConnectStore';
import {useBiometrics} from '../hooks/useBiometrics';
import {Colors} from '../utils/colors';
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

  // Stores
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
      contentContainerStyle={{paddingBottom: 40}}>
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
        icon="📱"
        label="WalletConnect"
        value={wcSessionCount > 0 ? `${wcSessionCount}` : undefined}
        onPress={() => setSubScreen('walletconnect')}
      />

      {/* ── GENERAL Section ── */}
      <SectionHeader label={t('general')} />

      {/* Language */}
      <SettingsRow
        icon="🌐"
        label={t('select_language')}
        value={LANGUAGE_LABELS[selectedLanguage] || selectedLanguage}
        onPress={() => setShowLanguageModal(true)}
      />

      {/* Display Balance */}
      <SettingsToggle
        icon="👁"
        label={t('display_balance')}
        value={displayBalance}
        onToggle={toggleDisplayBalance}
      />

      {/* Navigate on Account Switch */}
      <SettingsToggle
        icon="🏠"
        label={t('go_to_home_on_account_switch')}
        value={navigateOnAccountSwitch}
        onToggle={toggleNavigateOnAccountSwitch}
      />

      {/* ── SECURITY Section ── */}
      <SectionHeader label={t('security')} />

      {/* Change Password */}
      <SettingsRow
        icon="🔒"
        label={t('change_password')}
        onPress={() => setShowPasswordModal(true)}
      />

      {/* Biometric Auth */}
      <SettingsToggle
        icon="🔑"
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
                  backgroundColor: '#fff',
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: Colors.grey,
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
                  backgroundColor: '#fff',
                  borderRadius: 14,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: Colors.grey,
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
          backgroundColor: '#fff',
          borderRadius: 14,
          padding: 16,
          borderWidth: 1,
          borderColor: Colors.grey,
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
            1.0.0
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
  icon: string;
  label: string;
  value?: string;
  onPress: () => void;
}

function SettingsRow({icon, label, value, onPress}: SettingsRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 2,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.grey,
      }}>
      <Text style={{fontSize: 18, marginRight: 12}}>{icon}</Text>
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
  icon: string;
  label: string;
  value: boolean;
  onToggle: (val: boolean) => void;
  disabled?: boolean;
}

function SettingsToggle({
  icon,
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
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 2,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.grey,
        opacity: disabled ? 0.5 : 1,
      }}>
      <Text style={{fontSize: 18, marginRight: 12}}>{icon}</Text>
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
