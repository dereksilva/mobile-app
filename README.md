# Reef Mobile App

Mobile wallet for the [Reef blockchain](https://reef.io). Manage accounts, tokens, NFTs, perform swaps, and connect to dApps via WalletConnect.

## Project Structure

This repository contains two implementations:

| Directory | Framework | Status |
|-----------|-----------|--------|
| `reef-native/` | React Native + TypeScript | **Active development** |
| `lib/`, `android/`, `ios/` | Flutter + Dart | Legacy (reference only) |

---

## React Native App (`reef-native/`)

### Tech Stack

- **React Native 0.84.1** with TypeScript 5.8
- **Zustand** — lightweight state management (13 stores)
- **@polkadot/api** — native Reef/Substrate blockchain integration
- **@reef-chain/evm-provider** — EVM compatibility layer
- **@reown/walletkit** — WalletConnect v2 dApp connections
- **react-native-mmkv** — encrypted local storage
- **react-native-keychain** — biometric authentication (Face ID / fingerprint)
- **react-native-camera-kit** — QR code scanning
- **i18next** — internationalization (English, Hindi, Italian)
- **ethers.js 5.7** — EVM utilities
- **RxJS** — reactive transaction lifecycle

### Prerequisites

- Node.js >= 22.11.0 (recommended: v24 via `nvm`)
- React Native CLI environment ([setup guide](https://reactnative.dev/docs/set-up-your-environment))
- Xcode (for iOS builds)
- Android Studio (for Android builds)

### Getting Started

```bash
# Install dependencies
cd reef-native
npm install --legacy-peer-deps

# iOS: install CocoaPods
cd ios && bundle exec pod install && cd ..

# Start Metro bundler
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Project Layout

```
reef-native/src/
├── app/
│   └── Navigation.tsx          # Tab navigation, header with Reef branding
├── assets/images/              # App icons, intro GIF, logos
├── components/                 # Reusable UI (15 components)
│   ├── QRScannerModal.tsx      # Camera-based QR scanner (iOS + Android)
│   ├── SigningOverlay.tsx       # Transaction signing modal
│   ├── TokenSelectionModal.tsx  # Searchable token picker
│   ├── WalletConnectSessionModal.tsx
│   └── ...
├── hooks/                      # Custom hooks (accounts, app init, biometrics)
├── i18n/                       # Translations (en, hi, it)
├── reef-chain/                 # Blockchain integration (12 modules)
│   ├── accountApi.ts           # Account creation, import, EVM binding
│   ├── signingApi.ts           # Transaction signing
│   ├── transferApi.ts          # Token & NFT transfers
│   ├── swapApi.ts              # DEX swaps
│   ├── networkApi.ts           # RPC connection management
│   └── ...
├── screens/                    # App screens (22 screens)
│   ├── HomeScreen.tsx          # Token balances, NFT gallery
│   ├── SendScreen.tsx          # Token transfers with QR scan
│   ├── SendNFTScreen.tsx       # NFT transfers with QR scan
│   ├── SwapScreen.tsx          # Token swaps
│   ├── PoolsScreen.tsx         # Liquidity pools
│   ├── WalletConnectScreen.tsx # dApp connections with QR scan
│   ├── DAppBrowserScreen.tsx   # In-app dApp browser
│   ├── SettingsScreen.tsx      # App configuration
│   └── ...
├── services/                   # Business logic
│   ├── WalletConnectService.ts # WC v2 session management
│   ├── StorageService.ts       # Encrypted MMKV storage
│   ├── NotificationService.ts  # Local push notifications
│   └── TransactionDescService.ts
├── stores/                     # Zustand state stores (13 stores)
│   ├── useAccountStore.ts      # Accounts, selected address
│   ├── useTokenStore.ts        # Balances, ERC20s, NFTs
│   ├── useNetworkStore.ts      # Mainnet/testnet switching
│   ├── useSigningStore.ts      # Signing queue
│   ├── useWalletConnectStore.ts
│   └── ...
├── types/                      # TypeScript type definitions
└── utils/                      # Utilities (colors, helpers)
```

### Key Features

- **Account Management** — Create, import (mnemonic/JSON), rename, delete accounts
- **Token Dashboard** — View balances, search ERC20s, token icons
- **Send Tokens & NFTs** — Address validation (Substrate SS58 + EVM), transaction stepper
- **QR Code Scanning** — Scan WalletConnect URIs or wallet addresses via camera
- **Receive** — QR code display with address sharing
- **Token Swaps** — DEX integration with slippage settings
- **Liquidity Pools** — View and manage pool positions
- **WalletConnect v2** — Connect to dApps, sign transactions/messages
- **dApp Browser** — Built-in WebView browser for Reef dApps
- **Biometric Auth** — Face ID / fingerprint unlock
- **Network Switching** — Mainnet and testnet support
- **Internationalization** — English, Hindi, Italian
- **Buy Crypto** — Fiat on-ramp integration

### Testing & Validation

```bash
# Type checking
npx tsc --noEmit

# Lint
npm run lint

# Run tests
npm test
```

### Platform Configuration

**Android:**
- Min SDK: 24 (Android 7.0)
- Target SDK: 35
- Permissions: Camera, Biometric, Storage, Notifications

**iOS:**
- Min deployment target: defined in Podfile
- Permissions: Camera, Face ID, Photo Library

---

## Legacy Flutter App

> The Flutter codebase under `lib/`, `android/`, and `ios/` root directories is the original implementation, kept for reference during the migration.

```bash
# Flutter commands (legacy)
flutter pub get
flutter run
flutter test
flutter analyze

# JS bridge dependencies
cd lib/js && yarn install && yarn start

# MobX code generation
flutter pub run build_runner watch

# Localization
flutter gen-l10n
```

See `CLAUDE.md` for detailed Flutter architecture documentation.

---

Thank you for using Reef Chain Mobile App!
