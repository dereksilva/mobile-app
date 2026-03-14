import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useTranslation} from 'react-i18next';

import HomeScreen from '../screens/HomeScreen';
import AccountsScreen from '../screens/AccountsScreen';
import SwapScreen from '../screens/SwapScreen';
import PoolsScreen from '../screens/PoolsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import {Colors} from '../utils/colors';

const Tab = createBottomTabNavigator();

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
          options={{title: t('home')}}
        />
        <Tab.Screen
          name="Accounts"
          component={AccountsScreen}
          options={{title: t('accounts')}}
        />
        <Tab.Screen
          name="Swap"
          component={SwapScreen}
          options={{title: t('swap_tokens')}}
        />
        <Tab.Screen
          name="Pools"
          component={PoolsScreen}
          options={{title: t('pools')}}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{title: t('settings')}}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
