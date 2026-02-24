# 📱 CEM Farmer Mobile App - Phase-2 (v2.0.0)

Complete mobile application for Zambian farmer registration and management system.

---

## 🚀 Quick Start

### Install Dependencies
```bash
cd frontend
npm install
```

### Development Build (Debug)
```bash
# Android
npm run build:android:debug

# iOS (macOS only)
npm run build:ios
```

### Production Build (Release)
```bash
# Android (requires signing)
npm run build:android:release

# iOS (requires signing)
npm run build:ios:release
```

---

## 📦 Version Management

### Current Version: **2.0.0** (Phase-2)

### Bump Version Automatically
```bash
# Patch: 2.0.0 → 2.0.1
npm run bump-version:patch

# Minor: 2.0.0 → 2.1.0  
npm run bump-version:minor

# Major: 2.0.0 → 3.0.0
npm run bump-version:major
```

This automatically updates:
- ✅ package.json
- ✅ Android build.gradle (versionCode + versionName)
- ✅ iOS project.pbxproj (build number + marketing version)
- ✅ src/utils/version.ts (runtime version info)

---

## 🤖 Android APK

### Build Commands
```bash
# Debug (no signing required)
npm run build:android:debug
# or
./scripts/build-android.sh debug

# Release (requires signing)
npm run build:android:release
# or  
./scripts/build-android.sh release
```

### Output Location
```
frontend/build-output/CEM-Farmer-v2.0.0-debug.apk
frontend/build-output/CEM-Farmer-v2.0.0-release.apk
```

### Install on Device
```bash
adb install frontend/build-output/CEM-Farmer-v2.0.0-debug.apk
```

### App Info
- **Package Name**: `com.cem.farmerapp`
- **Min Android**: API 22 (Android 5.1)
- **Target Android**: API 34 (Android 14)

---

## 🍎 iOS IPA

### Build Commands
```bash
# Development build
npm run build:ios
# or
./scripts/build-ios.sh

# Release build
npm run build:ios:release
# or
./scripts/build-ios.sh Release
```

### Output Location
```
frontend/build-output/CEM-Farmer-v2.0.0.ipa
```

### Requirements
- macOS with Xcode 14+
- Valid Apple Developer account
- Code signing certificate
- Provisioning profile
- CocoaPods installed

### App Info
- **Bundle ID**: `zm.gov.agri.cem`
- **Min iOS**: 13.0
- **Target iOS**: Latest

---

## 🔐 Signing Configuration

### Android Signing

1. **Generate keystore**:
   ```bash
   cd frontend
   ./scripts/create-keystore.sh
   ```

2. **Set environment variables**:
   ```bash
   export RELEASE_KEYSTORE_FILE="$HOME/.android/cem-release-key.keystore"
   export RELEASE_KEYSTORE_PASSWORD="your_password"
   export RELEASE_KEY_ALIAS="cem-farmer-key"
   export RELEASE_KEY_PASSWORD="your_password"
   ```

3. **Build release APK**:
   ```bash
   npm run build:android:release
   ```

### iOS Signing

1. **Open in Xcode**:
   ```bash
   npx cap open ios
   ```

2. **Configure signing**:
   - Select "App" target
   - Go to "Signing & Capabilities"
   - Choose your team and certificate

3. **Build IPA**:
   ```bash
   npm run build:ios:release
   ```

📚 **Detailed Guide**: See [SIGNING_CONFIG.md](SIGNING_CONFIG.md)

---

## 🔄 Capacitor Sync

Sync platform-specific code after changing web assets:

```bash
# Sync all platforms
npm run cap:sync

# Sync specific platform
npm run cap:sync:android
npm run cap:sync:ios
```

---

## 🛠️ Development

### Run in Browser
```bash
npm run dev
```

### Open in Native IDE

```bash
# Android Studio
npm run cap:open:android

# Xcode
npm run cap:open:ios
```

### Live Reload on Device

1. Find your local IP:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://YOUR_IP:5173',
     cleartext: true
   }
   ```

3. Run dev server and sync:
   ```bash
   npm run dev
   npm run cap:sync
   ```

---

## 📊 App Features (Phase-2)

### Core Functionality
✅ Farmer registration (offline-capable)
✅ Crop & livestock management
✅ Photo capture & document uploads
✅ NRC verification with auto-formatting
✅ QR code generation for farmer ID cards
✅ Offline data sync
✅ Multi-language support (English)

### Phase-2 Enhancements
✅ **Reports**: Generate PDF/Excel reports
✅ **Analytics Dashboard**: Real-time statistics
✅ **Dark Mode**: User-selectable theme
✅ **QR Verification**: Scan & verify farmer IDs
✅ **Enhanced Logging**: Comprehensive error tracking
✅ **Performance**: Optimized for low-end devices
✅ **UX Improvements**: Refined UI/UX across all screens

---

## 📁 Project Structure

```
frontend/
├── android/              # Android native project
├── ios/                  # iOS native project
├── src/                  # React TypeScript source
│   ├── components/       # Reusable components
│   ├── pages/           # Screen components
│   ├── services/        # API & data services
│   ├── store/           # Zustand state management
│   └── utils/           # Utilities (including version.ts)
├── scripts/             # Build automation scripts
│   ├── build-android.sh # Android APK builder
│   ├── build-ios.sh     # iOS IPA builder
│   ├── bump-version.js  # Version management
│   └── create-keystore.sh # Keystore generator
├── build-output/        # Build artifacts (gitignored)
├── BUILD_GUIDE.md       # Complete build documentation
├── SIGNING_CONFIG.md    # Signing setup guide
└── package.json         # Dependencies & scripts
```

---

## 🚀 CI/CD (GitHub Actions)

Automated builds trigger on:
- Push to `dev` branch → Debug APK
- Push to `main` branch → Release APK
- Tags `v*` → Release with GitHub Release

### Setup GitHub Secrets

Add to: Settings → Secrets and variables → Actions

1. `RELEASE_KEYSTORE_BASE64` - Base64 encoded keystore
2. `RELEASE_KEYSTORE_PASSWORD` - Keystore password
3. `RELEASE_KEY_ALIAS` - Key alias (cem-farmer-key)
4. `RELEASE_KEY_PASSWORD` - Key password

📚 **See**: [.github/workflows/build-android.yml](../.github/workflows/build-android.yml)

---

## 📱 Testing

### On Real Devices

**Android**:
```bash
# Install debug APK
adb install build-output/CEM-Farmer-v2.0.0-debug.apk

# View logs
adb logcat | grep CEMFarmer
```

**iOS**:
- Install via Xcode
- Or use TestFlight for beta testing

### Test Checklist

- [ ] Farmer registration flow
- [ ] Photo capture & upload
- [ ] Offline mode functionality
- [ ] Data sync after coming online
- [ ] QR code scanning
- [ ] Report generation (PDF/Excel)
- [ ] Dark mode toggle
- [ ] Form validation
- [ ] Error handling
- [ ] Performance on low-end devices

---

## 🐛 Troubleshooting

### Build Fails

**Clear caches**:
```bash
cd frontend
rm -rf dist/ node_modules/ android/app/build/ ios/App/build/
npm install
npm run build:android:debug
```

### Android Gradle Issues

```bash
cd frontend/android
./gradlew clean
cd ..
npm run build:android:debug
```

### iOS Pod Issues

```bash
cd frontend/ios/App
pod repo update
pod install
cd ../..
npm run build:ios
```

### Version Not Updating

```bash
# Force rebuild
rm -rf dist/ build-output/
npm run bump-version:patch
npm run build:mobile
```

---

## 📚 Additional Documentation

- 📖 [Complete Build Guide](BUILD_GUIDE.md) - Detailed build instructions
- 🔐 [Signing Configuration](SIGNING_CONFIG.md) - Security & signing setup
- 🌐 [Capacitor Docs](https://capacitorjs.com) - Official Capacitor documentation

---

## 🆘 Support

**Issues**: GitHub Issues
**Email**: dev-team@cem.gov.zm
**Docs**: See BUILD_GUIDE.md

---

## 📅 Version History

### v2.0.0 (Phase-2) - Current
- ✨ Complete Phase-2 features
- 📊 Reports & Analytics
- 🌙 Dark mode support
- 📱 QR verification
- 🐛 Bug fixes & performance improvements

### v1.0.3 (Phase-1)
- Initial production release
- Core farmer registration
- Offline sync capability

---

## 📄 License

Copyright © 2026 Government of Zambia - Ministry of Agriculture
All rights reserved.
