/**
 * QRScannerModal — reusable camera-based QR code scanner.
 *
 * Used for:
 * - Scanning WalletConnect URIs (wc:...) to pair with dApps
 * - Scanning wallet addresses (Substrate SS58 or EVM 0x) for sending tokens/NFTs
 *
 * Uses react-native-camera-kit for camera + barcode scanning.
 * Handles camera permissions on both iOS and Android.
 */

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Platform,
  Linking,
  PermissionsAndroid,
  SafeAreaView,
} from 'react-native';
import {Camera} from 'react-native-camera-kit';
import {useTranslation} from 'react-i18next';
import {Colors} from '../utils/colors';

interface QRScannerModalProps {
  visible: boolean;
  onScan: (data: string) => void;
  onClose: () => void;
  /** Instruction text shown below the viewfinder */
  hint?: string;
}

type PermissionStatus = 'checking' | 'granted' | 'denied';

/**
 * Check and request camera permission.
 * Camera-kit's static methods are not implemented on Android,
 * so we use PermissionsAndroid directly on that platform.
 */
async function checkCameraPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    try {
      // On iOS, camera-kit provides static methods
      const CameraModule = Camera as unknown as {
        checkDeviceCameraAuthorizationStatus: () => Promise<boolean>;
        requestDeviceCameraAuthorization: () => Promise<boolean>;
      };
      const status =
        await CameraModule.checkDeviceCameraAuthorizationStatus();
      if (status) return true;
      return await CameraModule.requestDeviceCameraAuthorization();
    } catch {
      // Fallback: just return true and let the camera component handle it
      return true;
    }
  } else {
    // Android: use PermissionsAndroid
    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (granted) return true;

      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'Reef needs camera access to scan QR codes.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }
}

export default function QRScannerModal({
  visible,
  onScan,
  onClose,
  hint,
}: QRScannerModalProps) {
  const {t} = useTranslation();
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus>('checking');
  const hasScanned = useRef(false);

  // Reset scan state and check permissions when modal opens
  useEffect(() => {
    if (visible) {
      hasScanned.current = false;
      setPermissionStatus('checking');
      checkCameraPermission().then(granted => {
        setPermissionStatus(granted ? 'granted' : 'denied');
      });
    }
  }, [visible]);

  const handleReadCode = useCallback(
    (event: {nativeEvent: {codeStringValue: string}}) => {
      if (hasScanned.current) return;
      const data = event.nativeEvent.codeStringValue;
      if (data) {
        hasScanned.current = true;
        onScan(data);
      }
    },
    [onScan],
  );

  const handleOpenSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <SafeAreaView style={{flex: 1, backgroundColor: '#000'}}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: '#000',
          }}>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
            style={{padding: 4}}>
            <Text style={{color: '#fff', fontSize: 16, fontWeight: '600'}}>
              ✕
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              textAlign: 'center',
              color: '#fff',
              fontSize: 17,
              fontWeight: '700',
              marginRight: 24, // Offset for close button to center title
            }}>
            {t('scan_qr')}
          </Text>
        </View>

        {permissionStatus === 'granted' ? (
          // Camera view
          <View style={{flex: 1, position: 'relative'}}>
            <Camera
              style={{flex: 1}}
              scanBarcode
              onReadCode={handleReadCode}
              scanThrottleDelay={1500}
              showFrame={false}
            />

            {/* Viewfinder overlay */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              pointerEvents="none">
              {/* Semi-transparent background with clear center cutout */}
              {/* Top overlay */}
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '30%',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                }}
              />
              {/* Bottom overlay */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '30%',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                }}
              />
              {/* Left overlay */}
              <View
                style={{
                  position: 'absolute',
                  top: '30%',
                  left: 0,
                  width: '15%',
                  height: '40%',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                }}
              />
              {/* Right overlay */}
              <View
                style={{
                  position: 'absolute',
                  top: '30%',
                  right: 0,
                  width: '15%',
                  height: '40%',
                  backgroundColor: 'rgba(0,0,0,0.5)',
                }}
              />

              {/* Viewfinder frame */}
              <View
                style={{
                  width: 250,
                  height: 250,
                  borderRadius: 20,
                  borderWidth: 3,
                  borderColor: Colors.purple,
                }}
              />
            </View>

            {/* Hint text below viewfinder */}
            <View
              style={{
                position: 'absolute',
                bottom: '20%',
                left: 0,
                right: 0,
                alignItems: 'center',
              }}
              pointerEvents="none">
              <Text
                style={{
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: '500',
                  textAlign: 'center',
                  paddingHorizontal: 32,
                  textShadowColor: 'rgba(0,0,0,0.8)',
                  textShadowOffset: {width: 0, height: 1},
                  textShadowRadius: 4,
                }}>
                {hint || t('point_camera_at_qr')}
              </Text>
            </View>
          </View>
        ) : permissionStatus === 'denied' ? (
          // Permission denied fallback
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 40,
            }}>
            <Text
              style={{
                fontSize: 48,
                marginBottom: 24,
              }}>
              📷
            </Text>
            <Text
              style={{
                color: '#fff',
                fontSize: 17,
                fontWeight: '600',
                textAlign: 'center',
                marginBottom: 12,
              }}>
              {t('camera_permission_required')}
            </Text>
            <Text
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 22,
                marginBottom: 32,
              }}>
              {Platform.OS === 'ios'
                ? 'Go to Settings → Reef → Camera to enable access.'
                : 'Go to Settings → Apps → Reef → Permissions to enable Camera.'}
            </Text>
            <TouchableOpacity
              onPress={handleOpenSettings}
              activeOpacity={0.7}
              style={{
                backgroundColor: Colors.purple,
                borderRadius: 12,
                paddingVertical: 14,
                paddingHorizontal: 32,
              }}>
              <Text style={{color: '#fff', fontSize: 15, fontWeight: '600'}}>
                {t('open_settings')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Checking permissions
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Text style={{color: 'rgba(255,255,255,0.6)', fontSize: 14}}>
              {t('loading')}...
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
