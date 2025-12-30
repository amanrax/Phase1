#!/bin/bash
# ============================================
# AWS Infrastructure Setup - CEM Production
# ============================================

# SAFETY GUARD: AWS infrastructure setup temporarily DISABLED
# To re-enable, remove the guard below.
echo "[SAFE-GUARD] AWS infrastructure setup disabled. Remove guard to re-enable." >&2
exit 0

set -e

REGION="ap-south-1"
ACCOUNT_ID="701708343469"
CLUSTER_NAME="cem-prod-v2"
REDIS_CLUSTER_ID="cem-redis-prod"

echo "🏗️ Setting up AWS infrastructure for CEM..."

# Create ECS Cluster
echo "📦 Creating ECS cluster: $CLUSTER_NAME"
aws ecs create-cluster \
  --cluster-name $CLUSTER_NAME \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
  --region $REGION

echo "✅ ECS cluster created"

# Create ElastiCache Redis
echo "🔴 Creating ElastiCache Redis cluster..."
echo "⚠️  Note: You need VPC security group ID. Using sg-044127dbfd294fdbb from your config"

aws elasticache create-cache-cluster \
  --cache-cluster-id $REDIS_CLUSTER_ID \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --cache-subnet-group-name default \
  --security-group-ids sg-044127dbfd294fdbb \
  --port 6379 \
  --region $REGION

echo "⏳ Waiting for Redis cluster to become available (this may take 5-10 minutes)..."
aws elasticache wait cache-cluster-available \
  --cache-cluster-id $REDIS_CLUSTER_ID \
  --region $REGION

# Get Redis endpoint
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id $REDIS_CLUSTER_ID \
  --show-cache-node-info \
  --region $REGION \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
  --output text)

echo "✅ Redis cluster created at: $REDIS_ENDPOINT:6379"

# Create CloudWatch log group
echo "📊 Creating CloudWatch log group..."
aws logs create-log-group \
  --log-group-name /ecs/cem-backend \
  --region $REGION

aws logs put-retention-policy \
  --log-group-name /ecs/cem-backend \
  --retention-in-days 30 \
  --region $REGION

echo "✅ CloudWatch log group created"

# Create ECR repository
echo "🐳 Creating ECR repository..."
aws ecr create-repository \
  --repository-name cem-backend \
  --region $REGION \
  --image-scanning-configuration scanOnPush=true

echo "✅ ECR repository created"

echo ""
echo "🎉 Infrastructure setup completed!"
echo ""
echo "📝 Resource Summary:"
echo "  - ECS Cluster: $CLUSTER_NAME"
echo "  - Redis Endpoint: $REDIS_ENDPOINT:6379"
echo "  - ECR Repository: $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/cem-backend"
echo "  - CloudWatch Logs: /ecs/cem-backend"
echo ""
echo "📌 Save this Redis endpoint: redis://$REDIS_ENDPOINT:6379/0"
echo ""
echo "Next: Run 03-create-secrets.sh with your environment values"
