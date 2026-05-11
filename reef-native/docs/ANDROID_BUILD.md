# Building & Releasing the Android App

End-to-end instructions for producing a signed Android App Bundle (`.aab`) and
uploading it to the Google Play Store. Written for macOS, but most steps apply
to Linux as well.

If this is your first time setting up, start at **Step 1** and go through in
order. If you've done it before and just need to rebuild, jump to
**[Building the AAB](#4-build-the-release-bundle)**.

---

## Prerequisites

- macOS (tested on macOS 26)
- [Homebrew](https://brew.sh)
- Node.js and `npm` (already required for the React Native project)
- A Google Play Console account with your app registered

---

## 1. Install the Java Runtime (JDK)

`keytool` and Gradle both require a JDK. **JDK 17 is the recommended version**
for recent React Native + AGP versions.

### Option A — Install via Homebrew

```bash
brew install openjdk@17
```

Then symlink it so macOS's default `java` command finds it:

```bash
sudo ln -sfn $(brew --prefix openjdk@17)/libexec/openjdk.jdk \
  /Library/Java/JavaVirtualMachines/openjdk-17.jdk
```

### Option B — Use the JDK bundled with Android Studio

If you're installing Android Studio (Step 2) anyway, it bundles its own JDK.
Add these to `~/.zshrc`:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
```

Reload:
```bash
source ~/.zshrc
```

### Verify

```bash
java -version
keytool -help
```

Both should print version info without errors.

---

## 2. Install Android Studio & the Android SDK

Gradle needs the Android SDK, NDK, and build tools. The easiest way to get
them is via Android Studio.

### Install Android Studio

```bash
brew install --cask android-studio
```

### First-time setup

1. Launch **Android Studio** from `/Applications`.
2. On first launch, walk through the **Setup Wizard** — accept the defaults.
   It will download the Android SDK (several GB, can take 10+ minutes).
3. When complete, the SDK will be at `~/Library/Android/sdk`.
4. Close Android Studio — you don't need it open for the build.

### Install the specific NDK version

React Native's Gradle plugin pins a specific NDK version. If you skip this,
the build will fail with:
```
Failed to install the following SDK components:
    ndk;27.1.12297006 NDK (Side by side) 27.1.12297006
```

To install it:

1. Open **Android Studio**
2. Menu: **Android Studio → Settings** (or press `⌘,`)
3. In the sidebar: **Languages & Frameworks → Android SDK**
4. Click the **SDK Tools** tab
5. Check **"Show Package Details"** in the bottom-right
6. Find **"NDK (Side by side)"**, expand it, and check **27.1.12297006**
   (or whatever version your error message mentions)
7. While here, also check:
   - **Android SDK Build-Tools** (latest)
   - **Android SDK Command-line Tools (latest)** (useful for future scripting)
   - **CMake** (latest)
8. Click **Apply** — downloads take a few minutes
9. Close the Settings dialog and quit Android Studio

---

## 3. Configure the Project

### 3a. Set environment variables

Add to `~/.zshrc`:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"
```

Reload:
```bash
source ~/.zshrc
```

### 3b. Create `local.properties`

Tells Gradle where the SDK lives. This file is machine-specific and
**must not be committed** (it's already gitignored):

```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > \
  /Users/derek/GitHub/mobile-app/reef-native/android/local.properties
```

### 3c. Generate the upload keystore

This signs your release builds. **Do this once, then back up the resulting
file and password forever.** If you lose either, you can never push updates
to the same Play Store listing.

```bash
cd /Users/derek/GitHub/mobile-app/reef-native/android/app

keytool -genkeypair -v -storetype PKCS12 \
  -keystore reef-upload-key.keystore \
  -alias reef-key \
  -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted for:
- **Keystore password** — generate a strong one and save it to a password manager
- Identity fields (name, org, city, etc.) — fill in accurately; they're baked into the cert
- **Key password** — press **Enter** to use the same as the keystore password

**⚠️ Back up immediately:**
- Copy `reef-upload-key.keystore` to a password manager / encrypted cloud storage
- Save the password alongside it
- **Without these two, you cannot publish app updates.**

The keystore file is gitignored (`*.keystore` in `.gitignore`), so it won't
be accidentally committed.

### 3d. Create `keystore.properties`

Tells Gradle how to find and open the keystore. Also **gitignored** — never
commit this file:

```bash
cat > /Users/derek/GitHub/mobile-app/reef-native/android/keystore.properties <<'EOF'
REEF_UPLOAD_STORE_FILE=reef-upload-key.keystore
REEF_UPLOAD_KEY_ALIAS=reef-key
REEF_UPLOAD_STORE_PASSWORD=your-password-here
REEF_UPLOAD_KEY_PASSWORD=your-password-here
EOF
```

Replace `your-password-here` with the keystore password you chose in 3c.

The project's `android/app/build.gradle` is already configured to read this
file at build time. An entry for `android/keystore.properties` exists in
`.gitignore`; verify before committing:

```bash
git check-ignore reef-native/android/keystore.properties
# Should echo: reef-native/android/keystore.properties
```

---

## 4. Build the Release Bundle

```bash
cd /Users/derek/GitHub/mobile-app/reef-native/android
./gradlew bundleRelease
```

First build takes **5–15 minutes** (downloads Gradle deps, NDK native code,
compiles everything). Subsequent builds are much faster thanks to caching.

On success, your Android App Bundle will be at:

```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## 5. Upload to Google Play

1. Go to [play.google.com/console](https://play.google.com/console)
2. Select your app (or create a new one if this is the first release)
3. **Production → Create new release**
4. Upload `app-release.aab`
5. Fill in the release name (e.g. `1.2.0`) and release notes
6. **Review** and **Roll out**

For internal/closed testing before full release, use the **Internal testing**
or **Closed testing** tracks instead of Production.

---

## Troubleshooting

### `SDK location not found`

The SDK hasn't been installed, or `local.properties` points to a path that
doesn't exist. Verify:

```bash
ls ~/Library/Android/sdk   # should list platforms/, ndk/, etc.
cat android/local.properties   # should point to that path
```

If the SDK directory doesn't exist, go back to **Step 2** and run the
Android Studio Setup Wizard.

### `Failed to install the following SDK components: ndk;X.Y.Z`

The required NDK version isn't installed. Follow the steps in
**[2. Install the specific NDK version](#install-the-specific-ndk-version)**
with the exact version from the error message.

### `Cannot lock execution history cache`

A previous Gradle run left a stale lock, or Android Studio is holding the
project open. Run this full reset:

```bash
cd /Users/derek/GitHub/mobile-app/reef-native/android

# Stop Gradle daemons
./gradlew --stop 2>/dev/null

# Kill any stray Java processes
killall -9 java 2>/dev/null
killall -9 gradle 2>/dev/null

# Quit Android Studio if open
osascript -e 'quit app "Android Studio"' 2>/dev/null

# Nuke all Gradle caches
rm -rf .gradle
rm -rf ~/.gradle/caches
rm -rf ~/.gradle/daemon
rm -rf ../node_modules/@react-native/gradle-plugin/.gradle

# Clean build outputs
rm -rf app/build build

# Verify disk space (builds need several GB)
df -h /
```

Then rebuild with `--no-daemon` to avoid any background worker state:

```bash
./gradlew bundleRelease --no-daemon
```

### `Keystore file 'reef-upload-key.keystore' not found`

The keystore hasn't been generated yet. Return to **[3c. Generate the upload
keystore](#3c-generate-the-upload-keystore)**.

### `missing Java runtime` when running `keytool`

The JDK isn't installed or not on your PATH. Return to **[1. Install the
Java Runtime](#1-install-the-java-runtime-jdk)**.

### `Deprecated Gradle features were used in this build`

Not an error — just an informational warning about the React Native Gradle
plugin using APIs that will be removed in a future Gradle version. Ignore it.

### Build fails with cryptic `npm` or `react-native` peer-dependency warnings

These warnings during `npm install` (e.g., polkadot/eslint version mismatches)
are harmless for the final app binary. You can suppress them by running:

```bash
npm install --legacy-peer-deps
```

They do **not** affect the built `.aab`.

### `npm audit fix` — should I run it?

**No.** Most audit findings are in dev dependencies / build tooling and
don't ship in the app binary. Auto-fixing can break native modules. Ship
as-is, then review individual high/critical findings manually after release.

---

## Incrementing the Version for Subsequent Releases

Before each new release, bump the version in
`android/app/build.gradle`:

```gradle
defaultConfig {
    applicationId "com.reefnative"
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 3           // ← increment by 1 for every Play Store upload
    versionName "1.3.0"     // ← update to match iOS/marketing version
}
```

Rules:
- `versionCode` — integer, must be **strictly greater** than the previous
  uploaded value. Google Play rejects duplicates.
- `versionName` — human-readable string, can be anything (e.g., `1.3.0`,
  `1.3.0-beta.1`). Best to keep in sync with iOS.

Then rebuild (Step 4) and upload (Step 5).

---

## Security Reminders

- **Never commit** `keystore.properties`, `reef-upload-key.keystore`, or
  `local.properties`. All three are already in `.gitignore` — verify with
  `git check-ignore <path>` before you worry.
- **Back up** the keystore file and password immediately after generation.
  Losing them permanently breaks your ability to update the Play Store
  listing.
- If a keystore password is ever accidentally exposed (e.g., pasted into
  chat, logged, or committed), rotate it:

  ```bash
  keytool -storepasswd -keystore reef-upload-key.keystore
  keytool -keypasswd -keystore reef-upload-key.keystore -alias reef-key
  ```

  Then update `keystore.properties` with the new password.

---

## Quick Reference

| Action | Command |
|---|---|
| Install JDK | `brew install openjdk@17` |
| Install Android Studio | `brew install --cask android-studio` |
| Generate keystore | `cd android/app && keytool -genkeypair ...` (Step 3c) |
| Build release AAB | `cd android && ./gradlew bundleRelease` |
| AAB output location | `android/app/build/outputs/bundle/release/app-release.aab` |
| Kill stuck Gradle | `./gradlew --stop && killall -9 java` |
| Stop Android Studio | `osascript -e 'quit app "Android Studio"'` |
