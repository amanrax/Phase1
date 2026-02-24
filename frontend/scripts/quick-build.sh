#!/bin/bash
# ===================================================================
# Quick Build Script - CEM Farmer App v2.0.0
# ===================================================================
# Interactive script for quick mobile builds
# ===================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                               ║${NC}"
echo -e "${BLUE}║  ${BOLD}CEM Farmer App - Quick Builder v2.0.0${NC}${BLUE}   ║${NC}"
echo -e "${BLUE}║  ${CYAN}Phase-2 Enhanced Build System${NC}${BLUE}            ║${NC}"
echo -e "${BLUE}║                                               ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗${NC} Error: Must be run from frontend directory"
    echo -e "${YELLOW}ℹ${NC}  cd frontend && ./scripts/quick-build.sh"
    exit 1
fi

# Get current version
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")

echo -e "${CYAN}Current Version:${NC} ${BOLD}${VERSION}${NC}"
echo ""

# Menu
echo -e "${BOLD}Select build option:${NC}"
echo ""
echo -e "  ${GREEN}1${NC}) 📱 Build Android APK (Debug)"
echo -e "  ${GREEN}2${NC}) 🤖 Build Android APK (Release)"
echo -e "  ${GREEN}3${NC}) 🍎 Build iOS IPA (macOS only)"
echo -e "  ${GREEN}4${NC}) 📊 Bump Version (Patch)"
echo -e "  ${GREEN}5${NC}) 📊 Bump Version (Minor)"
echo -e "  ${GREEN}6${NC}) 📊 Bump Version (Major)"
echo -e "  ${GREEN}7${NC}) 🔄 Sync Capacitor (All Platforms)"
echo -e "  ${GREEN}8${NC}) 🧹 Clean Build Artifacts"
echo -e "  ${GREEN}9${NC}) ℹ️  Show Version Info"
echo -e "  ${GREEN}0${NC}) ❌ Exit"
echo ""
echo -ne "${CYAN}Enter choice [0-9]:${NC} "
read choice

echo ""

case $choice in
    1)
        echo -e "${BLUE}Building Android Debug APK...${NC}"
        npm run build:android:debug
        echo ""
        echo -e "${GREEN}✓${NC} Build complete!"
        echo -e "${YELLOW}ℹ${NC}  Install: ${GREEN}adb install build-output/CEM-Farmer-v${VERSION}-debug.apk${NC}"
        ;;
    2)
        echo -e "${BLUE}Building Android Release APK...${NC}"
        echo -e "${YELLOW}⚠${NC}  Requires signing configuration"
        npm run build:android:release
        echo ""
        echo -e "${GREEN}✓${NC} Build complete!"
        ;;
    3)
        if [[ "$OSTYPE" != "darwin"* ]]; then
            echo -e "${RED}✗${NC} iOS builds require macOS"
            exit 1
        fi
        echo -e "${BLUE}Building iOS IPA...${NC}"
        npm run build:ios
        echo ""
        echo -e "${GREEN}✓${NC} Build complete!"
        ;;
    4)
        echo -e "${BLUE}Bumping PATCH version...${NC}"
        npm run bump-version:patch
        NEW_VERSION=$(node -p "require('./package.json').version")
        echo ""
        echo -e "${GREEN}✓${NC} Version updated: ${VERSION} → ${BOLD}${NEW_VERSION}${NC}"
        ;;
    5)
        echo -e "${BLUE}Bumping MINOR version...${NC}"
        npm run bump-version:minor
        NEW_VERSION=$(node -p "require('./package.json').version")
        echo ""
        echo -e "${GREEN}✓${NC} Version updated: ${VERSION} → ${BOLD}${NEW_VERSION}${NC}"
        ;;
    6)
        echo -e "${BLUE}Bumping MAJOR version...${NC}"
        npm run bump-version:major
        NEW_VERSION=$(node -p "require('./package.json').version")
        echo ""
        echo -e "${GREEN}✓${NC} Version updated: ${VERSION} → ${BOLD}${NEW_VERSION}${NC}"
        ;;
    7)
        echo -e "${BLUE}Syncing Capacitor...${NC}"
        npm run build
        npm run cap:sync
        echo ""
        echo -e "${GREEN}✓${NC} Sync complete!"
        ;;
    8)
        echo -e "${BLUE}Cleaning build artifacts...${NC}"
        rm -rf dist/ build-output/ android/app/build/ ios/App/build/
        echo -e "${GREEN}✓${NC} Clean complete!"
        ;;
    9)
        echo -e "${BLUE}═══════════════════════════════════${NC}"
        echo -e "${BOLD}CEM Farmer App - Version Info${NC}"
        echo -e "${BLUE}═══════════════════════════════════${NC}"
        echo -e "${CYAN}Version:${NC}        ${VERSION}"
        echo -e "${CYAN}Phase:${NC}          Phase-2"
        echo -e "${CYAN}Package:${NC}        com.cem.farmerapp (Android)"
        echo -e "${CYAN}Bundle ID:${NC}      zm.gov.agri.cem (iOS)"
        echo -e "${CYAN}Min Android:${NC}    API 22 (Android 5.1)"
        echo -e "${CYAN}Target Android:${NC} API 34 (Android 14)"
        echo -e "${CYAN}Min iOS:${NC}        13.0"
        echo -e "${BLUE}═══════════════════════════════════${NC}"
        ;;
    0)
        echo -e "${YELLOW}Exiting...${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}✗${NC} Invalid choice"
        exit 1
        ;;
esac

echo ""
echo -e "${CYAN}────────────────────────────────────${NC}"
echo -e "${GREEN}✓${NC} Operation complete!"
echo ""
