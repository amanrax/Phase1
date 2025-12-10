#!/bin/bash
# Quick Mobile Preview Setup for CEM

echo "📱 CEM Mobile Preview Setup"
echo "==========================="
echo ""

cd frontend || exit 1

echo "1️⃣ Installing dependencies (this may take 2-3 minutes)..."
npm install --legacy-peer-deps

echo ""
echo "2️⃣ Starting development server..."
npm run dev &
DEV_PID=$!

echo ""
echo "⏳ Waiting for server to start..."
sleep 5

echo ""
echo "✅ CEM is running!"
echo ""
echo "🌐 Open in browser:"
echo "   - Check the PORTS tab in VS Code"
echo "   - Find port 5173 and click the globe icon"
echo ""
echo "📱 To test mobile view:"
echo "   1. Open in browser"
echo "   2. Press F12 (Developer Tools)"
echo "   3. Click device toolbar icon (phone icon) or Ctrl+Shift+M"
echo "   4. Select a mobile device (iPhone 12, Pixel 5, etc.)"
echo ""
echo "🧪 Test these on mobile view:"
echo "   ✓ Login page responsiveness"
echo "   ✓ Navigation sidebar (should collapse on mobile)"
echo "   ✓ Forms and buttons (touch-friendly?)"
echo "   ✓ Tables (horizontal scroll?)"
echo "   ✓ Dashboard cards layout"
echo ""
echo "Press Ctrl+C to stop the server when done."
echo ""

# Wait for user to stop
wait $DEV_PID
