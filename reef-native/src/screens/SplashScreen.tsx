/**
 * SplashScreen — app loading and initialization display.
 * Shows the Reef logo animation while the app bootstraps.
 * Mirrors splash_screen.dart but without the WebView init.
 */

import React from 'react';
import {View, Text, Image, ActivityIndicator} from 'react-native';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const reefLogo = require('../assets/images/reef.png');

interface SplashScreenProps {
  error?: string | null;
  onRetry?: () => void;
}

export default function SplashScreen({error, onRetry}: SplashScreenProps) {
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isLight ? '#fff7fe' : Colors.splashBg,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
      }}>
      {/* Reef logo */}
      <Image
        source={reefLogo}
        style={{
          width: 128,
          height: 128,
          marginBottom: 32,
        }}
        resizeMode="contain"
      />

      <Text
        style={{
          fontSize: 24,
          fontWeight: '700',
          color: isLight ? '#2c024d' : Colors.text,
          marginBottom: 8,
        }}>
        Reef Chain
      </Text>

      {!error ? (
        <>
          <ActivityIndicator
            size="large"
            color={isLight ? '#4e00cd' : Colors.purple}
            style={{marginTop: 24}}
          />
          <Text
            style={{
              color: isLight ? '#494457' : Colors.textLight,
              marginTop: 16,
              fontSize: 14,
            }}>
            Connecting to Reef network...
          </Text>
        </>
      ) : (
        <View style={{alignItems: 'center', marginTop: 24}}>
          <Text
            style={{
              color: Colors.error,
              fontSize: 14,
              textAlign: 'center',
              marginBottom: 16,
            }}>
            {error}
          </Text>
          <Text
            style={{
              color: isLight ? '#494457' : Colors.textLight,
              fontSize: 12,
              textAlign: 'center',
              marginBottom: 24,
            }}>
            Allow ~10s before retrying.
          </Text>
          {onRetry && (
            <Text
              onPress={onRetry}
              style={{
                color: isLight ? '#4e00cd' : Colors.purple,
                fontSize: 16,
                fontWeight: '600',
                paddingVertical: 12,
                paddingHorizontal: 32,
              }}>
              Retry
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
