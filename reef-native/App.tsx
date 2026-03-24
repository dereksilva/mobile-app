import './global.css';
import './src/i18n';

import React, {Component, useState} from 'react';
import {DevSettings, StatusBar, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {InitState} from './src/types';
import {useAppInit} from './src/hooks/useAppInit';
import {Colors} from './src/utils/colors';

import SplashScreen from './src/screens/SplashScreen';
import AuthScreen from './src/screens/AuthScreen';
import IntroScreen from './src/screens/IntroScreen';
import CreatePasswordScreen from './src/screens/CreatePasswordScreen';
import Navigation from './src/app/Navigation';
import SigningOverlay from './src/components/SigningOverlay';
import WalletConnectSessionModal from './src/components/WalletConnectSessionModal';

// ---------------------------------------------------------------------------
// ErrorBoundary — catches JS errors in the component tree to prevent white-
// screen crashes. Shows a minimal recovery UI with a reload button.
// ---------------------------------------------------------------------------
interface EBState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{children: React.ReactNode}, EBState> {
  state: EBState = {hasError: false, error: null};

  static getDerivedStateFromError(error: Error): EBState {
    return {hasError: true, error};
  }

  handleReload = () => {
    if (__DEV__ && DevSettings?.reload) {
      DevSettings.reload();
    } else {
      // In production the best we can do is reset the boundary and hope the
      // app can recover. A full restart requires native-level handling.
      this.setState({hasError: false, error: null});
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.container}>
          <Text style={ebStyles.title}>Something went wrong</Text>
          <Text style={ebStyles.message}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity style={ebStyles.button} onPress={this.handleReload}>
            <Text style={ebStyles.buttonText}>Reload App</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const ebStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  button: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function App() {
  const {
    initState,
    error,
    isFirstLaunch,
    retry,
    markFirstLaunchDone,
    markAuthenticated,
  } = useAppInit();

  const [introComplete, setIntroComplete] = useState(false);
  const [passwordCreated, setPasswordCreated] = useState(false);

  const renderContent = () => {
    // 1. Loading or error
    if (
      initState === InitState.NOT_STARTED ||
      initState === InitState.LOADING
    ) {
      return <SplashScreen />;
    }

    if (initState === InitState.ERROR) {
      return <SplashScreen error={error} onRetry={retry} />;
    }

    // 2. First launch flow: intro → create password → main app
    if (initState === InitState.FIRST_LAUNCH || isFirstLaunch) {
      if (!introComplete) {
        return (
          <IntroScreen
            onDone={() => {
              markFirstLaunchDone();
              setIntroComplete(true);
            }}
          />
        );
      }

      if (!passwordCreated) {
        return (
          <CreatePasswordScreen
            onPasswordCreated={() => {
              setPasswordCreated(true);
              markAuthenticated();
            }}
          />
        );
      }
    }

    // 3. Returning user needs auth
    if (initState === InitState.AUTH_REQUIRED) {
      return <AuthScreen onAuthenticated={markAuthenticated} />;
    }

    // 4. Ready — show main app
    return <Navigation />;
  };

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{flex: 1}}>
        <SafeAreaProvider>
          <StatusBar
            barStyle="dark-content"
            backgroundColor={Colors.primaryBg}
          />
          <SigningOverlay>
            {renderContent()}
          </SigningOverlay>
          <WalletConnectSessionModal />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
