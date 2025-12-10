#!/bin/bash
# Test CEM on your Android phone via browser

echo "📱 CEM Mobile Testing via Browser"
echo "===================================="
echo ""

cd /workspaces/Phase1/frontend || exit 1

echo "Starting preview server..."
echo ""

npm run preview -- --host 0.0.0.0 --port 4173 &
SERVER_PID=$!

sleep 3

echo ""
echo "✅ Server running!"
echo ""
echo "📱 To test on your Android phone:"
echo ""
echo "   1. Make sure port 4173 is Public in VS Code PORTS tab"
echo "   2. Get the Codespaces URL from PORTS tab (port 4173)"
echo "   3. Open that URL on your phone's browser"
echo "   4. Add to home screen for full app experience"
echo ""
echo "   The app will work like a mobile app with:"
echo "   ✓ Offline support"  
echo "   ✓ Full screen mode"
echo "   ✓ App-like navigation"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

wait $SERVER_PID
