const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {withNativeWind} = require('nativewind/metro');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    blockList: [
      // Reanimated v4 references jestUtils.ts which doesn't exist as a file
      /react-native-reanimated\/src\/jestUtils\.ts$/,
    ],
    extraNodeModules: {
      // Polyfill Node.js crypto for WalletConnect
      crypto: require.resolve('react-native-quick-crypto'),
    },
    // Prefer CJS builds to avoid import.meta issues in @polkadot packages
    unstable_conditionNames: ['require', 'react-native', 'browser'],
  },
};

module.exports = withNativeWind(
  mergeConfig(getDefaultConfig(__dirname), config),
  {input: './global.css'},
);
