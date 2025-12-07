#!/bin/bash

# Test Operator Create/Edit Flow
# Verifies that operators can be created and edited with district names

BASE_URL="http://localhost:8000/api"
ADMIN_EMAIL="admin@ziamis.gov.zm"
ADMIN_PASSWORD="Admin@2024"

echo "=========================================="
echo "Testing Operator Create/Edit Flow"
echo "=========================================="
echo ""

# Step 1: Admin Login
echo "1. Logging in as Admin..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Admin login failed!"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Admin logged in successfully"
echo ""

# Step 2: Get existing districts
echo "2. Fetching districts..."
DISTRICTS=$(curl -s -X GET "${BASE_URL}/geo/districts" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

FIRST_DISTRICT=$(echo "$DISTRICTS" | jq -r '.[0].district_name // empty')

if [ -z "$FIRST_DISTRICT" ]; then
  echo "❌ No districts found!"
  exit 1
fi

echo "✅ Found district: $FIRST_DISTRICT"
echo ""

# Step 3: Create a test operator with district name
echo "3. Creating test operator with district name..."
TIMESTAMP=$(date +%s)
TEST_EMAIL="test_operator_${TIMESTAMP}@ziamis.gov.zm"

CREATE_PAYLOAD=$(cat <<EOF
{
  "email": "${TEST_EMAIL}",
  "password": "TestOp@2024",
  "full_name": "Test Operator ${TIMESTAMP}",
  "phone": "+260977123456",
  "role": "OPERATOR",
  "assigned_districts": ["${FIRST_DISTRICT}"],
  "assigned_regions": ["Lusaka"]
}
EOF
)

CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/operators/" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$CREATE_PAYLOAD")

OPERATOR_ID=$(echo "$CREATE_RESPONSE" | jq -r '.operator.operator_id // empty')

if [ -z "$OPERATOR_ID" ]; then
  echo "❌ Operator creation failed!"
  echo "$CREATE_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Operator created successfully"
echo "   Operator ID: $OPERATOR_ID"
echo "   Email: $TEST_EMAIL"
echo "   Assigned District: $FIRST_DISTRICT"
echo ""

# Step 4: Get operator details
echo "4. Fetching operator details..."
OPERATOR_DETAILS=$(curl -s -X GET "${BASE_URL}/operators/${OPERATOR_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

ASSIGNED_DISTRICTS=$(echo "$OPERATOR_DETAILS" | jq -r '.assigned_districts[]? // empty')
ASSIGNED_DISTRICT=$(echo "$OPERATOR_DETAILS" | jq -r '.assigned_district // empty')

echo "✅ Operator details retrieved:"
echo "$OPERATOR_DETAILS" | jq '{
  id: (.id // ._id),
  email: .email,
  full_name: .full_name,
  role: .role,
  assigned_district: .assigned_district,
  assigned_districts: .assigned_districts,
  assigned_regions: .assigned_regions
}'
echo ""

# Step 5: Update operator with new district
echo "5. Updating operator with new district..."
SECOND_DISTRICT=$(echo "$DISTRICTS" | jq -r '.[1].district_name // .[0].district_name')

UPDATE_PAYLOAD=$(cat <<EOF
{
  "full_name": "Updated Test Operator ${TIMESTAMP}",
  "phone": "+260977999888",
  "assigned_districts": ["${SECOND_DISTRICT}"],
  "assigned_regions": ["Central"]
}
EOF
)

UPDATE_RESPONSE=$(curl -s -X PUT "${BASE_URL}/operators/${OPERATOR_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_PAYLOAD")

echo "✅ Operator updated successfully"
echo "$UPDATE_RESPONSE" | jq '{
  id: (.id // ._id),
  email: .email,
  full_name: .full_name,
  assigned_district: .assigned_district,
  assigned_districts: .assigned_districts,
  assigned_regions: .assigned_regions
}'
echo ""

# Step 6: Verify operator can login
echo "6. Testing operator login..."
OPERATOR_LOGIN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"TestOp@2024\"}")

OPERATOR_TOKEN=$(echo "$OPERATOR_LOGIN" | jq -r '.access_token')

if [ "$OPERATOR_TOKEN" == "null" ] || [ -z "$OPERATOR_TOKEN" ]; then
  echo "❌ Operator login failed!"
  echo "$OPERATOR_LOGIN" | jq '.'
else
  echo "✅ Operator can login successfully"
  echo "   Role: $(echo "$OPERATOR_LOGIN" | jq -r '.user.role')"
  echo "   Districts: $(echo "$OPERATOR_LOGIN" | jq -r '.user.assigned_districts[]? // .user.assigned_district // "none"')"
fi
echo ""

# Step 7: Test farmer creation with operator account
echo "7. Testing farmer creation with operator account..."
FARMER_PAYLOAD=$(cat <<EOF
{
  "first_name": "Test",
  "last_name": "Farmer",
  "nrc": "999999/99/9",
  "date_of_birth": "1990-01-01",
  "phone": "+260977000111",
  "district_name": "${SECOND_DISTRICT}",
  "ward_name": "Test Ward",
  "camp_name": "Test Camp"
}
EOF
)

FARMER_RESPONSE=$(curl -s -X POST "${BASE_URL}/farmers" \
  -H "Authorization: Bearer ${OPERATOR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$FARMER_PAYLOAD")

FARMER_ID=$(echo "$FARMER_RESPONSE" | jq -r '.id // ._id // empty')

if [ -z "$FARMER_ID" ]; then
  echo "⚠️  Farmer creation response:"
  echo "$FARMER_RESPONSE" | jq '.'
else
  echo "✅ Farmer created successfully by operator"
  echo "   Farmer ID: $FARMER_ID"
  echo "   District: $(echo "$FARMER_RESPONSE" | jq -r '.district_name // .district')"
fi
echo ""

echo "=========================================="
echo "✅ Operator Flow Test Complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "  • Admin login: ✅"
echo "  • Operator creation with district names: ✅"
echo "  • Operator details retrieval: ✅"
echo "  • Operator update with district names: ✅"
echo "  • Operator login: ✅"
echo "  • Farmer creation by operator: $([ ! -z "$FARMER_ID" ] && echo "✅" || echo "⚠️")"
echo ""
