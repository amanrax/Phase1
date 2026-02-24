#!/bin/bash
# Create Android Keystore for Release Signing
# This script helps generate a keystore for signing release APKs

set -e

echo "🔐 Android Keystore Generator"
echo "============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default values
KEYSTORE_DIR="./android/app"
KEYSTORE_FILE="release-key.keystore"
KEY_ALIAS="cem-farmer-key"

echo -e "${YELLOW}This script will create a keystore for signing Android release builds.${NC}"
echo ""
echo "Default settings:"
echo "  Location: $KEYSTORE_DIR/$KEYSTORE_FILE"
echo "  Alias: $KEY_ALIAS"
echo ""

read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Create keystore directory if it doesn't exist
mkdir -p "$KEYSTORE_DIR"

# Generate keystore
echo ""
echo "📝 Please provide the following information:"
echo "   (This information will be embedded in the certificate)"
echo ""

keytool -genkeypair -v \
    -storetype PKCS12 \
    -keystore "$KEYSTORE_DIR/$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Keystore created successfully!${NC}"
    echo ""
    echo "📁 Location: $KEYSTORE_DIR/$KEYSTORE_FILE"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Keep this file and passwords SECURE!${NC}"
    echo "   - Never commit to git"
    echo "   - Store in a secure location"
    echo "   - Backup securely"
    echo ""
    echo "📝 To use this keystore for builds, set these environment variables:"
    echo ""
    echo "   export RELEASE_KEYSTORE_FILE=\"\$(pwd)/$KEYSTORE_DIR/$KEYSTORE_FILE\""
    echo "   export RELEASE_KEYSTORE_PASSWORD=\"your-keystore-password\""
    echo "   export RELEASE_KEY_ALIAS=\"$KEY_ALIAS\""
    echo "   export RELEASE_KEY_PASSWORD=\"your-key-password\""
    echo ""
    echo "Or add to ~/.bashrc or ~/.zshrc for permanent setup"
    echo ""
    echo "Then build release APK with:"
    echo "   npm run build:android:release"
else
    echo -e "${RED}❌ Failed to create keystore${NC}"
    exit 1
fi
