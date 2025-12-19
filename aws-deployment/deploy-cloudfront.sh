#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <stack-name> <alb-dns> [--profile PROFILE]"
  echo "Example: $0 cem-cloudfront my-alb-123456.us-east-1.elb.amazonaws.com"
  exit 1
fi

STACK_NAME="$1"
ALB_DNS="$2"
PROFILE_OPT=""
if [ "${3:-}" = "--profile" ]; then
  PROFILE_OPT="--profile ${4:-}" 
fi

TEMPLATE_FILE="$(dirname "$0")/cloudfront-distribution.yml"

echo "Deploying CloudFront stack '$STACK_NAME' with origin: $ALB_DNS"

aws cloudformation deploy \
  --template-file "$TEMPLATE_FILE" \
  --stack-name "$STACK_NAME" \
  --capabilities CAPABILITY_NAMED_IAM CAPABILITY_IAM \
  --parameter-overrides OriginDomainName="$ALB_DNS" \
  $PROFILE_OPT

echo "Deployment complete. To get the distribution domain run:"
echo "  aws cloudformation describe-stacks --stack-name $STACK_NAME --query 'Stacks[0].Outputs' --output table"
