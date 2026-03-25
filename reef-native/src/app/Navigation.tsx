import React from 'react';
import {View, Image, Text} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {useTranslation} from 'react-i18next';
import Svg, {Path} from 'react-native-svg';

import HomeScreen from '../screens/HomeScreen';
import AccountsScreen from '../screens/AccountsScreen';
import StakingScreen from '../screens/StakingScreen';
import PoolsScreen from '../screens/PoolsScreen';
import SwapScreen from '../screens/SwapScreen';
import SettingsScreen from '../screens/SettingsScreen';
import {Colors, useColors} from '../utils/colors';
import {useThemeStore} from '../stores/useThemeStore';
import {useNetworkStore} from '../stores/useNetworkStore';
import {NetworkName} from '../types';
import {useChainData} from '../hooks/useChainData';

/** Simple SVG icon component using paths from Heroicons (MIT) */
function TabIcon({d, color, size = 22}: {d: string; color: string; size?: number}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Heroicons outline paths (24×24 viewBox)
const ICON_PATHS = {
  home: 'M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  accounts: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  staking: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  pools: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5',
  settings: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const reefLogo = require('../assets/images/reef.png');

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

function ReefHeaderTitle() {
  const networkName = useNetworkStore(s => s.selectedNetworkName);
  const isTestnet = networkName === NetworkName.TESTNET;
  const colors = useColors();
  const theme = useThemeStore(s => s.theme);
  const isLightMode = theme === 'light';

  return (
    <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
      <Image
        source={reefLogo}
        style={{width: isLightMode ? 32 : 28, height: isLightMode ? 32 : 28}}
        resizeMode="contain"
      />
      <Text style={{
        fontSize: isLightMode ? 24 : 18,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: isLightMode ? -0.6 : 0,
      }}>
        Reef
      </Text>
      {isTestnet && (
        <View
          style={{
            backgroundColor: colors.purple + '20',
            borderRadius: 6,
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: colors.purple,
              letterSpacing: 0.5,
            }}>
            TESTNET
          </Text>
        </View>
      )}
    </View>
  );
}

function TabNavigator() {
  const {t} = useTranslation();
  const theme = useThemeStore(s => s.theme);
  const isLightMode = theme === 'light';

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: isLightMode ? '#4e00cd' : Colors.accent,
        tabBarInactiveTintColor: isLightMode ? 'rgba(44, 2, 77, 0.4)' : Colors.textLight,
        tabBarStyle: {
          backgroundColor: isLightMode ? 'rgba(255, 247, 254, 0.8)' : Colors.nav,
          borderTopWidth: isLightMode ? 1 : 1,
          borderTopColor: isLightMode ? 'rgba(78, 0, 205, 0.1)' : Colors.grey,
          borderTopLeftRadius: isLightMode ? 32 : 0,
          borderTopRightRadius: isLightMode ? 32 : 0,
          elevation: 0,
          shadowColor: isLightMode ? '#4e00cd' : undefined,
          shadowOffset: isLightMode ? {width: 0, height: -10} : undefined,
          shadowOpacity: isLightMode ? 0.05 : 0,
          shadowRadius: isLightMode ? 30 : 0,
          paddingTop: isLightMode ? 12 : 6,
          paddingBottom: isLightMode ? 4 : 2,
        },
        tabBarLabelStyle: isLightMode ? {
          fontSize: 11,
          fontWeight: '500',
          letterSpacing: 0.275,
          textTransform: 'uppercase',
        } : undefined,
        headerStyle: {
          backgroundColor: isLightMode ? 'rgba(255, 247, 254, 0.7)' : Colors.primaryBg,
          elevation: 0,
          shadowColor: isLightMode ? '#4e00cd' : undefined,
          shadowOffset: isLightMode ? {width: 0, height: 20} : undefined,
          shadowOpacity: isLightMode ? 0.08 : 0,
          shadowRadius: isLightMode ? 40 : 0,
        },
        headerTitleStyle: {
          color: Colors.text,
          fontWeight: '700',
          fontSize: 18,
        },
        headerTitleAlign: 'left',
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitle: () => <ReefHeaderTitle />,
          tabBarIcon: ({color}) => (
            <TabIcon d={ICON_PATHS.home} color={color} />
          ),
          tabBarLabel: t('home'),
        }}
      />
      <Tab.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{
          title: t('accounts'),
          headerShown: !isLightMode,
          tabBarIcon: ({color}) => (
            <TabIcon d={ICON_PATHS.accounts} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Staking"
        component={StakingScreen}
        options={{
          title: 'Staking',
          headerShown: !isLightMode,
          tabBarIcon: ({color}) => (
            <TabIcon d={ICON_PATHS.staking} color={color} />
          ),
          tabBarLabel: 'Stake',
        }}
      />
      <Tab.Screen
        name="Pools"
        component={PoolsScreen}
        options={{
          title: t('pools'),
          headerShown: !isLightMode,
          tabBarIcon: ({color}) => (
            <TabIcon d={ICON_PATHS.pools} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('settings'),
          headerShown: !isLightMode,
          tabBarIcon: ({color}) => (
            <TabIcon d={ICON_PATHS.settings} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  // Subscribe to theme changes so the entire navigation tree re-renders
  const _theme = useThemeStore(s => s.theme);

  // Subscribe to @reef-chain/util-lib observable streams.
  // Populates token, NFT, tx history, and account balance stores.
  useChainData();

  return (
    <NavigationContainer>
      <RootStack.Navigator>
        <RootStack.Screen
          name="Tabs"
          component={TabNavigator}
          options={{headerShown: false}}
        />
        <RootStack.Screen
          name="Swap"
          component={SwapScreen}
          options={{
            title: 'Swap Tokens',
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: Colors.primaryBg,
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTintColor: Colors.purple,
            headerTitleStyle: {
              color: Colors.text,
              fontWeight: '700',
            },
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
