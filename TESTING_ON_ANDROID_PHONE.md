# 📱 Testing CEM on Your Android Phone

## Current Issue
Maven Central repository is experiencing server errors (HTTP 500). This prevents building the APK right now.

## Immediate Solution: Test via Browser (PWA)

The CEM app is PWA-ready and works great on mobile browsers!

### Steps:

1. **Start the server:**
   ```bash
   ./test-on-phone.sh
   ```

2. **Make port public:**
   - Go to **PORTS** tab in VS Code
   - Find port **4173**
   - Right-click → **Port Visibility** → **Public**

3. **Get the URL:**
   - Click the globe icon 🌐 next to port 4173
   - Or copy the forwarded address (looks like: `https://...-4173.app.github.dev`)

4. **Open on your phone:**
   - Open the URL in your Android phone's Chrome browser
   - Tap the menu (⋮) → **Add to Home screen**
   - Give it a name: "CEM" or "Chiefdom Model"

5. **Use like an app:**
   - Open from home screen
   - Works offline
   - Full screen experience
   - Same as native app!

---

## Building APK (When Maven Central is Working)

### Method 1: Auto Build Script

```bash
export JAVA_HOME=/home/codespace/java/21.0.9-ms
export PATH=$JAVA_HOME/bin:$PATH
cd /workspaces/Phase1
./build-apk.sh
```

The APK will be at:
```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

### Method 2: Manual Build

```bash
# Set Java 21
export JAVA_HOME=/home/codespace/java/21.0.9-ms
export PATH=$JAVA_HOME/bin:$PATH

# Build web app
cd /workspaces/Phase1/frontend
npm run build

# Sync to Android
npx cap sync android

# Build APK
cd android
./gradlew assembleDebug
```

### Installing APK on Your Phone

**Option A: USB Cable (ADB)**
```bash
# Enable USB debugging on phone first
adb devices
adb install app/build/outputs/apk/debug/app-debug.apk
```

**Option B: Download & Install**
1. Download APK from Codespaces
2. Transfer to phone (Google Drive, email, etc.)
3. Open file manager → tap APK
4. Allow "Install from unknown sources" if prompted
5. Install!

---

##Advantages of Each Method

### PWA (Browser - Available Now):
- ✅ **Works immediately**
- ✅ No build needed
- ✅ Add to home screen
- ✅ Offline support
- ✅ Push notifications
- ✅ Auto-updates
- ⚠️ Limited device access

### Native APK (When build works):
- ✅ Full device access
- ✅ Better performance
- ✅ Works completely offline
- ✅ Can be on Play Store
- ✅ Full native features
- ⚠️ Requires rebuild for updates

---

## Troubleshooting

### Maven Central Still Down?
Wait 30 minutes and try again, or use the browser method above.

### Can't access from phone?
- Check port 4173 is **Public** in PORTS tab
- Try the direct forward URL from PORTS tab
- Make sure phone is on internet (doesn't need same WiFi)

### Browser version not installing to home screen?
- Use Chrome browser (not Firefox/others)
- Must use HTTPS URL (Codespaces provides this)
- Dismiss any "unsupported" warnings

---

## What You Can Test on Phone

Both PWA and APK support:
- ✅ Login (admin/operator/farmer)
- ✅ Farmer registration
- ✅ Dashboard
- ✅ Supply requests
- ✅ Reports
- ✅ ID card generation
- ✅ Search and filters
- ✅ Offline mode (static assets)
- ✅ Responsive layouts
- ✅ Touch-friendly buttons

Test on your phone now while we wait for Maven Central! 🚀
