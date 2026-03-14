/**
 * Biometric authentication hook.
 * Uses react-native-keychain's biometric support.
 */

import {useState, useCallback, useRef} from 'react';
import * as Keychain from 'react-native-keychain';

const MAX_BIO_ATTEMPTS = 3;

interface UseBiometricsReturn {
  isAvailable: boolean;
  isLockedOut: boolean;
  checkAvailability: () => Promise<boolean>;
  authenticate: () => Promise<boolean>;
}

export function useBiometrics(): UseBiometricsReturn {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const attempts = useRef(0);

  const checkAvailability = useCallback(async (): Promise<boolean> => {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      const available = biometryType !== null;
      setIsAvailable(available);
      return available;
    } catch {
      setIsAvailable(false);
      return false;
    }
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (isLockedOut) return false;

    try {
      // We use Keychain's biometric-protected access.
      // Store a sentinel value that requires biometric to read.
      const SERVICE = 'reef_biometric_sentinel';

      // Try to read the sentinel — this triggers biometric prompt
      const result = await Keychain.getGenericPassword({
        service: SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        authenticationPrompt: {
          title: 'Authenticate to unlock Reef',
        },
      });

      if (result) {
        attempts.current = 0;
        setIsLockedOut(false);
        return true;
      }

      // If no sentinel exists yet, create one and try again
      await Keychain.setGenericPassword('reef', 'biometric_ok', {
        service: SERVICE,
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      });

      // Try reading it again with biometric prompt
      const retryResult = await Keychain.getGenericPassword({
        service: SERVICE,
        authenticationPrompt: {
          title: 'Authenticate to unlock Reef',
        },
      });

      if (retryResult) {
        attempts.current = 0;
        setIsLockedOut(false);
        return true;
      }

      // Biometric failed
      attempts.current += 1;
      if (attempts.current >= MAX_BIO_ATTEMPTS) {
        setIsLockedOut(true);
        setIsAvailable(false);
      }
      return false;
    } catch {
      attempts.current += 1;
      if (attempts.current >= MAX_BIO_ATTEMPTS) {
        setIsLockedOut(true);
        setIsAvailable(false);
      }
      return false;
    }
  }, [isLockedOut]);

  return {isAvailable, isLockedOut, checkAvailability, authenticate};
}
