import './global.css';
import './src/i18n';

import React from 'react';
import {StatusBar} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import Navigation from './src/app/Navigation';
import {Colors} from './src/utils/colors';

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={Colors.primaryBg}
        />
        <Navigation />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
