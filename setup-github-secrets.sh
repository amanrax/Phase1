#!/bin/bash

echo "🔐 Setting up GitHub Secrets for Release APK..."
echo ""

# Read the base64 keystore
KEYSTORE_BASE64=$(cat frontend/android/cem-release-key.keystore.base64)

# Set secrets using gh CLI
gh secret set RELEASE_KEYSTORE_BASE64 --body "$KEYSTORE_BASE64"
gh secret set RELEASE_KEYSTORE_PASSWORD --body "cemfarmer2026"
gh secret set RELEASE_KEY_ALIAS --body "cem-key"
gh secret set RELEASE_KEY_PASSWORD --body "cemfarmer2026"

echo ""
echo "✅ All secrets configured!"
echo ""
echo "You can verify at:"
echo "https://github.com/amanrax/Phase1/settings/secrets/actions"
