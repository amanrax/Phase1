#!/bin/bash
# CEM Mobile Build Script
# This script handles the complete mobile build process for CEM

set -e

echo "🌾 CEM Mobile Build Script"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Install dependencies
echo -e "${BLUE}Step 1: Installing dependencies...${NC}"
cd frontend
npm install

# Step 2: Build the web app
echo -e "${BLUE}Step 2: Building CEM web app (production)...${NC}"
npm run build

# Step 3: Initialize Capacitor (only if not already initialized)
if [ ! -d "android" ] && [ ! -d "ios" ]; then
  echo -e "${BLUE}Step 3: Initializing Capacitor...${NC}"
  npx cap init "Chiefdom Empowerment Model" "zm.gov.agri.cem" --web-dir=dist
else
  echo -e "${YELLOW}Capacitor already initialized. Skipping...${NC}"
fi

# Step 4: Add platforms
echo -e "${BLUE}Step 4: Adding mobile platforms...${NC}"

if [ ! -d "android" ]; then
  echo "Adding Android platform..."
  npx cap add android
else
  echo -e "${YELLOW}Android platform already exists${NC}"
fi

if [ ! -d "ios" ]; then
  echo "Adding iOS platform..."
  npx cap add ios
else
  echo -e "${YELLOW}iOS platform already exists${NC}"
fi

# Step 5: Sync Capacitor
echo -e "${BLUE}Step 5: Syncing Capacitor...${NC}"
npx cap sync

echo ""
echo -e "${GREEN}✅ CEM Mobile Build Complete!${NC}"
echo ""
echo "Next steps:"
echo "  📱 For Android: npm run cap:open:android"
echo "  📱 For iOS: npm run cap:open:ios"
echo ""
echo "Build and run on devices:"
echo "  - Android: Open in Android Studio, connect device/emulator, and click Run"
echo "  - iOS: Open in Xcode, select device/simulator, and click Run"
echo ""
