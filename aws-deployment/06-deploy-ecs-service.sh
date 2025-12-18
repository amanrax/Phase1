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
