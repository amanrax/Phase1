#!/bin/bash
# Quick rebuild mobile app with new API URL
# Usage: ./rebuild-mobile.sh https://your-api-url.com

set -e

if [ -z "$1" ]; then
    echo "❌ Error: API URL required"
    echo ""
    echo "Usage: ./rebuild-mobile.sh <API_URL>"
    echo ""
    echo "Examples:"
    echo "  ./rebuild-mobile.sh https://abc123.ngrok.io"
    echo "  ./rebuild-mobile.sh http://192.168.1.100:8000"
    echo "  ./rebuild-mobile.sh https://api.ziamis.gov.zm"
    echo ""
    exit 1
fi

API_URL=$1

echo "🔧 Rebuilding ZIAMIS Mobile App"
echo "================================"
echo "API URL: $API_URL"
echo ""

# Update .env.production
echo "📝 Updating .env.production..."
cd /workspaces/Phase1/frontend
cat > .env.production << EOF
# Mobile app production configuration
# Last updated: $(date)
VITE_API_PROD_URL=${API_URL}
VITE_API_BASE_URL=${API_URL}
EOF

echo "✅ Updated .env.production"
echo ""

# Build web app
echo "🏗️  Building web app..."
npm run build

echo "✅ Web app built"
echo ""

# Sync Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync android

echo "✅ Capacitor synced"
echo ""

# Build APK
echo "📱 Building APK..."
cd android
./gradlew assembleDebug --quiet

APK_PATH="app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo ""
    echo "✅ APK built successfully!"
    echo ""
    echo "📦 APK Details:"
    echo "   Location: android/$APK_PATH"
    echo "   Size: $APK_SIZE"
    echo "   API: $API_URL"
    echo ""
    echo "📲 Next steps:"
    echo "   1. Download APK from: /workspaces/Phase1/frontend/android/$APK_PATH"
    echo "   2. Transfer to your phone"
    echo "   3. Install and test"
    echo ""
else
    echo "❌ APK build failed!"
    exit 1
fi
