# Mobile App Build Guide - December 9, 2025

## 🔧 Changes Made

### 1. **Router Fixed: BrowserRouter → HashRouter**
**File:** `frontend/src/App.tsx`

**Why:** Capacitor apps use `file://` protocol instead of HTTP, so hash-based routing (`#/path`) works better than browser history API.

**Changes:**
```tsx
// Before
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
<BrowserRouter>

// After
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
<HashRouter>
```

### 2. **Frontend Build Complete**
- ✅ Built with `npm run build`
- ✅ Web assets ready in `/frontend/dist`
- ✅ Capacitor synced with `cap copy && cap sync`

## 📱 Building the APK

### Option A: Local Build (Linux/Mac/Windows with Android SDK)

```bash
cd /workspaces/Phase1/frontend

# 1. Build frontend
npm run build

# 2. Sync Capacitor
npx cap copy
npx cap sync

# 3. Build APK
cd android
chmod +x gradlew
./gradlew assembleDebug

# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

### Option B: GitHub Actions / Docker Build
Use Docker with Android SDK pre-installed:
```bash
docker pull androidsdk/android-30
# Then run the build commands above
```

### Option C: Use Android Studio
```bash
cd /workspaces/Phase1/frontend
npx cap open android
# Opens Android Studio - click Build → Build → Build APK
```

## 🧪 Testing on Android Phone

### 1. Enable USB Debugging
- Settings → Developer Options → USB Debugging
- Connect phone via USB

### 2. Install APK
```bash
adb install app-debug.apk
```

### 3. Test Login Flow
1. **Open App** → Should show login screen
2. **Login** with: `admin@ziamis.mwasree.zm` / `Admin@2024`
3. **After Login** → Should navigate to **Admin Dashboard** (not stuck on login page)
4. **Navigation** → Use sidebar to navigate to different sections

### 4. Check Console Logs
```bash
adb logcat | grep -i "capacitor\|router\|navigation"
```

## 🐛 Troubleshooting

### Issue: Still Stuck on Login Page
**Solution:** 
1. Clear app data: `adb shell pm clear zm.gov.agri.cem`
2. Reinstall APK: `adb install -r app-debug.apk`
3. Check logs: `adb logcat | grep -E "ERROR|Exception|Failed"`

### Issue: API Not Responding
1. **Check ngrok tunnel is running:**
   ```bash
   curl https://intercessional-unfudged-sanjuanita.ngrok-free.dev/health
   ```

2. **Update API URL in Capacitor config** if ngrok URL changes:
   ```bash
   # frontend/capacitor.config.ts
   export const config: CapacitorConfig = {
     appId: 'zm.gov.agri.cem',
     appName: 'Chiefdom Enterprise Program',
     webDir: 'dist',
     plugins: {
       SplashScreen: {
         launchShowDuration: 0
       }
     },
     server: {
       // For development on Android emulator/phone
       url: 'https://intercessional-unfudged-sanjuanita.ngrok-free.dev' // Update if ngrok URL changes
     }
   };
   ```

3. **Check Android network security config:** 
   `/frontend/android/app/src/main/res/xml/network_security_config.xml`

## 📋 Files Modified

| File | Change |
|------|--------|
| `frontend/src/App.tsx` | BrowserRouter → HashRouter |
| `frontend/dist/**` | Rebuilt web assets |
| `frontend/android/app/src/main/assets/public/` | Synced web assets |

## ✅ Next Testing Steps

1. **Build APK** on your machine with Android SDK
2. **Install on Android phone**
3. **Test login & navigation**
4. **Check dashboard displays correctly**
5. **Test farmer list, edit, ID card generation**

## 🚀 Production Build

```bash
cd frontend/android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

### Sign APK for Play Store
```bash
# Create keystore (first time only)
keytool -genkey -v -keystore zm-agri-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias ziamis

# Sign APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
  -keystore zm-agri-key.jks \
  app-release.apk ziamis

# Verify signature
jarsigner -verify -verbose app-release.apk
```

## 📞 Support

**Main Fix:** HashRouter enables proper navigation in Capacitor apps
**Status:** Code ready for APK build
**Next:** Build APK and test on Android device

