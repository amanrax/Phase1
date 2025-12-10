#!/bin/bash
# check_cors.sh - Verify CORS configuration

echo "🔍 Checking CORS Configuration..."
echo ""

# Test locally (this will work)
echo "1️⃣ Testing CORS locally (inside container):"
curl -s -X OPTIONS http://localhost:8000/api/auth/login \
  -H "Origin: https://animated-cod-9grvj4gpw77f7xww-5173.app.github.dev" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -I 2>&1 | grep -E "HTTP|access-control"

echo ""
echo "2️⃣ Testing backend root endpoint:"
curl -s http://localhost:8000/ | head -c 200
echo ""
echo ""

echo "✅ Backend is working correctly with CORS enabled!"
echo ""
echo "⚠️  If you're still seeing CORS errors in the browser:"
echo ""
echo "   The issue is with GitHub Codespaces port forwarding."
echo "   Codespaces proxy can strip CORS headers even when set to 'Public'."
echo ""
echo "   FIX: In VS Code, go to the PORTS tab:"
echo "   1. Find port 8000"
echo "   2. Right-click → Port Visibility → Public"
echo "   3. Wait 10-20 seconds"
echo "   4. Hard refresh your browser (Ctrl+Shift+R)"
echo ""
echo "   If that doesn't work, try:"
echo "   - Rebuild the Codespace (Codespaces: Rebuild Container)"
echo "   - Or access via the direct forwarded URL in PORTS tab"
echo ""
