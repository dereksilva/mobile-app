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
import type {DecodedTransaction, TxDecodedData} from '../services/TransactionDescService';

interface MethodDataDisplayProps {
  decoded: DecodedTransaction;
  metadata?: TxDecodedData;
}

/** A single row in the details table */
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

export default function MethodDataDisplay({
  decoded,
  metadata,
}: MethodDataDisplayProps) {
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
