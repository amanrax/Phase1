#!/bin/bash
# CEM Mobile Setup Verification Script

echo "🔍 CEM Mobile Build Setup Verification"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
  echo -e "${RED}❌ Error: Not in project root directory${NC}"
  exit 1
fi

echo "📁 Checking file structure..."

# Phase 1: PWA Files
FILES_PHASE1=(
  "frontend/public/manifest.json"
  "frontend/public/service-worker.js"
  "frontend/src/registerSW.ts"
  "frontend/public/icons/icon-192x192.png"
  "frontend/public/icons/icon-512x512.png"
)

for file in "${FILES_PHASE1[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
  else
    echo -e "${RED}✗${NC} $file (missing)"
    ((ERRORS++))
  fi
done

# Phase 2: Capacitor Files
FILES_PHASE2=(
  "frontend/capacitor.config.ts"
  "frontend/src/config/mobile.ts"
  "frontend/.env.development"
  "frontend/.env.production"
)

for file in "${FILES_PHASE2[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
  else
    echo -e "${RED}✗${NC} $file (missing)"
    ((ERRORS++))
  fi
done

# Build scripts
FILES_SCRIPTS=(
  "frontend/build-mobile.sh"
  "CEM_MOBILE_BUILD_GUIDE.md"
  "MOBILE_QUICKSTART.md"
  "CEM_MOBILE_IMPLEMENTATION_SUMMARY.md"
)

for file in "${FILES_SCRIPTS[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
  else
    echo -e "${RED}✗${NC} $file (missing)"
    ((ERRORS++))
  fi
done

echo ""
echo "📦 Checking package.json configuration..."

cd frontend || exit 1

# Check for Capacitor dependencies
if grep -q "@capacitor/core" package.json; then
  echo -e "${GREEN}✓${NC} Capacitor dependencies added"
else
  echo -e "${RED}✗${NC} Capacitor dependencies missing"
  ((ERRORS++))
fi

# Check for mobile scripts
if grep -q "build:mobile" package.json; then
  echo -e "${GREEN}✓${NC} Mobile build scripts added"
else
  echo -e "${RED}✗${NC} Mobile build scripts missing"
  ((ERRORS++))
fi

echo ""
echo "🔧 Checking Node.js setup..."

if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}✓${NC} Node.js installed: $NODE_VERSION"
else
  echo -e "${RED}✗${NC} Node.js not found"
  ((ERRORS++))
fi

if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm -v)
  echo -e "${GREEN}✓${NC} npm installed: $NPM_VERSION"
else
  echo -e "${RED}✗${NC} npm not found"
  ((ERRORS++))
fi

echo ""
echo "⚙️  Checking environment configuration..."

if [ -f ".env.production" ]; then
  if grep -q "VITE_API_PROD_URL=https://your-production-api.example.com" .env.production; then
    echo -e "${YELLOW}⚠${NC}  Production API URL not configured (using placeholder)"
    ((WARNINGS++))
  else
    echo -e "${GREEN}✓${NC} Production API URL configured"
  fi
fi

echo ""
echo "🎨 Checking icons..."

ICON_COUNT=$(find public/icons -name "icon-*.png" 2>/dev/null | wc -l)
if [ "$ICON_COUNT" -ge 8 ]; then
  echo -e "${GREEN}✓${NC} All icon sizes present ($ICON_COUNT icons)"
  
  # Check if they're just placeholders
  ICON_SIZE=$(wc -c < "public/icons/icon-192x192.png" 2>/dev/null || echo 0)
  if [ "$ICON_SIZE" -lt 1000 ]; then
    echo -e "${YELLOW}⚠${NC}  Icons are placeholders - replace before production"
    ((WARNINGS++))
  fi
else
  echo -e "${RED}✗${NC} Missing icon files (found $ICON_COUNT, need 8)"
  ((ERRORS++))
fi

cd ..

echo ""
echo "========================================"
echo "📊 Verification Summary"
echo "========================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  echo ""
  echo "🚀 Ready to build mobile app:"
  echo "   cd frontend"
  echo "   npm install"
  echo "   ./build-mobile.sh"
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Setup complete with $WARNINGS warning(s)${NC}"
  echo ""
  echo "You can proceed with build, but address warnings before production."
  echo ""
  echo "Next steps:"
  echo "   cd frontend"
  echo "   npm install"
  echo "   ./build-mobile.sh"
else
  echo -e "${RED}❌ Found $ERRORS error(s) and $WARNINGS warning(s)${NC}"
  echo ""
  echo "Please fix errors before proceeding."
fi

echo ""
echo "📚 Documentation:"
echo "   Quick Start: MOBILE_QUICKSTART.md"
echo "   Full Guide: CEM_MOBILE_BUILD_GUIDE.md"
echo "   Summary: CEM_MOBILE_IMPLEMENTATION_SUMMARY.md"
echo ""

exit $ERRORS
