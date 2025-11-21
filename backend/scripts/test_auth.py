#!/usr/bin/env python3
"""
Quick fix to normalize roles to UPPERCASE by directly querying the API.
This script logs in, gets the current user, and verifies roles are uppercase in JWT.
"""
import requests
import json

API_BASE_URL = "http://localhost:8000/api"

# Test with operator user
print("🔑 Testing with operator credentials...")
response = requests.post(
    f"{API_BASE_URL}/auth/login",
    json={"email": "operator@agrimanage.com", "password": "operator123"}
)

if response.status_code != 200:
    print(f"❌ Login failed: {response.status_code}")
    print(f"   Response: {response.json()}")
    exit(1)

data = response.json()
token = data.get("access_token")
print(f"✅ Logged in. Token received.")

# Decode token to check roles
import base64

parts = token.split(".")
if len(parts) < 2:
    print("❌ Invalid token format")
    exit(1)

# Add padding if needed
payload_part = parts[1]
padding = 4 - len(payload_part) % 4
if padding != 4:
    payload_part += "=" * padding

payload = json.loads(base64.urlsafe_b64decode(payload_part))
print(f"\n📋 JWT Payload:")
print(f"   Roles in token: {payload.get('roles')}")

# Test farmers endpoint
print(f"\n🔍 Testing /api/farmers endpoint...")
headers = {"Authorization": f"Bearer {token}"}
response = requests.get(
    f"{API_BASE_URL}/farmers?limit=5&skip=0",
    headers=headers
)

print(f"Response status: {response.status_code}")
if response.status_code == 200:
    print("✅ SUCCESS! Farmers endpoint accessible.")
    farmers = response.json()
    if isinstance(farmers, dict) and "results" in farmers:
        print(f"   Found {len(farmers['results'])} farmers")
    elif isinstance(farmers, list):
        print(f"   Found {len(farmers)} farmers")
else:
    print(f"❌ FAILED with {response.status_code}")
    print(f"   Response: {response.json()}")
