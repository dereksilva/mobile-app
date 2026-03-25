/**
 * MetadataApprovalModal — approve chain metadata updates.
 * Mirrors metadata_aproval_modal.dart from Flutter.
 *
 * When a dApp requests metadata injection, this modal shows the
 * metadata details and asks the user to approve or reject.
 *
 * Metadata includes: chain name, token symbol, decimals, spec version.
 */

import React from 'react';
import {View, Text, TouchableOpacity, Modal} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Colors} from '../utils/colors';

export interface ChainMetadata {
  chain: string;
  genesisHash: string;
  specVersion: number;
  ss58Format: number;
  tokenDecimals: number;
  tokenSymbol: string;
}

interface MetadataApprovalModalProps {
  visible: boolean;
  metadata: ChainMetadata | null;
  currentVersion?: number;
  onApprove: () => void;
  onReject: () => void;
}

export default function MetadataApprovalModal({
  visible,
  metadata,
  currentVersion,
  onApprove,
  onReject,
}: MetadataApprovalModalProps) {
  const {t} = useTranslation();

  if (!metadata) return null;

  const isUpgrade =
    currentVersion !== undefined && currentVersion < metadata.specVersion;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 24,
        }}>
        <View
          style={{
            backgroundColor: Colors.cardBg,
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 360,
          }}>
          {/* Warning icon */}
          <View style={{alignItems: 'center', marginBottom: 16}}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#fff3cd',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Text style={{fontSize: 28}}>⚠️</Text>
            </View>
          </View>

          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: Colors.text,
              textAlign: 'center',
              marginBottom: 8,
            }}>
            Metadata Update
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: Colors.textLight,
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: 20,
            }}>
            A dApp is requesting to update chain metadata. Review the details
            below.
          </Text>

          {/* Metadata details */}
          <View
            style={{
              backgroundColor: Colors.primaryBg,
              borderRadius: 12,
              padding: 14,
              marginBottom: 20,
            }}>
            <MetadataRow label="Chain" value={metadata.chain} />
            <MetadataRow label="Symbol" value={metadata.tokenSymbol} />
            <MetadataRow
              label="Decimals"
              value={String(metadata.tokenDecimals)}
            />
            <MetadataRow
              label="SS58 Format"
              value={String(metadata.ss58Format)}
            />
            {isUpgrade ? (
              <MetadataRow
                label="Version"
                value={`${currentVersion} → ${metadata.specVersion}`}
                highlight
              />
            ) : (
              <MetadataRow
                label="Version"
                value={String(metadata.specVersion)}
              />
            )}
            <MetadataRow
              label="Genesis"
              value={`${metadata.genesisHash.slice(0, 10)}...${metadata.genesisHash.slice(-8)}`}
            />
          </View>

          {/* Action buttons */}
          <View style={{flexDirection: 'row', gap: 12}}>
            <TouchableOpacity
              onPress={onReject}
              activeOpacity={0.7}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: Colors.primaryBg,
                borderWidth: 1,
                borderColor: Colors.grey,
              }}>
              <Text
                style={{
                  color: Colors.text,
                  fontSize: 15,
                  fontWeight: '600',
                }}>
                {t('reject')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onApprove}
              activeOpacity={0.7}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: Colors.purple,
              }}>
              <Text style={{color: '#fff', fontSize: 15, fontWeight: '600'}}>
                Approve
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MetadataRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
      }}>
      <Text style={{fontSize: 13, color: Colors.textLight}}>{label}</Text>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: highlight ? Colors.purple : Colors.text,
        }}>
        {value}
      </Text>
    </View>
  );
}
