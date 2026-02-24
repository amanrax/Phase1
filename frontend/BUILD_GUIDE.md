# 📱 Mobile App Build & Signing Guide

## Version: 2.0.0 (Phase-2)

This guide covers building and signing the CEM Farmer mobile application for both Android and iOS platforms.

---

## 🤖 Android APK Build

### Prerequisites
- Node.js 16+ and npm
- JDK 11 or higher
- Android SDK (via Android Studio)
- Gradle

### Quick Build Commands

```bash
cd frontend

# Debug build (for testing)
npm run build:android:debug
# or
./scripts/build-android.sh debug

# Release build (requires signing)
npm run build:android:release
# or
./scripts/build-android.sh release
```

### Output Location
```
frontend/build-output/CEM-Farmer-v2.0.0-debug.apk
frontend/build-output/CEM-Farmer-v2.0.0-release.apk
```

---

## 🔐 Android Signing Configuration

### Step 1: Generate Keystore

```bash
cd frontend
./scripts/create-keystore.sh
```

Or manually:
```bash
keytool -genkeypair -v -keystore cem-release-key.keystore \
  -alias cem-farmer-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YourStorePassword \
  -keypass YourKeyPassword \
  -dname "CN=CEM, OU=Agriculture, O=Government of Zambia, L=Lusaka, ST=Lusaka, C=ZM"
```

### Step 2: Configure Signing

Store your keystore file securely:
```bash
# Recommended location (not in git)
cp cem-release-key.keystore ~/.android/
```

### Step 3: Set Environment Variables

For local builds:
```bash
export RELEASE_KEYSTORE_FILE="$HOME/.android/cem-release-key.keystore"
export RELEASE_KEYSTORE_PASSWORD="YourStorePassword"
export RELEASE_KEY_ALIAS="cem-farmer-key"
export RELEASE_KEY_PASSWORD="YourKeyPassword"
```

Save to your shell profile (~/.bashrc, ~/.zshrc):
```bash
echo 'export RELEASE_KEYSTORE_FILE="$HOME/.android/cem-release-key.keystore"' >> ~/.bashrc
echo 'export RELEASE_KEYSTORE_PASSWORD="YourStorePassword"' >> ~/.bashrc
echo 'export RELEASE_KEY_ALIAS="cem-farmer-key"' >> ~/.bashrc
echo 'export RELEASE_KEY_PASSWORD="YourKeyPassword"' >> ~/.bashrc
```

### GitHub Actions (CI/CD)

Add these as GitHub Secrets:
- `RELEASE_KEYSTORE_FILE` (base64 encoded keystore)
- `RELEASE_KEYSTORE_PASSWORD`
- `RELEASE_KEY_ALIAS`
- `RELEASE_KEY_PASSWORD`

Encode keystore for GitHub:
```bash
base64 cem-release-key.keystore | pbcopy  # macOS
base64 cem-release-key.keystore | xclip   # Linux
```

---

## 🍎 iOS IPA Build

### Prerequisites
- macOS with Xcode 14+
- Apple Developer Account
- Valid code signing certificate
- Provisioning profile
- CocoaPods (`sudo gem install cocoapods`)

### Quick Build Commands

```bash
cd frontend

# Build IPA
./scripts/build-ios.sh

# Or with specific configuration
./scripts/build-ios.sh Release
```

### Output Location
```
frontend/build-output/CEM-Farmer-v2.0.0.ipa
```

---

## 🔐 iOS Signing Configuration

### Step 1: Configure in Xcode

1. Open project:
   ```bash
   cd frontend
   npx cap open ios
   ```

2. In Xcode:
   - Select "App" target
   - Go to "Signing & Capabilities"
   - Select your team
   - Choose appropriate provisioning profile

### Step 2: Distribution Methods

#### Development Distribution
- For internal testing on registered devices
- Requires device UDIDs in provisioning profile

#### Ad Hoc Distribution
- For beta testing (up to 100 devices)
- Doesn't require App Store

#### App Store Distribution
- For production release via App Store
- Requires App Store Connect setup

### Step 3: TestFlight (Beta Testing)

1. Build archive in Xcode
2. Upload to App Store Connect
3. Add internal/external testers
4. Distribute via TestFlight

---

## 📦 Version Management

### Bump Version Automatically

```bash
cd frontend

# Patch: 2.0.0 → 2.0.1
npm run bump-version patch

# Minor: 2.0.0 → 2.1.0
npm run bump-version minor

# Major: 2.0.0 → 3.0.0
npm run bump-version major
```

This updates:
- `package.json`
- `android/app/build.gradle` (versionCode & versionName)
- `ios/App/App.xcodeproj/project.pbxproj` (CURRENT_PROJECT_VERSION & MARKETING_VERSION)
- `src/utils/version.ts` (runtime version info)

### Manual Version Update

If needed, update these files manually:

**Android**: `android/app/build.gradle`
```gradle
versionCode 5
versionName "2.0.0"
```

**iOS**: Update in Xcode or `project.pbxproj`
```
CURRENT_PROJECT_VERSION = 5;
MARKETING_VERSION = 2.0.0;
```

---

## 🚀 Deployment Checklist

### Before Building Production APK/IPA

- [ ] All features tested on development build
- [ ] Version number updated (via `npm run bump-version`)
- [ ] Environment variables configured (API URLs, etc.)
- [ ] Signing certificates valid and not expiring soon
- [ ] Release notes prepared
- [ ] Privacy policy and terms of service updated

### Android Play Store

- [ ] APK/AAB signed with release keystore
- [ ] App tested on multiple Android versions (8.0+)
- [ ] Screenshots prepared (phone + tablet)
- [ ] Store listing updated
- [ ] Age rating completed
- [ ] Target API level meets Google requirements

### iOS App Store

- [ ] IPA signed with distribution certificate
- [ ] App tested on multiple iOS versions (13.0+)
- [ ] Screenshots prepared (all device sizes)
- [ ] App Store listing updated
- [ ] Age rating completed
- [ ] Privacy manifest configured
- [ ] TestFlight beta testing completed

---

## 🛠️ Troubleshooting

### Android Build Fails

**Issue**: `Gradle build failed`
```bash
cd frontend/android
./gradlew clean
cd ..
npm run build:android:debug
```

**Issue**: `SDK not found`
```bash
# Set ANDROID_HOME
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### iOS Build Fails

**Issue**: `Code signing error`
- Open Xcode
- Check "Signing & Capabilities"
- Ensure valid certificate and profile

**Issue**: `Pod install fails`
```bash
cd frontend/ios/App
pod repo update
pod install
```

### Version Mismatch

If version appears incorrect after building:
```bash
# Clean everything and rebuild
cd frontend
rm -rf dist/ android/app/build/ ios/App/build/
npm run build:mobile
```

---

## 📞 Support

For build issues or questions:
- Check GitHub Issues
- Contact: dev-team@example.com
- Review Capacitor docs: https://capacitorjs.com

---

## 📝 Build Information

- **App ID (Android)**: `com.cem.farmerapp`
- **Bundle ID (iOS)**: `zm.gov.agri.cem`
- **Current Version**: `2.0.0`
- **Phase**: `Phase-2`
- **Min Android**: API 22 (Android 5.1)
- **Min iOS**: 13.0
