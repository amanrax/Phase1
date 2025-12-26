#!/bin/bash
set -euo pipefail

# Usage: ./fetch-secrets.sh <secret-name> <output-env-path>
# Example: ./fetch-secrets.sh cem-backend-production /home/ubuntu/Phase1/.env

SECRET_NAME=${1:-cem-backend-production}
OUTPUT_PATH=${2:-./.env}
REGION=${AWS_REGION:-ap-south-1}

if ! command -v aws >/dev/null 2>&1; then
  echo "aws cli not found; install and configure AWS CLI on the EC2 instance"
  exit 1
fi

SECRET_JSON=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --region "$REGION" --query SecretString --output text)
if [ -z "$SECRET_JSON" ]; then
  echo "Failed to retrieve secret $SECRET_NAME"
  exit 1
fi

# Create .env file from secret JSON
jq -r 'to_entries|map("\(.key)=\(.value)")|.[]' <<< "$SECRET_JSON" > "$OUTPUT_PATH"
chmod 600 "$OUTPUT_PATH"

echo "Wrote secrets to $OUTPUT_PATH"
