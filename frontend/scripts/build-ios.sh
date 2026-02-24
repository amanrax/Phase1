#!/bin/bash
# iOS Build Script for CEM Farmer App
# Builds iOS app archive

set -e

echo "🍎 iOS Build Script - CEM Farmer App"
echo "====================================="

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

# Check if on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ Error: iOS builds require macOS${NC}"
    exit 1
fi

# Build configuration (default: Debug)
CONFIGURATION=${1:-Debug}

echo -e "${YELLOW}📦 Building for: ${CONFIGURATION}${NC}"
echo ""

# Step 1: Install dependencies
echo "📥 Installing dependencies..."
npm install

# Step 2: Build web assets
echo "🔨 Building web assets..."
npm run build

# Step 3: Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync ios

# Step 4: Install CocoaPods (if needed)
echo "📦 Installing CocoaPods dependencies..."
cd ios/App
pod install
cd ../..

# Step 5: Build iOS
echo "🍎 Building iOS app..."

if [ "$CONFIGURATION" = "Release" ]; then
    echo -e "${YELLOW}📱 Building for RELEASE...${NC}"
    echo -e "${YELLOW}⚠️  Note: Requires proper signing certificates and provisioning profiles${NC}"
    echo ""
    echo "To build for release, use Xcode:"
    echo "   1. npm run cap:open:ios"
    echo "   2. In Xcode: Product -> Archive"
    echo "   3. Distribute to App Store or Ad Hoc"
else
    echo -e "${YELLOW}📱 Building for DEBUG...${NC}"
    echo ""
    echo "Opening in Xcode for debugging..."
    npx cap open ios
fi

echo ""
echo -e "${GREEN}✅ iOS setup complete!${NC}"
echo ""
echo "📱 Next steps:"
echo "   1. Connect iOS device"
echo "   2. In Xcode: Select your device"
echo "   3. Click 'Run' or Product -> Run"
echo ""
echo "📖 For release builds:"
echo "   1. Update signing in Xcode"
echo "   2. Product -> Archive"
echo "   3. Distribute via App Store Connect or TestFlight"
