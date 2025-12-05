#!/bin/bash

# Lottie Rocket Animation Test Script
# Verifies the animation integration on login page

echo "🚀 Lottie Rocket Animation Integration Test"
echo "==========================================="
echo ""

# Check if animation JSON exists
if [ -f "/workspaces/Phase1/frontend/public/rocket-launch.json" ]; then
    echo "✅ Animation JSON file exists: /frontend/public/rocket-launch.json"
    FILE_SIZE=$(stat -f%z "/workspaces/Phase1/frontend/public/rocket-launch.json" 2>/dev/null || stat -c%s "/workspaces/Phase1/frontend/public/rocket-launch.json" 2>/dev/null)
    echo "   Size: $FILE_SIZE bytes"
else
    echo "❌ Animation JSON not found"
    exit 1
fi

# Check if RocketAnimation component exists
if [ -f "/workspaces/Phase1/frontend/src/components/RocketAnimation.tsx" ]; then
    echo "✅ RocketAnimation component exists"
    COMPONENT_LINES=$(wc -l < "/workspaces/Phase1/frontend/src/components/RocketAnimation.tsx")
    echo "   Lines: $COMPONENT_LINES"
else
    echo "❌ RocketAnimation component not found"
    exit 1
fi

# Check if Login page imports RocketAnimation
if grep -q "import.*RocketAnimation" "/workspaces/Phase1/frontend/src/pages/Login.tsx"; then
    echo "✅ Login.tsx imports RocketAnimation"
else
    echo "❌ Login.tsx does not import RocketAnimation"
    exit 1
fi

# Check if RocketAnimation is used in Login JSX
if grep -q "<RocketAnimation" "/workspaces/Phase1/frontend/src/pages/Login.tsx"; then
    echo "✅ RocketAnimation component is used in Login JSX"
else
    echo "❌ RocketAnimation component not found in Login JSX"
    exit 1
fi

# Check if lottie-react is installed
if grep -q "lottie-react" "/workspaces/Phase1/frontend/package.json"; then
    echo "✅ lottie-react is in package.json"
else
    echo "❌ lottie-react not found in package.json"
    exit 1
fi

# Check if node_modules/lottie-react exists
if [ -d "/workspaces/Phase1/frontend/node_modules/lottie-react" ]; then
    echo "✅ lottie-react is installed in node_modules"
else
    echo "⚠️  lottie-react not in node_modules (may need npm install)"
fi

echo ""
echo "==========================================="
echo "✅ All integration tests PASSED!"
echo ""
echo "To test the animation:"
echo "1. Open browser at http://localhost:5173"
echo "2. Enter test credentials (admin@test.com / password)"
echo "3. Click Login button"
echo "4. Watch the rocket launch animation!"
echo ""
echo "Animation behavior:"
echo "  - On successful login: Plays 2-second rocket launch"
echo "  - On login failure: Shows error, animation resets"
echo "  - Responsive: Works on mobile and desktop"
echo ""
