# CEM Mobile Build Instructions

## Overview
This guide explains how to build and deploy the **Chiefdom Empowerment Model (CEM)** as a native mobile app for Android and iOS using Capacitor.

## Prerequisites

### Required Software
- **Node.js** 18+ and npm
- **Android Studio** (for Android builds)
- **Xcode** (for iOS builds - macOS only)
- **Java JDK** 17+ (for Android)

### Install Capacitor CLI
```bash
cd frontend
npm install
```

---

## Phase 1: PWA Setup ✅ COMPLETE

The web app is now PWA-ready with:
- ✅ Progressive Web App manifest (`/public/manifest.json`)
- ✅ Service worker for offline capability
- ✅ PWA icons (72x72 to 512x512)
- ✅ Mobile-optimized meta tags
- ✅ Theme color and splash screen configuration

---

## Phase 2: Capacitor Setup

### 2.1 Quick Setup (Automated)

Run the automated build script:
```bash
cd frontend
chmod +x build-mobile.sh
./build-mobile.sh
```

### 2.2 Manual Setup

#### Step 1: Build the web app
```bash
cd frontend
npm run build
```

#### Step 2: Initialize Capacitor (first time only)
```bash
npx cap init "Chiefdom Empowerment Model" "zm.gov.agri.cem" --web-dir=dist
```

#### Step 3: Add platforms
```bash
# Add Android
npm run cap:add:android

# Add iOS (macOS only)
npm run cap:add:ios
```

#### Step 4: Sync Capacitor
```bash
npm run cap:sync
```

---

## Phase 3: Build & Run on Devices

### 3.1 Android

#### Open in Android Studio
```bash
npm run cap:open:android
```

#### Build APK/Bundle
1. In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK**
2. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

#### Run on Device
1. Connect Android device via USB (enable USB debugging)
2. Or start Android emulator
3. Click **Run** (green play button) in Android Studio

### 3.2 iOS (macOS only)

#### Open in Xcode
```bash
npm run cap:open:ios
```

#### Build & Run
1. Select target device/simulator in Xcode
2. Click **Run** (play button) or press `Cmd+R`
3. For physical devices: configure signing in Xcode project settings

---

## Phase 4: Configuration

### 4.1 Environment Variables

#### Development Build
Edit `frontend/.env.development`:
```env
VITE_API_BASE_URL=http://localhost:8000
```

#### Production Build
Edit `frontend/.env.production`:
```env
VITE_API_PROD_URL=https://your-production-api.example.com
VITE_API_BASE_URL=https://your-production-api.example.com
```

### 4.2 Update Production API URL

Before building for production, update the API URL:

1. Edit `frontend/.env.production`
2. Set `VITE_API_PROD_URL` to your production FastAPI server
3. Rebuild: `npm run build:mobile`

### 4.3 App Icons

Replace placeholder icons in `frontend/public/icons/`:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

Use a tool like [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator) or create manually with green theme (#15803d).

### 4.4 Splash Screen

Edit `capacitor.config.ts` to customize:
```typescript
SplashScreen: {
  launchShowDuration: 2000,
  backgroundColor: '#15803d', // CEM green
  showSpinner: false
}
```

---

## Development Workflow

### Making Changes

1. **Update code** in `frontend/src/`
2. **Rebuild web app**: `npm run build`
3. **Sync to mobile**: `npm run cap:sync`
4. **Test** in Android Studio/Xcode

### Hot Reload (Development)

For faster development, run web app locally and point Capacitor to it:

1. Edit `capacitor.config.ts`:
```typescript
server: {
  url: 'http://192.168.1.100:5173', // Your local IP
  cleartext: true
}
```

2. Start dev server: `npm run dev`
3. Sync: `npm run cap:sync`
4. Run in Android Studio/Xcode

**Note**: Use your computer's local IP, not localhost!

---

## Testing Checklist

### ✅ Authentication
- [ ] Admin login
- [ ] Operator login  
- [ ] Farmer login (NRC + DOB)
- [ ] Token refresh
- [ ] Logout

### ✅ Farmer Management
- [ ] Register new farmer
- [ ] Edit farmer details
- [ ] View farmer list
- [ ] Search/filter farmers

### ✅ Core Features
- [ ] Dashboard statistics
- [ ] Supply requests
- [ ] Reports generation
- [ ] ID card generation
- [ ] File uploads (photos, documents)
- [ ] QR code scanning

### ✅ Mobile UX
- [ ] Responsive layouts
- [ ] Safe area handling (notch support)
- [ ] Back button behavior
- [ ] Camera access for photos
- [ ] Offline indicator
- [ ] Network error handling

---

## Troubleshooting

### Build Errors

**Android: SDK not found**
```bash
# Set ANDROID_HOME environment variable
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

**iOS: Signing issues**
- Open Xcode project
- Go to Signing & Capabilities
- Select your development team

### Network Issues

**API not reachable from mobile**
- Ensure API URL uses HTTPS (not HTTP) for production
- Check that API server allows CORS from mobile origin
- For local development, use computer's IP (not localhost)

### Capacitor Not Syncing

```bash
# Clean and rebuild
rm -rf android ios
npm run cap:add:android
npm run cap:add:ios
npm run cap:sync
```

---

## Production Deployment

### Android (Google Play Store)

1. Generate release APK/Bundle
2. Sign with release keystore
3. Upload to Google Play Console
4. Complete store listing

### iOS (App Store)

1. Archive in Xcode
2. Upload to App Store Connect
3. Complete app information
4. Submit for review

---

## Support

For issues or questions:
- Check Capacitor docs: https://capacitorjs.com/docs
- Review CEM backend API: `/backend/app/routes/`
- Test web build first: `npm run preview`

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**App ID**: zm.gov.agri.cem
