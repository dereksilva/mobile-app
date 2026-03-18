module.exports = {
  presets: ['module:@react-native/babel-preset', 'nativewind/babel'],
  plugins: [
    '@babel/plugin-transform-class-static-block',
    'babel-plugin-transform-import-meta',
    'react-native-reanimated/plugin', // must be listed last
  ],
};
