/**
 * ConnectionDiagnostics — shows real-time connection status.
 * Mirrors the developer settings diagnostics in Flutter's settings_page.dart.
 *
 * Displays three connection indicators:
 * - JS Connection (reef chain JS runtime)
 * - Provider Connection (RPC WebSocket)
 * - Indexer Connection (GraphQL subsquid)
 */

import React from 'react';
import {View, Text} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useConnectionStore} from '../stores/useConnectionStore';
import {useNetworkStore} from '../stores/useNetworkStore';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';

export default function ConnectionDiagnostics() {
  const {t} = useTranslation();
  const jsConn = useConnectionStore(s => s.jsConn);
  const providerConn = useConnectionStore(s => s.providerConn);
  const indexerConn = useConnectionStore(s => s.indexerConn);
  const network = useNetworkStore(s => s.selectedNetworkName);
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';

  return (
    <View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: isLight ? '#494457' : Colors.textLight,
          letterSpacing: 0.5,
          marginBottom: 12,
        }}>
        {t('connection_stats').toUpperCase()}
      </Text>

      <ConnectionRow
        label={t('js_connection')}
        connected={jsConn}
        connectedLabel={t('connected')}
        disconnectedLabel={t('disconnected')}
        isLight={isLight}
      />
      <ConnectionRow
        label={t('provider_connection')}
        connected={providerConn}
        connectedLabel={t('connected')}
        disconnectedLabel={t('disconnected')}
        isLight={isLight}
      />
      <ConnectionRow
        label={t('indexer_connection')}
        connected={indexerConn}
        connectedLabel={t('connected')}
        disconnectedLabel={t('disconnected')}
        isLight={isLight}
      />

      {/* Network info */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 8,
          marginTop: 8,
          borderTopWidth: 1,
          borderTopColor: isLight ? 'rgba(203,195,218,0.2)' : Colors.grey,
        }}>
        <Text style={{fontSize: 13, color: isLight ? '#494457' : Colors.textLight}}>
          {t('network')}
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: isLight ? '#2c024d' : Colors.text,
            textTransform: 'capitalize',
          }}>
          {network}
        </Text>
      </View>
    </View>
  );
}

function ConnectionRow({
  label,
  connected,
  connectedLabel,
  disconnectedLabel,
  isLight,
}: {
  label: string;
  connected: boolean;
  connectedLabel: string;
  disconnectedLabel: string;
  isLight: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
      }}>
      <Text style={{fontSize: 13, color: isLight ? '#494457' : Colors.textLight}}>{label}</Text>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: connected ? Colors.green : Colors.error,
          }}
        />
        <Text
          style={{
            fontSize: 13,
            fontWeight: '500',
            color: connected ? Colors.green : Colors.error,
          }}>
          {connected ? connectedLabel : disconnectedLabel}
        </Text>
      </View>
    </View>
  );
}
