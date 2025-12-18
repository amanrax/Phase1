#!/bin/bash
# ============================================
# Deploy ECS Service
# ============================================

set -e

REGION="ap-south-1"
CLUSTER_NAME="cem-prod-v2"
SERVICE_NAME="cem-backend-service"

# Note: Update these subnet IDs and security group from your VPC
SUBNET_1="subnet-03dccdbaa3482bbcc"
SUBNET_2="subnet-0a1b5166bc9857a2f"
SECURITY_GROUP="sg-044127dbfd294fdbb"

echo "🚀 Deploying ECS service..."

# Register task definition
echo "📝 Registering ECS task definition..."
cd /workspaces/Phase1/aws-deployment
TASK_DEF_ARN=$(aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json \
  --region $REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "✅ Task definition registered: $TASK_DEF_ARN"

# Create ECS service (or update if exists)
echo "🎯 Creating ECS service..."

SERVICE_EXISTS=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $REGION \
  --query 'services[0].status' \
  --output text 2>/dev/null || echo "MISSING")

if [ "$SERVICE_EXISTS" == "MISSING" ] || [ "$SERVICE_EXISTS" == "None" ]; then
  # Create new service
  echo "Creating new service..."
  aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name $SERVICE_NAME \
    --task-definition cem-backend \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
    --region $REGION
else
  # Update existing service
  echo "Updating existing service..."
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --task-definition cem-backend \
    --force-new-deployment \
    --region $REGION
fi

echo ""
echo "✅ ECS service deployed!"
echo ""
echo "📊 Check deployment status:"
echo "   aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION"
echo ""
echo "📋 View logs:"
echo "   aws logs tail /ecs/cem-backend --follow --region $REGION"
echo ""
echo "🔍 Get task public IP:"
echo "   aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --region $REGION"
echo "   aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks <TASK_ARN> --region $REGION"

# --------------------------------------------------
# Optional: deploy frontend to S3 + invalidate CloudFront
# Requires: S3_BUCKET (bucket name) and optionally CLOUDFRONT_DIST_ID
# --------------------------------------------------
if [ -n "$S3_BUCKET" ]; then
  FRONTEND_DIR="/workspaces/Phase1/frontend/dist"
  if [ -d "$FRONTEND_DIR" ]; then
    echo "📤 Syncing frontend to s3://$S3_BUCKET/"
    aws s3 sync "$FRONTEND_DIR/" "s3://$S3_BUCKET/" --delete --acl public-read --region $REGION
    echo "✅ Frontend synced to s3://$S3_BUCKET/"

    if [ -n "$CLOUDFRONT_DIST_ID" ]; then
      echo "🚀 Creating CloudFront invalidation for distribution: $CLOUDFRONT_DIST_ID"
      INVALIDATION_ID=$(aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DIST_ID" --paths "/*" --query 'Invalidation.Id' --output text)
      echo "✅ Invalidation requested: $INVALIDATION_ID"
    else
      echo "ℹ️ CLOUDFRONT_DIST_ID not set; skipping CloudFront invalidation"
    fi
  else
    echo "⚠️ Frontend dist directory not found at $FRONTEND_DIR; ensure 05-build-and-push.sh ran successfully"
  fi
else
  echo "ℹ️ S3_BUCKET not set; skipping frontend deploy"
fi
