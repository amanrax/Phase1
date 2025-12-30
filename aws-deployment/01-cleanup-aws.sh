#!/bin/bash
# ============================================
# AWS Cleanup Script - Remove Failed Deployment
# ============================================

set -e

REGION="ap-south-1"
ACCOUNT_ID="701708343469"

echo "🧹 Starting AWS cleanup for CEM project..."

# Stop and delete ECS services
echo "📦 Deleting ECS services..."
aws ecs delete-service \
  --cluster cem-prod \
  --service ziamis-backend-service \
  --force \
  --region $REGION 2>/dev/null || echo "Service not found, skipping..."

# Wait for service deletion
echo "⏳ Waiting for service deletion..."
sleep 10

# Delete ECS cluster
echo "🗑️ Deleting ECS cluster..."
aws ecs delete-cluster \
  --cluster cem-prod \
  --region $REGION 2>/dev/null || echo "Cluster not found, skipping..."

# Deregister old task definitions
echo "📝 Deregistering task definitions..."
TASK_ARNS=$(aws ecs list-task-definitions \
  --family-prefix ziamis-backend \
  --region $REGION \
  --query 'taskDefinitionArns[]' \
  --output text 2>/dev/null || echo "")

if [ ! -z "$TASK_ARNS" ]; then
  for TASK_ARN in $TASK_ARNS; do
    echo "  Deregistering: $TASK_ARN"
    aws ecs deregister-task-definition \
      --task-definition $TASK_ARN \
      --region $REGION 2>/dev/null || true
  done
else
  echo "  No task definitions found"
fi

# Delete secrets (list first)
echo "🔐 Listing and deleting secrets..."
SECRET_ARNS=$(aws secretsmanager list-secrets \
  --region $REGION \
  --query "SecretList[?starts_with(Name, 'ziamis/') || starts_with(Name, 'cem/')].ARN" \
  --output text 2>/dev/null || echo "")

if [ ! -z "$SECRET_ARNS" ]; then
  for SECRET_ARN in $SECRET_ARNS; do
    SECRET_NAME=$(echo $SECRET_ARN | rev | cut -d'/' -f1 | rev | cut -d'-' -f1)
    echo "  Deleting secret: $SECRET_NAME"
    aws secretsmanager delete-secret \
      --secret-id $SECRET_ARN \
      --force-delete-without-recovery \
      --region $REGION 2>/dev/null || true
  done
else
  echo "  No secrets found"
fi

# Delete ECR repositories
echo "🐳 Deleting ECR repositories..."
aws ecr delete-repository \
  --repository-name cem-backend \
  --force \
  --region $REGION 2>/dev/null || echo "ECR repo not found, skipping..."

# Delete CloudWatch log groups
echo "📊 Deleting CloudWatch log groups..."
aws logs delete-log-group \
  --log-group-name /ecs/cem-backend \
  --region $REGION 2>/dev/null || echo "Log group not found, skipping..."

aws logs delete-log-group \
  --log-group-name /ecs/ziamis-backend \
  --region $REGION 2>/dev/null || echo "Log group not found, skipping..."

# Delete ElastiCache clusters (if any)
echo "🔴 Checking ElastiCache clusters..."
REDIS_CLUSTERS=$(aws elasticache describe-cache-clusters \
  --region $REGION \
  --query "CacheClusters[?starts_with(CacheClusterId, 'cem-') || starts_with(CacheClusterId, 'ziamis-')].CacheClusterId" \
  --output text 2>/dev/null || echo "")

if [ ! -z "$REDIS_CLUSTERS" ]; then
  for CLUSTER_ID in $REDIS_CLUSTERS; do
    echo "  Deleting Redis cluster: $CLUSTER_ID"
    aws elasticache delete-cache-cluster \
      --cache-cluster-id $CLUSTER_ID \
      --region $REGION 2>/dev/null || true
  done
else
  echo "  No Redis clusters found"
fi

echo ""
echo "✅ AWS cleanup completed!"
echo ""
echo "📌 Next steps:"
echo "   1. Review any remaining resources in AWS Console"
echo "   2. Run 02-setup-aws-infrastructure.sh to create new deployment"
