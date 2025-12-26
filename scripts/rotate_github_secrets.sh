#!/usr/bin/env bash
set -euo pipefail

# rotate_github_secrets.sh
# Template script to update GitHub repository secrets using `gh` CLI.
# Requires: GitHub CLI authenticated with an account that has repo admin.
# Usage: GITHUB_REPO=amanrax/Phase1 GH_TOKEN=... ./scripts/rotate_github_secrets.sh

GITHUB_REPO=${GITHUB_REPO:-amanrax/Phase1}

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI not installed. Install from https://github.com/cli/cli" >&2
  exit 2
fi

echo "Checking gh auth status..."
if ! gh auth status >/dev/null 2>&1; then
  echo "ERROR: gh is not authenticated. Run 'gh auth login' and retry." >&2
  exit 3
fi

echo "This script will help you update the following secrets in the repo:"
echo " - AWS_ACCESS_KEY_ID"
echo " - AWS_SECRET_ACCESS_KEY"
echo " - OTHER_SECRETS (DB_URI, JWT_SECRET, etc)"

read -p "Proceed to update GitHub repo secrets for ${GITHUB_REPO}? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted by user." && exit 0
fi

echo "Reading new AWS credentials from environment variables..."
if [[ -z "${NEW_AWS_ACCESS_KEY_ID:-}" || -z "${NEW_AWS_SECRET_ACCESS_KEY:-}" ]]; then
  echo "ERROR: set NEW_AWS_ACCESS_KEY_ID and NEW_AWS_SECRET_ACCESS_KEY in env before running." >&2
  exit 4
fi

echo "Updating AWS secrets..."
echo -n "$NEW_AWS_ACCESS_KEY_ID" | gh secret set AWS_ACCESS_KEY_ID --repo "$GITHUB_REPO"
echo -n "$NEW_AWS_SECRET_ACCESS_KEY" | gh secret set AWS_SECRET_ACCESS_KEY --repo "$GITHUB_REPO"

echo "If you have additional secrets (e.g., DB_URI, JWT_SECRET), set them via NEW_DB_URI, NEW_JWT_SECRET env vars and run gh secret set accordingly."

echo "Done. Verify in GitHub > Settings > Secrets & variables > Actions for ${GITHUB_REPO}."
