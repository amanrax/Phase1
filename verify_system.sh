#!/bin/bash
# Comprehensive system verification script
# Tests all critical functionality without changing implementation

BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
PASSED=0
FAILED=0

echo "🧪 ZIAMIS System Verification"
echo "=============================="
echo "Backend URL: $BACKEND_URL"
echo ""

# Helper function for tests
test_endpoint() {
    local name="$1"
    local result="$2"
    
    if [ "$result" = "PASS" ]; then
        echo "✅ $name"
        PASSED=$((PASSED + 1))
    else
        echo "❌ $name: $result"
        FAILED=$((FAILED + 1))
    fi
}

# 1. Test Admin Login with Role Validation
echo "1️⃣  Authentication & Role Validation"
echo "-----------------------------------"

ADMIN_LOGIN=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ziamis.gov.zm","password":"Admin@2024","role":"admin"}')

if echo "$ADMIN_LOGIN" | jq -e '.access_token' > /dev/null 2>&1; then
    test_endpoint "Admin login with correct role" "PASS"
    ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.access_token')
else
    test_endpoint "Admin login with correct role" "FAIL: $(echo $ADMIN_LOGIN | jq -r '.detail')"
fi

# Test role mismatch
ROLE_MISMATCH=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ziamis.gov.zm","password":"Admin@2024","role":"operator"}')

if echo "$ROLE_MISMATCH" | jq -r '.detail' | grep -q "Invalid credentials for operator"; then
    test_endpoint "Role mismatch validation (admin creds + operator role)" "PASS"
else
    test_endpoint "Role mismatch validation" "FAIL"
fi

# Test operator login
OP_LOGIN=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"operator1@ziamis.gov.zm","password":"Operator1@2024","role":"operator"}')

if echo "$OP_LOGIN" | jq -e '.access_token' > /dev/null 2>&1; then
    test_endpoint "Operator login with correct role" "PASS"
    OP_TOKEN=$(echo "$OP_LOGIN" | jq -r '.access_token')
else
    test_endpoint "Operator login" "FAIL"
fi

# Test farmer NRC login
FARMER_LOGIN=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"315990/08/2","password":"1961-02-02","role":"farmer"}')

if echo "$FARMER_LOGIN" | jq -e '.access_token' > /dev/null 2>&1; then
    test_endpoint "Farmer login with NRC + DOB" "PASS"
else
    test_endpoint "Farmer NRC login" "FAIL"
fi

echo ""

# 2. Test Farmer List Endpoint
echo "2️⃣  Farmer Management"
echo "-------------------"

if [ -n "$ADMIN_TOKEN" ]; then
    FARMERS=$(curl -s -X GET "$BACKEND_URL/api/farmers/?limit=5" \
      -H "Authorization: Bearer $ADMIN_TOKEN")
    
    if echo "$FARMERS" | jq -e 'type == "array"' > /dev/null 2>&1; then
        COUNT=$(echo "$FARMERS" | jq 'length')
        test_endpoint "Admin can list farmers (got $COUNT)" "PASS"
    else
        test_endpoint "Admin list farmers" "FAIL"
    fi
fi

echo ""

# 3. Test Geo Endpoints
echo "3️⃣  Geography Data & Dropdowns"
echo "----------------------------"

PROVINCES=$(curl -s -X GET "$BACKEND_URL/api/geo/provinces")
if echo "$PROVINCES" | jq -e 'type == "array"' > /dev/null 2>&1; then
    PROV_COUNT=$(echo "$PROVINCES" | jq 'length')
    test_endpoint "Get provinces list ($PROV_COUNT provinces)" "PASS"
else
    test_endpoint "Get provinces" "FAIL"
fi

DISTRICTS=$(curl -s -X GET "$BACKEND_URL/api/geo/districts?province=Luapula")
if echo "$DISTRICTS" | jq -e 'type == "array"' > /dev/null 2>&1; then
    DIST_COUNT=$(echo "$DISTRICTS" | jq 'length')
    test_endpoint "Cascading: Get districts by province ($DIST_COUNT districts)" "PASS"
else
    test_endpoint "Cascading districts" "FAIL"
fi

echo ""

# 4. Test Custom Geo Creation
echo "4️⃣  Custom Geo (Others Option)"
echo "----------------------------"

if [ -n "$ADMIN_TOKEN" ]; then
    TIMESTAMP=$(date +%s)
    CUSTOM_PROV=$(curl -s -X POST "$BACKEND_URL/api/geo/custom/provinces" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"province_name\":\"Test Province $TIMESTAMP\"}")
    
    if echo "$CUSTOM_PROV" | jq -e '.province_code' > /dev/null 2>&1; then
        CODE=$(echo "$CUSTOM_PROV" | jq -r '.province_code')
        test_endpoint "Create custom province (code: $CODE)" "PASS"
    else
        test_endpoint "Create custom province" "FAIL: $(echo $CUSTOM_PROV | jq -r '.detail // .message')"
    fi
fi

echo ""

# 5. Test Session Timeout
echo "5️⃣  Frontend Features (Manual Verification Required)"
echo "---------------------------------------------------"
echo "⚠️  Session timeout (30 min with 25 min warning) - MANUAL TEST"
echo "⚠️  Toast notifications (success/error/warning/info) - MANUAL TEST"
echo "⚠️  Form validation and error handling - MANUAL TEST"
echo "⚠️  Dropdown prefilling in edit forms - MANUAL TEST"
echo "⚠️  Document upload status tracking - MANUAL TEST"
echo "⚠️  ID card generation and download - MANUAL TEST"

echo ""
echo "=============================="
echo "📊 Test Results Summary"
echo "=============================="
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 All automated tests passed!"
    echo "📋 Complete manual testing checklist in TESTING.md"
    exit 0
else
    echo "⚠️  Some tests failed. Check output above."
    exit 1
fi
