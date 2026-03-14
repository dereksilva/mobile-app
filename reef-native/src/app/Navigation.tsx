import React from 'react';
import {View, Image, Text} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useTranslation} from 'react-i18next';

import HomeScreen from '../screens/HomeScreen';
import AccountsScreen from '../screens/AccountsScreen';
import SwapScreen from '../screens/SwapScreen';
import PoolsScreen from '../screens/PoolsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import {Colors} from '../utils/colors';
import {useNetworkStore} from '../stores/useNetworkStore';
import {NetworkName} from '../types';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const reefLogo = require('../assets/images/reef.png');

const Tab = createBottomTabNavigator();

function ReefHeaderTitle() {
  const networkName = useNetworkStore(s => s.selectedNetworkName);
  const isTestnet = networkName === NetworkName.TESTNET;

  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
      <Image
        source={reefLogo}
        style={{width: 28, height: 28}}
        resizeMode="contain"
      />
      <Text style={{fontSize: 18, fontWeight: '700', color: Colors.text}}>
        Reef
      </Text>
      {isTestnet && (
        <View
          style={{
            backgroundColor: Colors.purple + '20',
            borderRadius: 6,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: Colors.purple,
              letterSpacing: 0.5,
            }}>
            TESTNET
          </Text>
        </View>
      )}
    </View>
  );
}

export default function Navigation() {
  const {t} = useTranslation();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: Colors.purple,
          tabBarInactiveTintColor: Colors.textLight,
          tabBarStyle: {
            backgroundColor: Colors.nav,
            borderTopWidth: 0,
            elevation: 0,
            paddingTop: 4,
          },
          headerStyle: {
            backgroundColor: Colors.primaryBg,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTitleStyle: {
            color: Colors.text,
            fontWeight: '700',
          },
        }}>
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerTitle: () => <ReefHeaderTitle />,
            tabBarIcon: ({color}) => (
              <Text style={{fontSize: 20, color}}>🏠</Text>
            ),
            tabBarLabel: t('home'),
          }}
        />
        <Tab.Screen
          name="Accounts"
          component={AccountsScreen}
          options={{
            title: t('accounts'),
            tabBarIcon: ({color}) => (
              <Text style={{fontSize: 20, color}}>👤</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Swap"
          component={SwapScreen}
          options={{
            title: t('swap_tokens'),
            tabBarIcon: ({color}) => (
              <Text style={{fontSize: 20, color}}>🔄</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Pools"
          component={PoolsScreen}
          options={{
            title: t('pools'),
            tabBarIcon: ({color}) => (
              <Text style={{fontSize: 20, color}}>💧</Text>
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: t('settings'),
            tabBarIcon: ({color}) => (
              <Text style={{fontSize: 20, color}}>⚙️</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
