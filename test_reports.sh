#!/bin/bash

# Test Reports Endpoints
# This script tests all the reports endpoints with admin authentication

BASE_URL="http://localhost:8000/api"

echo "🔐 Logging in as Admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ziamis.gov.zm",
    "password": "Admin@2024"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "$LOGIN_RESPONSE" | jq
  exit 1
fi

echo "✅ Login successful! Token: ${TOKEN:0:20}..."
echo ""

echo "📊 Testing Reports Endpoints..."
echo "================================"
echo ""

# Test 1: Dashboard Summary
echo "1️⃣ Testing /reports/dashboard..."
DASHBOARD=$(curl -s -X GET "$BASE_URL/reports/dashboard" \
  -H "Authorization: Bearer $TOKEN")
echo "$DASHBOARD" | jq
echo ""

# Test 2: Farmers by Region
echo "2️⃣ Testing /reports/farmers-by-region..."
REGIONS=$(curl -s -X GET "$BASE_URL/reports/farmers-by-region" \
  -H "Authorization: Bearer $TOKEN")
echo "$REGIONS" | jq '.regions | length' | xargs -I {} echo "Found {} regions"
echo "$REGIONS" | jq '.regions[:3]'
echo ""

# Test 3: Operator Performance
echo "3️⃣ Testing /reports/operator-performance..."
OPERATORS=$(curl -s -X GET "$BASE_URL/reports/operator-performance" \
  -H "Authorization: Bearer $TOKEN")
echo "$OPERATORS" | jq '.operators | length' | xargs -I {} echo "Found {} operators"
echo "$OPERATORS" | jq '.operators[:3]'
echo ""

# Test 4: Activity Trends
echo "4️⃣ Testing /reports/activity-trends..."
TRENDS=$(curl -s -X GET "$BASE_URL/reports/activity-trends" \
  -H "Authorization: Bearer $TOKEN")
echo "$TRENDS" | jq '.trends | length' | xargs -I {} echo "Found {} days of data"
echo "$TRENDS" | jq '.trends[-5:]'
echo ""

echo "✅ All reports tests completed!"
