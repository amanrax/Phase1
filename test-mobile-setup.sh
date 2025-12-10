#!/bin/bash
# Mobile App Setup Verification Script
# Tests all components needed for mobile app to work

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 ZIAMIS Mobile App - System Diagnostic"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Check if ngrok is running
echo -e "${BLUE}[Test 1/8]${NC} Checking ngrok process..."
if pgrep -f ngrok > /dev/null; then
    echo -e "${GREEN}✓ PASS${NC} - ngrok is running (PID: $(pgrep -f ngrok))"
else
    echo -e "${RED}✗ FAIL${NC} - ngrok is NOT running"
    echo "  Fix: Run 'nohup ngrok http 8000 > ngrok.log 2>&1 &'"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 2: Check ngrok tunnel URL
echo -e "${BLUE}[Test 2/8]${NC} Checking ngrok tunnel URL..."
if NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url' 2>/dev/null); then
    if [ -n "$NGROK_URL" ] && [ "$NGROK_URL" != "null" ]; then
        echo -e "${GREEN}✓ PASS${NC} - ngrok tunnel URL: $NGROK_URL"
    else
        echo -e "${RED}✗ FAIL${NC} - Cannot get ngrok tunnel URL"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗ FAIL${NC} - Cannot connect to ngrok API (is ngrok running?)"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 3: Check backend container
echo -e "${BLUE}[Test 3/8]${NC} Checking backend container..."
if docker ps --filter "name=backend" --format "{{.Names}}" | grep -q backend; then
    STATUS=$(docker ps --filter "name=backend" --format "{{.Status}}")
    echo -e "${GREEN}✓ PASS${NC} - Backend container: $STATUS"
else
    echo -e "${RED}✗ FAIL${NC} - Backend container is not running"
    echo "  Fix: Run 'docker-compose up -d backend'"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 4: Check backend health
echo -e "${BLUE}[Test 4/8]${NC} Checking backend health endpoint..."
if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC} - Backend is responding on localhost:8000"
else
    echo -e "${YELLOW}⚠ WARN${NC} - Backend health check failed (may not have /health endpoint)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Test 5: Check .env.production
echo -e "${BLUE}[Test 5/8]${NC} Checking .env.production configuration..."
if [ -f "frontend/.env.production" ]; then
    ENV_URL=$(grep VITE_API_PROD_URL frontend/.env.production | cut -d '=' -f2)
    if [ -n "$ENV_URL" ]; then
        echo -e "${GREEN}✓ PASS${NC} - .env.production exists"
        echo "  Configured URL: $ENV_URL"
        
        # Check if it matches current ngrok URL
        if [ "$ENV_URL" = "$NGROK_URL" ]; then
            echo -e "${GREEN}  ✓ URL matches current ngrok tunnel${NC}"
        else
            echo -e "${YELLOW}  ⚠ WARNING: URL does NOT match current ngrok tunnel!${NC}"
            echo "    .env.production: $ENV_URL"
            echo "    Current ngrok:   $NGROK_URL"
            echo "  Fix: Run './rebuild-mobile.sh \"$NGROK_URL\"'"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${RED}✗ FAIL${NC} - .env.production exists but VITE_API_PROD_URL is not set"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗ FAIL${NC} - .env.production not found"
    echo "  Fix: Run './rebuild-mobile.sh \"$NGROK_URL\"'"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 6: Check ngrok tunnel accessibility
echo -e "${BLUE}[Test 6/8]${NC} Testing ngrok tunnel accessibility..."
if [ -n "$NGROK_URL" ] && [ "$NGROK_URL" != "null" ]; then
    if curl -sf "$NGROK_URL/docs" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC} - ngrok tunnel is accessible from internet"
        echo "  Test URL: $NGROK_URL/docs"
    else
        echo -e "${RED}✗ FAIL${NC} - Cannot access ngrok tunnel from internet"
        echo "  Fix: Check ngrok logs: tail ngrok.log"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠ SKIP${NC} - No ngrok URL available to test"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Test 7: Check APK file
echo -e "${BLUE}[Test 7/8]${NC} Checking APK file..."
if [ -f "mobile-apk-new/app-debug.apk" ]; then
    APK_SIZE=$(du -h mobile-apk-new/app-debug.apk | cut -f1)
    echo -e "${GREEN}✓ PASS${NC} - APK file exists (Size: $APK_SIZE)"
    echo "  Location: $(pwd)/mobile-apk-new/app-debug.apk"
else
    echo -e "${RED}✗ FAIL${NC} - APK file not found at mobile-apk-new/app-debug.apk"
    echo "  Fix: Download from GitHub Actions or rebuild"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Test 8: Test login endpoint
echo -e "${BLUE}[Test 8/8]${NC} Testing login endpoint..."
if [ -n "$NGROK_URL" ] && [ "$NGROK_URL" != "null" ]; then
    RESPONSE=$(curl -s -X POST "$NGROK_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@ziamis.gov.zm","password":"Admin@2024"}' \
        -w "\n%{http_code}" 2>/dev/null)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Login endpoint working (HTTP 200)"
    elif [ "$HTTP_CODE" = "422" ] || [ "$HTTP_CODE" = "401" ]; then
        echo -e "${GREEN}✓ PASS${NC} - Login endpoint responding (HTTP $HTTP_CODE)"
        echo "  (422/401 is ok - means endpoint is reachable)"
    else
        echo -e "${YELLOW}⚠ WARN${NC} - Login endpoint returned HTTP $HTTP_CODE"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠ SKIP${NC} - No ngrok URL available to test"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    echo ""
    echo "Your mobile app setup is ready! 🎉"
    echo ""
    echo "Next steps:"
    echo "1. Transfer APK to phone: mobile-apk-new/app-debug.apk"
    echo "2. Install APK on phone"
    echo "3. Open app and login with:"
    echo "   Email: admin@ziamis.gov.zm"
    echo "   Password: Admin@2024"
    echo ""
    echo "4. On phone browser, first visit:"
    echo "   $NGROK_URL/docs"
    echo "   (This bypasses ngrok warning page)"
    echo ""
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS WARNING(S)${NC}"
    echo ""
    echo "Setup mostly complete but some warnings detected."
    echo "Review warnings above and fix if needed."
elif [ $ERRORS -eq 1 ]; then
    echo -e "${RED}✗ $ERRORS ERROR${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ $WARNINGS WARNING(S)${NC}"
    fi
    echo ""
    echo "Please fix the error(s) above before testing mobile app."
else
    echo -e "${RED}✗ $ERRORS ERRORS${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ $WARNINGS WARNING(S)${NC}"
    fi
    echo ""
    echo "Please fix the errors above before testing mobile app."
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Quick commands reference
if [ $ERRORS -gt 0 ]; then
    echo "Quick Fix Commands:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if ! pgrep -f ngrok > /dev/null; then
        echo "Start ngrok:"
        echo "  nohup ngrok http 8000 > ngrok.log 2>&1 &"
        echo ""
    fi
    
    if ! docker ps --filter "name=backend" --format "{{.Names}}" | grep -q backend; then
        echo "Start backend:"
        echo "  docker-compose up -d backend"
        echo ""
    fi
    
    if [ ! -f "mobile-apk-new/app-debug.apk" ]; then
        echo "Download APK:"
        echo "  gh run download \$(gh run list --workflow build-android.yml --limit 1 --json databaseId --jq '.[0].databaseId') -n ziamis-debug-apk -D ./mobile-apk-new"
        echo ""
    fi
    
    echo "Rebuild everything:"
    echo "  ./rebuild-mobile.sh \"\$NGROK_URL\""
    echo ""
fi

exit $ERRORS
