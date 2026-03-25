/**
 * WalletConnectSessionModal — approval dialog for new dApp connections.
 * Mirrors wallet_connect_session_modal.dart from Flutter.
 *
 * Shows:
 * - dApp icon, name, and URL
 * - Selected account address
 * - Warning if session already exists (will replace)
 * - Approve / Reject buttons
 */

import React from 'react';
import {View, Text, TouchableOpacity, Modal, Image} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useWalletConnectStore} from '../stores/useWalletConnectStore';
import {useAccountStore} from '../stores/useAccountStore';
import {Colors} from '../utils/colors';

export default function WalletConnectSessionModal() {
  const {t} = useTranslation();
  const proposal = useWalletConnectStore(s => s.pendingProposal);
  const selectedAddress = useAccountStore(s => s.selectedAddress);

  if (!proposal) return null;

  const shortenAddress = (addr: string): string => {
    if (addr.length <= 16) return addr;
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  return (
    <Modal visible={!!proposal} transparent animationType="fade">
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
          {/* dApp Icon */}
          <View style={{alignItems: 'center', marginBottom: 16}}>
            {proposal.proposerIcon ? (
              <Image
                source={{uri: proposal.proposerIcon}}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  backgroundColor: Colors.primaryBg,
                }}
              />
            ) : (
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  backgroundColor: Colors.purple + '20',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: '700',
                    color: Colors.purple,
                  }}>
                  {proposal.proposerName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Connection request text */}
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: Colors.text,
              textAlign: 'center',
              marginBottom: 8,
            }}>
            {proposal.proposerName}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: Colors.textLight,
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: 20,
            }}>
            wants to connect to your Reef wallet
          </Text>

          {/* Session exists warning */}
          {proposal.sessionExists && (
            <View
              style={{
                backgroundColor: '#fff3cd',
                borderRadius: 10,
                padding: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#ffc107',
              }}>
              <Text style={{fontSize: 13, color: '#856404', lineHeight: 18}}>
                ⚠️ A session is already active. Connecting will replace the old
                session.
              </Text>
            </View>
          )}

          {/* Connection details */}
          <View
            style={{
              backgroundColor: Colors.primaryBg,
              borderRadius: 12,
              padding: 14,
              marginBottom: 24,
            }}>
            <DetailRow label="URL" value={proposal.proposerUrl} />
            <DetailRow
              label={t('address')}
              value={selectedAddress ? shortenAddress(selectedAddress) : '—'}
            />
          </View>

          {/* Action buttons */}
          <View style={{flexDirection: 'row', gap: 12}}>
            {/* Reject */}
            <TouchableOpacity
              onPress={() => proposal.resolve(false)}
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

            {/* Approve */}
            <TouchableOpacity
              onPress={() => proposal.resolve(true)}
              activeOpacity={0.7}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: Colors.accent,
              }}>
              <Text
                style={{color: '#fff', fontSize: 15, fontWeight: '600'}}>
                Approve
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({label, value}: {label: string; value: string}) {
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
          fontWeight: '500',
          color: Colors.text,
          maxWidth: '60%',
        }}
        numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
