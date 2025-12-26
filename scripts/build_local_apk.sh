#!/usr/bin/env bash
set -euo pipefail

# build_local_apk.sh
# Prepares a local production web build configured to talk to a local backend
# and runs the Capacitor sync steps. You still need Android Studio / Android SDK
# to open the project and build the actual APK.

# Usage examples:
# For Android emulator:
#   ./scripts/build_local_apk.sh --mobile-url http://10.0.2.2:8000
# For physical device (replace with your machine IP):
#   ./scripts/build_local_apk.sh --mobile-url http://192.168.1.100:8000

MOBILE_URL="http://10.0.2.2:8000"

while [[ $# -gt 0 ]]; do
  case $1 in
    --mobile-url)
      MOBILE_URL="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

echo "Setting VITE_MOBILE_API_URL to $MOBILE_URL for production build"
cd frontend

export VITE_MOBILE_API_URL="$MOBILE_URL"
export VITE_API_BASE_URL="http://localhost:8000"

echo "Installing npm dependencies..."
npm install

echo "Building production web assets..."
npm run build

echo "Initializing/syncing Capacitor..."
npx cap sync

echo "Done. Open Android project in Android Studio to build APK:"
echo "  npx cap open android"
