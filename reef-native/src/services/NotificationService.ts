/**
 * NotificationService — local push notifications.
 * Mirrors LocalNotificationService.dart from Flutter.
 *
 * Used to notify users of WalletConnect signing requests when
 * the app is backgrounded.
 *
 * Note: This uses a simplified approach with React Native's built-in
 * alert system and AppState for foreground detection. For production,
 * integrate @notifee/react-native or react-native-push-notification
 * for proper system-level notifications.
 */

import {AppState, Platform, Alert} from 'react-native';

let isInitialized = false;
let appState = AppState.currentState;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

/**
 * Initialize the notification service.
 * Sets up AppState listener for foreground detection.
 */
export function initNotifications(): void {
  if (isInitialized) return;

  appStateSubscription = AppState.addEventListener('change', nextState => {
    appState = nextState;
  });

  isInitialized = true;
}

/**
 * Clean up the notification service listener.
 */
export function cleanupNotifications(): void {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  isInitialized = false;
}

/**
 * Check if the app is currently in the foreground.
 */
export function isAppInForeground(): boolean {
  return appState === 'active';
}

/**
 * Show a notification.
 * If app is in foreground: shows an Alert dialog.
 * If app is in background: would trigger a system notification.
 *
 * Note: For system-level notifications when backgrounded, integrate
 * @notifee/react-native. This implementation handles the foreground case.
 */
export function showNotification(title: string, body: string): void {
  if (isAppInForeground()) {
    // In-app alert for foreground
    Alert.alert(title, body);
  } else {
    // Background notifications require native module integration
    // TODO: Integrate @notifee/react-native for background notifications
    console.log(`[Notification] ${title}: ${body}`);
  }
}

/**
 * Show a WalletConnect signing request notification.
 * Called from WalletConnectService when a session request arrives.
 */
export function showWCRequestNotification(): void {
  showNotification(
    'WalletConnect Request',
    'Approve the transaction using WalletConnect',
  );
}
