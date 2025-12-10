#!/bin/bash
# Build APK - Run this on your machine with Android SDK installed

set -e

echo "🚀 Building CEM APK with HashRouter fix..."
echo ""

cd "$(dirname "$0")/frontend" || exit 1

echo "✅ Building frontend..."
npm run build

echo "✅ Syncing Capacitor..."
npx cap copy
npx cap sync

echo "✅ Building APK with Gradle..."
cd android
chmod +x gradlew

if command -v ./gradlew &> /dev/null; then
    ./gradlew assembleDebug
    
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$APK_PATH" ]; then
        echo ""
        echo "✅ APK READY!"
        echo "📍 Location: $(pwd)/$APK_PATH"
        echo ""
        echo "📱 To install on phone:"
        echo "   adb install $APK_PATH"
        echo ""
        echo "🧪 To test:"
        echo "   adb shell am start -n zm.gov.agri.cem/.MainActivity"
    fi
else
    echo "❌ Gradle not found"
    exit 1
fi
