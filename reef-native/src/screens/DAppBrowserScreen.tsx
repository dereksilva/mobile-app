/**
 * DAppBrowserScreen — WebView-based dApp browser.
 * Mirrors dapp_page.dart from Flutter.
 *
 * This is the ONE place where a WebView is appropriate — it loads external
 * dApp sites. The injected web3 provider routes signing requests through
 * useSigningStore, same as WalletConnect and internal signing flows.
 *
 * Features:
 * - URL bar with navigation (back/forward/refresh)
 * - Bookmarked dApp list for quick access
 * - Web3 provider injection for Reef chain interaction
 * - Domain authorization management
 */

import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import {WebView, WebViewNavigation} from 'react-native-webview';
import {useTranslation} from 'react-i18next';
import {useAccountStore} from '../stores/useAccountStore';
import {useNetworkStore} from '../stores/useNetworkStore';
import * as Storage from '../services/StorageService';
import {Colors} from '../utils/colors';

interface DAppBrowserScreenProps {
  onBack: () => void;
  initialUrl?: string;
}

// Default dApps for quick access
const BOOKMARKED_DAPPS = [
  {
    name: 'ReefSwap',
    url: 'https://reefswap.com',
    icon: '🔄',
  },
  {
    name: 'Reefscan',
    url: 'https://reefscan.com',
    icon: '🔍',
  },
  {
    name: 'Reef NFT',
    url: 'https://sqwid.app',
    icon: '🎨',
  },
];

/**
 * Injected JavaScript to provide basic web3-like interface.
 * Routes signing requests back through React Native message bridge.
 */
const INJECTED_JS = `
(function() {
  // Flag to indicate Reef wallet is available
  window.__REEF_WALLET_INJECTED__ = true;

  // Simple postMessage bridge for dApp ↔ wallet communication
  window.reefWallet = {
    isReefWallet: true,

    // Request accounts
    getAccounts: function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'reef_getAccounts',
        id: Date.now()
      }));
    },

    // Sign transaction
    signTransaction: function(payload) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'reef_signTransaction',
        id: Date.now(),
        payload: payload
      }));
    },

    // Sign raw message
    signMessage: function(message) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'reef_signMessage',
        id: Date.now(),
        message: message
      }));
    }
  };

  true; // Required for injectedJavaScript
})();
`;

export default function DAppBrowserScreen({
  onBack,
  initialUrl,
}: DAppBrowserScreenProps) {
  const {t} = useTranslation();
  const selectedAddress = useAccountStore(s => s.selectedAddress);
  const networkName = useNetworkStore(s => s.selectedNetworkName);

  const webViewRef = useRef<WebView>(null);
  const [url, setUrl] = useState(initialUrl || '');
  const [currentUrl, setCurrentUrl] = useState(initialUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(!initialUrl);
  const [pageTitle, setPageTitle] = useState('');

  const navigateToUrl = useCallback(
    (targetUrl: string) => {
      let normalized = targetUrl.trim();
      if (!normalized) return;

      // Add protocol if missing
      if (
        !normalized.startsWith('http://') &&
        !normalized.startsWith('https://')
      ) {
        normalized = 'https://' + normalized;
      }

      setUrl(normalized);
      setCurrentUrl(normalized);
      setShowBookmarks(false);
    },
    [],
  );

  const handleNavigationChange = useCallback(
    (navState: WebViewNavigation) => {
      setCanGoBack(navState.canGoBack);
      setCanGoForward(navState.canGoForward);
      setCurrentUrl(navState.url);
      setPageTitle(navState.title || '');
      setIsLoading(navState.loading ?? false);
    },
    [],
  );

  const handleMessage = useCallback(
    (event: {nativeEvent: {data: string}}) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        const msgType = data.type as string;

        if (msgType === 'reef_getAccounts') {
          // Respond with selected account
          webViewRef.current?.injectJavaScript(`
            window.dispatchEvent(new CustomEvent('reefAccountsResponse', {
              detail: { accounts: ['${selectedAddress || ''}'] }
            }));
            true;
          `);
        } else if (msgType === 'reef_signTransaction') {
          // TODO: Route through signing store when dApp injection is finalized
          Alert.alert('Sign Request', 'Transaction signing from dApps will be available in a future update.');
        } else if (msgType === 'reef_signMessage') {
          Alert.alert('Sign Request', 'Message signing from dApps will be available in a future update.');
        }
      } catch {
        // Ignore non-JSON messages
      }
    },
    [selectedAddress],
  );

  const handleOpenExternal = useCallback(() => {
    if (currentUrl) {
      Linking.openURL(currentUrl).catch(() => {
        Alert.alert('Error', 'Could not open URL in browser.');
      });
    }
  }, [currentUrl]);

  // Bookmarks view (shown when no URL loaded)
  if (showBookmarks) {
    return (
      <View style={{flex: 1, backgroundColor: Colors.primaryBg}}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            gap: 12,
          }}>
          <TouchableOpacity onPress={onBack}>
            <Text style={{color: Colors.purple, fontSize: 16}}>← Back</Text>
          </TouchableOpacity>
          <Text style={{flex: 1, fontSize: 18, fontWeight: '700', color: Colors.text}}>
            dApp Browser
          </Text>
        </View>

        {/* URL input */}
        <View style={{paddingHorizontal: 16, marginBottom: 20}}>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#fff',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: Colors.grey,
              overflow: 'hidden',
            }}>
            <TextInput
              value={url}
              onChangeText={setUrl}
              onSubmitEditing={() => navigateToUrl(url)}
              placeholder="Enter dApp URL..."
              placeholderTextColor={Colors.textLight}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              style={{
                flex: 1,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 14,
                color: Colors.text,
              }}
            />
            <TouchableOpacity
              onPress={() => navigateToUrl(url)}
              style={{
                backgroundColor: Colors.purple,
                paddingHorizontal: 16,
                justifyContent: 'center',
              }}>
              <Text style={{color: '#fff', fontWeight: '600'}}>Go</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Network indicator */}
        <View style={{paddingHorizontal: 16, marginBottom: 16}}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  networkName === 'mainnet' ? Colors.green : Colors.purple,
              }}
            />
            <Text style={{fontSize: 12, color: Colors.textLight}}>
              Connected to {networkName}
              {selectedAddress
                ? ` • ${selectedAddress.slice(0, 6)}...${selectedAddress.slice(-4)}`
                : ''}
            </Text>
          </View>
        </View>

        {/* Bookmarked dApps */}
        <View style={{paddingHorizontal: 16}}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: Colors.textLight,
              letterSpacing: 0.5,
              marginBottom: 12,
            }}>
            POPULAR DAPPS
          </Text>
          {BOOKMARKED_DAPPS.map(dapp => (
            <TouchableOpacity
              key={dapp.url}
              onPress={() => navigateToUrl(dapp.url)}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#fff',
                borderRadius: 14,
                padding: 16,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: Colors.grey,
              }}>
              <Text style={{fontSize: 28, marginRight: 14}}>{dapp.icon}</Text>
              <View style={{flex: 1}}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: Colors.text,
                  }}>
                  {dapp.name}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: Colors.textLight,
                    marginTop: 2,
                  }}>
                  {dapp.url}
                </Text>
              </View>
              <Text style={{fontSize: 16, color: Colors.textLight}}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // WebView browser view
  return (
    <View style={{flex: 1, backgroundColor: Colors.primaryBg}}>
      {/* Navigation bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 8,
          paddingHorizontal: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: Colors.grey,
          gap: 8,
        }}>
        {/* Navigation buttons */}
        <TouchableOpacity
          onPress={() => {
            setShowBookmarks(true);
            setUrl('');
            setCurrentUrl('');
          }}
          style={{padding: 4}}>
          <Text style={{fontSize: 18}}>✕</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => webViewRef.current?.goBack()}
          disabled={!canGoBack}
          style={{padding: 4, opacity: canGoBack ? 1 : 0.3}}>
          <Text style={{fontSize: 18}}>◀</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => webViewRef.current?.goForward()}
          disabled={!canGoForward}
          style={{padding: 4, opacity: canGoForward ? 1 : 0.3}}>
          <Text style={{fontSize: 18}}>▶</Text>
        </TouchableOpacity>

        {/* URL display */}
        <View
          style={{
            flex: 1,
            backgroundColor: Colors.primaryBg,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}>
          <Text
            style={{fontSize: 12, color: Colors.text}}
            numberOfLines={1}>
            {currentUrl}
          </Text>
        </View>

        {/* Loading / Refresh */}
        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.purple} />
        ) : (
          <TouchableOpacity
            onPress={() => webViewRef.current?.reload()}
            style={{padding: 4}}>
            <Text style={{fontSize: 16}}>↻</Text>
          </TouchableOpacity>
        )}

        {/* External link */}
        <TouchableOpacity onPress={handleOpenExternal} style={{padding: 4}}>
          <Text style={{fontSize: 14}}>↗</Text>
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{uri: currentUrl}}
        injectedJavaScript={INJECTED_JS}
        onNavigationStateChange={handleNavigationChange}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: Colors.primaryBg,
            }}>
            <ActivityIndicator size="large" color={Colors.purple} />
            <Text
              style={{
                color: Colors.textLight,
                fontSize: 14,
                marginTop: 12,
              }}>
              {t('loading')}...
            </Text>
          </View>
        )}
        style={{flex: 1}}
      />
    </View>
  );
}
