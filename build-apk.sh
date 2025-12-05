#!/bin/bash
# Build CEM APK for Android

echo "📱 Building CEM Android APK"
echo "============================"
echo ""

cd /workspaces/Phase1/frontend || exit 1

# Step 1: Build web app
echo "1️⃣ Building web app..."
npm run build

# Step 2: Sync to Android
echo ""
echo "2️⃣ Syncing to Android..."
npx cap sync android

# Step 3: Build APK
echo ""
echo "3️⃣ Building APK (this may take 2-3 minutes)..."
cd android || exit 1

# Build debug APK (faster, for testing)
./gradlew assembleDebug

echo ""
echo "✅ APK Built Successfully!"
echo ""
echo "📦 APK Location:"
APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    FULL_PATH="/workspaces/Phase1/frontend/android/$APK_PATH"
    SIZE=$(ls -lh "$APK_PATH" | awk '{print $5}')
    echo "   $FULL_PATH"
    echo "   Size: $SIZE"
    echo ""
    echo "📲 To install on your Android phone:"
    echo ""
    echo "   Option 1 - USB Cable:"
    echo "   1. Enable USB debugging on your phone"
    echo "   2. Connect phone via USB"
    echo "   3. Run: adb install $APK_PATH"
    echo ""
    echo "   Option 2 - Download:"
    echo "   1. Download the APK file from Codespaces"
    echo "   2. Transfer to your phone (email, cloud, etc.)"
    echo "   3. Install from file manager"
    echo ""
else
    echo "   ⚠️ APK not found. Build may have failed."
    echo "   Check errors above."
fi
