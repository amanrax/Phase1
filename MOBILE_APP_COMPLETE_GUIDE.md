# 📱 ZIAMIS Mobile App - Complete Setup Guide

## ✅ Current Status

**The mobile app is READY and building!**

- ✅ Capacitor configured
- ✅ Android platform added
- ✅ iOS platform added  
- ✅ Web app built (production)
- ✅ Capacitor synced
- 🔄 APK building now...

---

## 📦 What You Have

### App Identity
- **App Name**: Chiefdom Empowerment Model (CEM)
- **App ID**: `zm.gov.agri.cem`
- **Package**: Zambian Agriculture Ministry

### Platforms
- ✅ **Android** - `/workspaces/Phase1/frontend/android/`
- ✅ **iOS** - `/workspaces/Phase1/frontend/ios/`
- ✅ **PWA** - Progressive Web App enabled

---

## 🚀 Quick Start Commands

### Build & Sync
```bash
cd /workspaces/Phase1/frontend

# Build production web app
npm run build

# Sync with native platforms
npx cap sync
```

### Build APK (Android)
```bash
cd /workspaces/Phase1/frontend/android
./gradlew assembleDebug

# APK location:
# app/build/outputs/apk/debug/app-debug.apk
```

### Build Release APK (Signed)
```bash
cd /workspaces/Phase1/frontend/android
./gradlew assembleRelease

# APK location:
# app/build/outputs/apk/release/app-release.apk
```

### Open in Android Studio
```bash
cd /workspaces/Phase1/frontend
npm run cap:open:android
```

### Open in Xcode (macOS only)
```bash
cd /workspaces/Phase1/frontend
npm run cap:open:ios
```

---

## 📲 Testing the Mobile App

### Option 1: Android Emulator
1. Open Android Studio
2. Start an emulator (AVD Manager)
3. Click Run in Android Studio

### Option 2: Physical Android Device
1. Enable **Developer Options** on your phone:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   
2. Enable **USB Debugging**:
   - Settings → Developer Options → USB Debugging

3. Connect via USB and install:
   ```bash
   cd /workspaces/Phase1/frontend/android
   ./gradlew installDebug
   ```

### Option 3: Share APK File
1. Find the APK:
   ```bash
   ls -lh /workspaces/Phase1/frontend/android/app/build/outputs/apk/debug/
   ```

2. Download it from GitHub Codespace:
   - Right-click `app-debug.apk` in VS Code
   - Select "Download"

3. Transfer to phone:
   - Email, Google Drive, USB, etc.
   - Install (may need to allow "Install from Unknown Sources")

---

## 🎨 App Features

### PWA Features (Built-in)
- ✅ **Offline Support** - Service worker caching
- ✅ **Add to Home Screen** - PWA installable
- ✅ **Splash Screen** - Green branded splash
- ✅ **App Icons** - All sizes (72px to 512px)
- ✅ **Mobile Optimized** - Responsive design

### Capacitor Native Features (Available)
- 📸 **Camera** - Photo capture for farmer registration
- 📱 **Device Info** - Platform detection
- 🌐 **Network** - Online/offline detection
- 💾 **Storage** - Local data persistence
- 📍 **Geolocation** - GPS for farm locations
- 📂 **Filesystem** - Document uploads

---

## 🔧 Configuration Files

### 1. Capacitor Config (`frontend/capacitor.config.ts`)
```typescript
{
  appId: 'zm.gov.agri.cem',
  appName: 'Chiefdom Empowerment Model',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#15803d', // ZIAMIS green
      showSpinner: false
    }
  }
}
```

### 2. PWA Manifest (`frontend/public/manifest.json`)
```json
{
  "name": "Chiefdom Empowerment Model",
  "short_name": "CEM",
  "theme_color": "#15803d",
  "background_color": "#15803d",
  "display": "standalone",
  "icons": [...]
}
```

### 3. Environment (`frontend/.env.production`)
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_PROD_URL=https://your-production-api.com
```

---

## 📝 Making Changes

### Update Web Code
```bash
cd /workspaces/Phase1/frontend

# 1. Edit your React/TypeScript files
# 2. Build
npm run build

# 3. Sync to native platforms
npx cap sync

# 4. Rebuild APK
cd android && ./gradlew assembleDebug
```

### Update App Icon
1. Replace icons in `frontend/public/icons/`
2. Run `npx cap sync`
3. Rebuild

### Update Splash Screen
Edit `frontend/capacitor.config.ts`:
```typescript
SplashScreen: {
  backgroundColor: '#your-color',
  launchShowDuration: 2000
}
```

---

## 🎯 Production Deployment

### Android Play Store

1. **Create Keystore** (one-time):
   ```bash
   cd /workspaces/Phase1/frontend/android
   keytool -genkey -v -keystore cem-release-key.keystore \
     -alias cem -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure Signing** (`android/app/build.gradle`):
   ```gradle
   signingConfigs {
       release {
           storeFile file('cem-release-key.keystore')
           storePassword 'your-password'
           keyAlias 'cem'
           keyPassword 'your-password'
       }
   }
   ```

3. **Build Release Bundle**:
   ```bash
   ./gradlew bundleRelease
   # Output: app/build/outputs/bundle/release/app-release.aab
   ```

4. **Upload to Play Console**:
   - Go to https://play.google.com/console
   - Create app → Upload AAB → Submit for review

### iOS App Store (macOS required)

1. **Open in Xcode**:
   ```bash
   cd /workspaces/Phase1/frontend
   npx cap open ios
   ```

2. **Configure Signing**:
   - Xcode → Project → Signing & Capabilities
   - Select Team (Apple Developer Account)

3. **Archive & Upload**:
   - Product → Archive
   - Window → Organizer → Upload to App Store

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Clean and rebuild
cd /workspaces/Phase1/frontend/android
./gradlew clean
./gradlew assembleDebug
```

### Sync Issues
```bash
# Re-sync everything
cd /workspaces/Phase1/frontend
npm run build
npx cap sync --force
```

### Port Issues
If backend is not accessible, update API URL:
```typescript
// capacitor.config.ts
server: {
  url: 'http://192.168.1.100:8000', // Your machine's IP
  cleartext: true
}
```

---

## 📊 Build Status

**Current Build**: ✅ READY
- Web built: ✅
- Android synced: ✅
- iOS synced: ✅
- APK building: 🔄 In progress...

**Check APK status**:
```bash
ls -lh /workspaces/Phase1/frontend/android/app/build/outputs/apk/debug/
```

---

## 🎓 Learn More

- **Capacitor Docs**: https://capacitorjs.com/docs
- **PWA Guide**: https://web.dev/progressive-web-apps/
- **Android Studio**: https://developer.android.com/studio
- **Play Store Publishing**: https://developer.android.com/distribute

---

## ✨ Next Steps

1. ✅ Wait for APK build to complete (~2-5 minutes)
2. 📥 Download `app-debug.apk`
3. 📱 Install on Android device
4. 🧪 Test all features
5. 🎨 Customize branding/icons
6. 🚀 Prepare for production release

---

**Questions? Check the detailed guides:**
- `MOBILE_QUICKSTART.md` - Quick reference
- `CEM_MOBILE_BUILD_GUIDE.md` - Detailed build instructions
- `MOBILE_TESTING_GUIDE.md` - Testing procedures
