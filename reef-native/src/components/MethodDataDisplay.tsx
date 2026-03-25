/**
 * MethodDataDisplay — shows decoded transaction details in a two-column table.
 * Mirrors MethodDataDisplay.dart and MethodBytesDataDisplay.dart from Flutter.
 *
 * For extrinsic payloads: shows method name, contract address, decoded params.
 * For raw bytes: shows the raw message data.
 */

import React from 'react';
import {View, Text} from 'react-native';
import {Colors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';
import type {DecodedTransaction, TxDecodedData} from '../services/TransactionDescService';

interface MethodDataDisplayProps {
  decoded: DecodedTransaction;
  metadata?: TxDecodedData;
}

/** A single row in the details table — dark mode */
function DetailRow({label, value}: {label: string; value: string}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.grey,
      }}>
      <Text
        style={{
          width: 100,
          fontSize: 12,
          fontWeight: '600',
          color: Colors.accent,
          textTransform: 'uppercase',
        }}>
        {label}
      </Text>
      <Text
        style={{
          flex: 1,
          fontSize: 13,
          color: Colors.text,
          fontFamily: 'monospace',
        }}
        numberOfLines={3}
        ellipsizeMode="middle"
        selectable>
        {value}
      </Text>
    </View>
  );
}

/** A single row in the details table — light mode */
function LightDetailRow({label, value}: {label: string; value: string}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(203, 195, 218, 0.15)',
      }}>
      <Text
        style={{
          width: 110,
          fontSize: 10,
          fontWeight: '700',
          color: '#494457',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}>
        {label}
      </Text>
      <Text
        style={{
          flex: 1,
          fontSize: 11,
          fontWeight: '600',
          color: '#4e00cd',
          fontFamily: 'monospace',
          textAlign: 'right',
        }}
        numberOfLines={1}
        ellipsizeMode="middle"
        selectable>
        {value}
      </Text>
    </View>
  );
}

export default function MethodDataDisplay({
  decoded,
  metadata,
}: MethodDataDisplayProps) {
  const theme = useThemeStore(s => s.theme);
  const isLight = theme === 'light';

  // ─── Light Mode ──────────────────────────────────────────────────────────
  if (isLight) {
    return (
      <View
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: 'rgba(78, 0, 205, 0.05)',
          paddingHorizontal: 20,
          paddingVertical: 4,
        }}>
        {/* Method name */}
        {decoded.methodName && decoded.methodName !== 'unknown' && (
          <LightDetailRow label="Method" value={decoded.methodName} />
        )}

        {/* Contract address (EVM calls only) */}
        {decoded.contractAddress && (
          <LightDetailRow label="Contract" value={decoded.contractAddress} />
        )}

        {/* Decoded params */}
        {Object.entries(decoded.params).map(([key, value]) => (
          <LightDetailRow key={key} label={key} value={value} />
        ))}

        {/* Metadata section */}
        {metadata && (
          <>
            {metadata.chainName && (
              <LightDetailRow label="Chain" value={metadata.chainName} />
            )}
            {metadata.tip && metadata.tip !== '0' && (
              <LightDetailRow label="Tip" value={metadata.tip} />
            )}
          </>
        )}
      </View>
    );
  }

  // ─── Dark Mode ───────────────────────────────────────────────────────────
  return (
    <View
      style={{
        backgroundColor: Colors.cardBg,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.grey,
      }}>
      {/* Method name */}
      {decoded.methodName && decoded.methodName !== 'unknown' && (
        <DetailRow label="Method" value={decoded.methodName} />
      )}

      {/* Contract address (EVM calls only) */}
      {decoded.contractAddress && (
        <DetailRow label="Contract" value={decoded.contractAddress} />
      )}

      {/* Decoded params */}
      {Object.entries(decoded.params).map(([key, value]) => (
        <DetailRow key={key} label={key} value={value} />
      ))}

      {/* Metadata section (slim — only chain and tip) */}
      {metadata && (
        <>
          {metadata.chainName && (
            <DetailRow label="Chain" value={metadata.chainName} />
          )}
          {metadata.tip && metadata.tip !== '0' && (
            <DetailRow label="Tip" value={metadata.tip} />
          )}
        </>
      )}
    </View>
  );
}
