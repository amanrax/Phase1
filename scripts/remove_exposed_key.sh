#!/usr/bin/env bash
set -euo pipefail

# remove_exposed_key.sh
# Deactivate and delete a known exposed access key. Run locally with admin credentials.
# Usage: AWS_PROFILE=ci-admin ./scripts/remove_exposed_key.sh

EXPOSED_KEY="AKIAQODEGRLKKFZWVK7L"
ADMIN_USER="Admin"

echo "Verifying AWS credentials..."
if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "ERROR: AWS credentials not valid in this environment. Configure AWS CLI with an admin profile and try again." >&2
  exit 2
fi

echo "Deactivating key $EXPOSED_KEY for user $ADMIN_USER..."
aws iam update-access-key --user-name "$ADMIN_USER" --access-key-id "$EXPOSED_KEY" --status Inactive

echo "Deleting key $EXPOSED_KEY for user $ADMIN_USER..."
aws iam delete-access-key --user-name "$ADMIN_USER" --access-key-id "$EXPOSED_KEY"

echo "Verifying deletion..."
if aws iam list-access-keys --user-name "$ADMIN_USER" --output text | grep -q "$EXPOSED_KEY"; then
  echo "WARNING: key still present" >&2
  exit 3
fi

echo "Exposed key deleted successfully."
echo "Next: remove this key from any CI/GitHub secrets and rotate any tokens that used it."
