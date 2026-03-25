/**
 * AddAccountScreen — choose how to add an account.
 * Mirrors add_account_modal.dart with 3 options.
 */

import React from 'react';
import {View, Text, TouchableOpacity, ScrollView} from 'react-native';
import {useTranslation} from 'react-i18next';
import Svg, {
  Path,
  Rect,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';

interface AddAccountScreenProps {
  onCreateNew: () => void;
  onImportSeed: () => void;
  onRestoreJson: () => void;
  onClose: () => void;
}

// ─── Dark mode option button (unchanged) ────────────────────────────────────

function OptionButton({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: Colors.cardBg,
        borderRadius: 14,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.grey,
      }}>
      <Text style={{fontSize: 16, fontWeight: '600', color: Colors.text}}>
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            fontSize: 13,
            color: Colors.textLight,
            marginTop: 4,
          }}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Light mode option card ─────────────────────────────────────────────────

interface LightOptionCardProps {
  iconPath: string;
  title: string;
  description: string;
  onPress: () => void;
  gradientId: string;
}

function LightOptionCard({
  iconPath,
  title,
  description,
  onPress,
  gradientId,
}: LightOptionCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(203, 195, 218, 0.15)',
        padding: 25,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
      }}>
      {/* Gradient icon circle */}
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          overflow: 'hidden',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <Svg
          style={{position: 'absolute'}}
          width={56}
          height={56}
          viewBox="0 0 56 56">
          <Defs>
            <SvgLinearGradient
              id={gradientId}
              x1="0"
              y1="0"
              x2="56"
              y2="56"
              gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor="#b70054" />
              <Stop offset="1" stopColor="#4e00cd" />
            </SvgLinearGradient>
          </Defs>
          <Rect width={56} height={56} rx={28} fill={`url(#${gradientId})`} />
        </Svg>
        <Svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          style={{zIndex: 1}}>
          <Path
            d={iconPath}
            stroke="#fff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>

      {/* Text content */}
      <View style={{flex: 1, gap: 4}}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '800',
            color: '#2c024d',
            lineHeight: 24,
          }}>
          {title}
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '400',
            color: '#494457',
            lineHeight: 19,
            opacity: 0.8,
          }}>
          {description}
        </Text>
      </View>

      {/* Chevron arrow */}
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path
          d="M8.25 4.5l7.5 7.5-7.5 7.5"
          stroke="rgba(73, 68, 87, 0.4)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </TouchableOpacity>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function AddAccountScreen({
  onCreateNew,
  onImportSeed,
  onRestoreJson,
  onClose,
}: AddAccountScreenProps) {
  const {t} = useTranslation();
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';

  // ─── Light Mode: Figma "Create New Account" design ──────────────────────
  if (isLight) {
    return (
      <ScrollView
        style={{flex: 1, backgroundColor: '#fff7fe'}}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 80,
        }}>
        {/* ── Header: Back arrow ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            marginBottom: 40,
          }}>
          <TouchableOpacity
            onPress={onClose}
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

        {/* ── Hero Section ── */}
        <View style={{alignItems: 'center', gap: 16, marginBottom: 48}}>
          <Text
            style={{
              fontSize: 36,
              fontWeight: '800',
              color: '#2c024d',
              letterSpacing: -0.9,
              textAlign: 'center',
              lineHeight: 44,
            }}>
            Expand Your{'\n'}
            <Text style={{color: '#4e00cd'}}>Ecosystem</Text>
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: '#494457',
              textAlign: 'center',
              lineHeight: 22,
              opacity: 0.8,
              maxWidth: 280,
            }}>
            Choose how you would like to connect to the Reef network and manage
            your digital assets.
          </Text>
        </View>

        {/* ── Option Cards ── */}
        <View style={{gap: 16, marginBottom: 48}}>
          <LightOptionCard
            gradientId="createGrad"
            iconPath="M12 4.5v15m7.5-7.5h-15"
            title="Create new"
            description="Generate a brand new decentralized account and secure your seed phrase."
            onPress={onCreateNew}
          />

          <LightOptionCard
            gradientId="recoverGrad"
            iconPath="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M21.015 4.353v4.992"
            title="From recovery phrase"
            description="Import an existing account using your 12 or 24-word secret phrase."
            onPress={onImportSeed}
          />

          <LightOptionCard
            gradientId="jsonGrad"
            iconPath="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            title="From JSON file"
            description="Restore your wallet identity by uploading a backup JSON keystore file."
            onPress={onRestoreJson}
          />
        </View>

        {/* ── Security Protocol Footer ── */}
        <View
          style={{
            backgroundColor: 'rgba(245, 226, 255, 0.4)',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.5)',
            padding: 24,
            alignItems: 'center',
            gap: 12,
          }}>
          {/* Shield icon */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(183, 0, 84, 0.08)',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                stroke="#b70054"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: '#494457',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}>
            Security Protocol
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: '#494457',
              textAlign: 'center',
              lineHeight: 20,
              opacity: 0.7,
            }}>
            Reef does not store your private keys. You are in total control of
            your funds.
          </Text>
        </View>

        <View style={{height: 40}} />
      </ScrollView>
    );
  }

  // ─── Dark Mode (existing design) ────────────────────────────────────────────
  return (
    <ScrollView
      style={{flex: 1, backgroundColor: Colors.primaryBg}}
      contentContainerStyle={{padding: 24}}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}>
        <Text style={{fontSize: 22, fontWeight: '700', color: Colors.text}}>
          {t('add_account')}
        </Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <Text style={{fontSize: 16, color: Colors.textLight}}>✕</Text>
        </TouchableOpacity>
      </View>

      <OptionButton
        title={t('create_new_account')}
        subtitle="Generate a new 12-word recovery phrase"
        onPress={onCreateNew}
      />

      <OptionButton
        title={t('import_account_from_pre_existing_seed')}
        subtitle="Restore using your 12 or 24-word mnemonic"
        onPress={onImportSeed}
      />

      <OptionButton
        title={t('restore_from_json')}
        subtitle="Import from an encrypted JSON backup file"
        onPress={onRestoreJson}
      />
    </ScrollView>
  );
}
