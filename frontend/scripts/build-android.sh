#!/bin/bash
# Android Build Script for CEM Farmer App
# Builds both debug and release APKs

set -e

echo "🤖 Android Build Script - CEM Farmer App"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must be run from frontend directory${NC}"
    exit 1
fi

# Build type (default: debug)
BUILD_TYPE=${1:-debug}

echo -e "${YELLOW}📦 Building for: ${BUILD_TYPE}${NC}"
echo ""

# Step 1: Install dependencies
echo "📥 Installing dependencies..."
npm install

# Step 2: Build web assets
echo "🔨 Building web assets..."
npm run build

# Step 3: Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync android

# Step 4: Build Android APK
echo "🤖 Building Android APK..."
cd android

if [ "$BUILD_TYPE" = "release" ]; then
    echo -e "${YELLOW}📱 Building RELEASE APK...${NC}"
    
    # Check for signing configuration
    if [ -z "$RELEASE_KEYSTORE_FILE" ]; then
        echo -e "${RED}⚠️  Warning: No signing config found${NC}"
        echo -e "${YELLOW}   Building unsigned release APK${NC}"
        echo -e "${YELLOW}   Set RELEASE_KEYSTORE_FILE, RELEASE_KEYSTORE_PASSWORD, RELEASE_KEY_ALIAS, RELEASE_KEY_PASSWORD to sign${NC}"
    else
        echo -e "${GREEN}✅ Using keystore: $RELEASE_KEYSTORE_FILE${NC}"
    fi
    
    ./gradlew assembleRelease
    
    # Output locations
    echo ""
    echo -e "${GREEN}✅ Release APK built successfully!${NC}"
    echo "📁 Output location:"
    echo "   app/build/outputs/apk/release/app-release.apk"
    
    if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
        APK_SIZE=$(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)
        echo "   Size: $APK_SIZE"
    fi
else
    echo -e "${YELLOW}📱 Building DEBUG APK...${NC}"
    ./gradlew assembleDebug
    
    echo ""
    echo -e "${GREEN}✅ Debug APK built successfully!${NC}"
    echo "📁 Output location:"
    echo "   app/build/outputs/apk/debug/app-debug.apk"
    
    if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
        APK_SIZE=$(du -h app/build/outputs/apk/debug/app-debug.apk | cut -f1)
        echo "   Size: $APK_SIZE"
    fi
fi

cd ..

echo ""
echo -e "${GREEN}🎉 Build complete!${NC}"
echo ""
echo "📱 To install on device:"
echo "   adb install android/app/build/outputs/apk/${BUILD_TYPE}/app-${BUILD_TYPE}.apk"
echo ""
echo "📖 Or open in Android Studio:"
echo "   npm run cap:open:android"
