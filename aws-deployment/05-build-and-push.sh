#!/bin/bash
# ============================================
# Build and Push Docker Image to ECR
# ============================================

set -e

REGION="ap-south-1"
ACCOUNT_ID="701708343469"
ECR_REPO="cem-backend"
IMAGE_TAG="latest"

echo "🐳 Building and pushing Docker image..."

# Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build Docker image
echo "🔨 Building Docker image..."
cd /workspaces/Phase1/backend
docker build -t $ECR_REPO:$IMAGE_TAG -f Dockerfile .

# Tag for ECR
echo "🏷️  Tagging image..."
docker tag $ECR_REPO:$IMAGE_TAG $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG

# Push to ECR
echo "📤 Pushing to ECR..."
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG

echo ""
echo "✅ Docker image pushed successfully!"
echo "   Image: $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:$IMAGE_TAG"
echo ""
echo "Next: Run 06-deploy-ecs-service.sh"
