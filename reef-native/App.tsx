import './global.css';
import './src/i18n';

import React, {useState} from 'react';
import {StatusBar} from 'react-native';
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
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={Colors.primaryBg}
        />
        {renderContent()}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
