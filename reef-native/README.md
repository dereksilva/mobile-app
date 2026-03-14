# Reef Native

React Native + TypeScript implementation of the Reef blockchain mobile wallet.

## Quick Start

```bash
# Install dependencies (Node >= 22.11.0 required)
npm install --legacy-peer-deps

# iOS only: install CocoaPods
cd ios && bundle exec pod install && cd ..

# Start Metro bundler
npm start

# Build & run
npm run ios       # iOS simulator
npm run android   # Android emulator
```

## Development

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Test
npm test
```

## Architecture

### State Management

Zustand stores in `src/stores/` — each store is a hook (e.g. `useAccountStore`, `useTokenStore`). No providers needed; import and call directly in components.

### Blockchain Integration

`src/reef-chain/` contains all Polkadot/Substrate and EVM interaction:
- Uses `@polkadot/api` for native chain operations (no WebView bridge)
- Uses `@reef-chain/evm-provider` for EVM compatibility
- RPC endpoint: `wss://rpc.reefscan.com/ws` (mainnet)

### Navigation

Bottom tab navigator with 5 tabs (Home, Swap, Pools, Accounts, Settings). Sub-screens use state-based inline routing within each tab — no deep stack navigation.

### Storage

- **react-native-mmkv**: Fast encrypted key-value storage for app data
- **react-native-keychain**: Biometric-protected credential storage

### WalletConnect

`@reown/walletkit` (WalletConnect v2) for dApp connections. Supports `reef_signTransaction` and `reef_signMessage` methods with Reef-specific chain IDs.

### Internationalization

i18next with translations in `src/i18n/`. Supported languages: English (`en`), Hindi (`hi`), Italian (`it`).

## Troubleshooting

- **Peer dependency conflicts**: Always use `npm install --legacy-peer-deps`
- **iOS pod issues**: Run `cd ios && bundle exec pod install --repo-update`
- **Metro cache**: `npm start -- --reset-cache`
- **Android build**: Ensure `JAVA_HOME` points to JDK 17+
