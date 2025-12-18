#!/bin/bash
# ============================================
# Get ECS Task Public IP
# ============================================

set -e

REGION="ap-south-1"
CLUSTER_NAME="cem-prod-v2"
SERVICE_NAME="cem-backend-service"

echo "🔍 Getting public IP for ECS task..."

# Get task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --region $REGION \
  --query 'taskArns[0]' \
  --output text)

if [ "$TASK_ARN" == "None" ] || [ -z "$TASK_ARN" ]; then
  echo "❌ No tasks running"
  exit 1
fi

echo "Task ARN: $TASK_ARN"

# Get ENI ID
ENI_ID=$(aws ecs describe-tasks \
  --cluster $CLUSTER_NAME \
  --tasks $TASK_ARN \
  --region $REGION \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text)

echo "ENI ID: $ENI_ID"

# Get public IP
PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids $ENI_ID \
  --region $REGION \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text)

echo ""
echo "✅ Public IP: $PUBLIC_IP"
echo ""
echo "Test API:"
echo "  curl http://$PUBLIC_IP:8000/api/health"
echo ""
echo "Frontend URL:"
echo "  http://$PUBLIC_IP:8000"
