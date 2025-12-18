# 📱 Build Mobile APK for CEM Backend

## Current Backend URL
**Production Backend**: `http://13.233.201.167:8000`

## Quick Build Steps

### Option 1: Use Pre-built APK (Fastest)
```bash
# Download the latest APK
cp /tmp/ziamis-latest.apk ./ziamis-cem-production.apk

# Install on Android device
adb install ziamis-cem-production.apk
```

**Note**: The extracted APK (`/tmp/ziamis-latest.apk`) needs the backend URL updated. Follow Option 2 for a fresh build.

---

### Option 2: Build Fresh APK with New Backend URL

#### Prerequisites
```bash
# Install Node.js dependencies
cd /workspaces/Phase1/frontend
npm install

# Install Capacitor if not present
npm install @capacitor/core @capacitor/cli @capacitor/android
```

#### 1. Update Backend URL
Already updated in `/workspaces/Phase1/frontend/.env`:
```
VITE_API_BASE_URL=http://13.233.201.167:8000
```

#### 2. Initialize Capacitor (if needed)
```bash
cd /workspaces/Phase1/frontend

# Create capacitor.config.ts
npx cap init "ZIAMIS Mobile" "com.ziamis.farmer" --web-dir=dist

# Add Android platform
npx cap add android
```

#### 3. Update Capacitor Config
Create `frontend/capacitor.config.ts`:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ziamis.farmer',
  appName: 'ZIAMIS Mobile',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    allowNavigation: ['13.233.201.167']
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
```

#### 4. Build Frontend
```bash
cd /workspaces/Phase1/frontend
npm run build
```

#### 5. Sync to Capacitor
```bash
npx cap sync android
```

#### 6. Build APK

**Option A: Using Android Studio (Recommended)**
```bash
npx cap open android
# Then in Android Studio:
# Build > Build Bundle(s) / APK(s) > Build APK(s)
```

**Option B: Command Line (Requires Android SDK)**
```bash
cd android
./gradlew assembleDebug

# APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

#### 7. Copy APK to Root
```bash
cp android/app/build/outputs/apk/debug/app-debug.apk ../../ziamis-cem-production.apk
```

---

## Testing the APK

### Install on Device
```bash
# Via ADB
adb install ziamis-cem-production.apk

# Or transfer to device and install manually
```

### Test Credentials
```
Email: admin0@gmail.com
Password: Admin@123
```

### Test Operations
1. **Login** - Should authenticate against AWS backend
2. **View Farmers** - List 29 farmers
3. **Update Status** - Change farmer approval status
4. **Upload Photo** - Test GridFS upload
5. **Generate ID Card** - Test PDF generation

---

## Backend Endpoints
All requests go to: `http://13.233.201.167:8000/api/*`

- Login: `POST /api/auth/login`
- Farmers: `GET /api/farmers/`
- Upload: `POST /api/uploads/{farmer_id}/photo`
- Download: `GET /api/files/{file_id}`
- ID Card: `POST /api/farmers/{farmer_id}/generate-idcard`

---

## Troubleshooting

### Network Error
- Ensure device can reach `13.233.201.167` (not behind restrictive firewall)
- Check `androidScheme: 'http'` in capacitor.config.ts
- Verify `allowMixedContent: true` in Android config

### Build Errors
- Run `npm run build` first
- Ensure `dist/` folder exists
- Check `npx cap sync android` for errors

### APK Won't Install
- Enable "Install from Unknown Sources" on Android
- Check minimum SDK version (usually API 22/Android 5.1)

---

## Current Status
✅ Backend deployed: http://13.233.201.167:8000
✅ Backend tested: All CRUD operations working
✅ Frontend .env updated: Points to AWS backend
⏳ APK build: Ready to build with updated URL

**Next**: Run the build commands above to generate fresh APK
