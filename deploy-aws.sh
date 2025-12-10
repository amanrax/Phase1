#!/bin/bash
# AWS Deployment Script for ZIAMIS Backend
# This script automates the creation of AWS resources

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
APP_NAME=ziamis
ECR_REPO_NAME=${APP_NAME}-backend
CLUSTER_NAME=${APP_NAME}-prod
SERVICE_NAME=${APP_NAME}-api

echo -e "${YELLOW}=== ZIAMIS AWS Deployment ===${NC}"
echo "Account ID: $ACCOUNT_ID"
echo "Region: $AWS_REGION"
echo ""

# Step 1: Create ECR Repository
echo -e "${YELLOW}Step 1: Creating ECR Repository...${NC}"
aws ecr create-repository \
  --repository-name $ECR_REPO_NAME \
  --region $AWS_REGION \
  2>/dev/null || echo "Repository already exists"

ECR_URI="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO_NAME"
echo -e "${GREEN}✓ ECR URI: $ECR_URI${NC}"

# Step 2: Build and Push Docker Image
echo ""
echo -e "${YELLOW}Step 2: Building and Pushing Docker Image...${NC}"
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

docker build -t $ECR_REPO_NAME:latest backend/
docker tag $ECR_REPO_NAME:latest $ECR_URI:latest
docker push $ECR_URI:latest
echo -e "${GREEN}✓ Docker image pushed${NC}"

# Step 3: Create CloudWatch Log Groups
echo ""
echo -e "${YELLOW}Step 3: Creating CloudWatch Log Groups...${NC}"
aws logs create-log-group --log-group-name /ecs/${APP_NAME}-backend --region $AWS_REGION 2>/dev/null || true
aws logs create-log-group --log-group-name /ecs/${APP_NAME}-celery-worker --region $AWS_REGION 2>/dev/null || true
echo -e "${GREEN}✓ Log groups created${NC}"

# Step 4: Create ECS Cluster
echo ""
echo -e "${YELLOW}Step 4: Creating ECS Cluster...${NC}"
aws ecs create-cluster \
  --cluster-name $CLUSTER_NAME \
  --region $AWS_REGION \
  2>/dev/null || echo "Cluster already exists"
echo -e "${GREEN}✓ ECS cluster ready${NC}"

# Step 5: Store Secrets in AWS Secrets Manager
echo ""
echo -e "${YELLOW}Step 5: Storing Secrets in AWS Secrets Manager...${NC}"
read -sp "Enter MongoDB URL: " MONGODB_URL
echo ""
read -sp "Enter Redis URL: " REDIS_URL
echo ""
read -sp "Enter SECRET_KEY (or press Enter for auto-generated): " SECRET_KEY
if [ -z "$SECRET_KEY" ]; then
  SECRET_KEY=$(openssl rand -hex 32)
fi
echo ""

aws secretsmanager create-secret \
  --name ${APP_NAME}/mongodb-url \
  --secret-string "$MONGODB_URL" \
  --region $AWS_REGION \
  2>/dev/null || aws secretsmanager update-secret \
  --secret-id ${APP_NAME}/mongodb-url \
  --secret-string "$MONGODB_URL" \
  --region $AWS_REGION

aws secretsmanager create-secret \
  --name ${APP_NAME}/redis-url \
  --secret-string "$REDIS_URL" \
  --region $AWS_REGION \
  2>/dev/null || aws secretsmanager update-secret \
  --secret-id ${APP_NAME}/redis-url \
  --secret-string "$REDIS_URL" \
  --region $AWS_REGION

aws secretsmanager create-secret \
  --name ${APP_NAME}/secret-key \
  --secret-string "$SECRET_KEY" \
  --region $AWS_REGION \
  2>/dev/null || aws secretsmanager update-secret \
  --secret-id ${APP_NAME}/secret-key \
  --secret-string "$SECRET_KEY" \
  --region $AWS_REGION

echo -e "${GREEN}✓ Secrets stored${NC}"

# Step 6: Update ECS Task Definition
echo ""
echo -e "${YELLOW}Step 6: Registering ECS Task Definition...${NC}"
sed "s/YOUR_ACCOUNT_ID/$ACCOUNT_ID/g" ecs-task-definition.json > /tmp/ecs-task-def.json
aws ecs register-task-definition \
  --cli-input-json file:///tmp/ecs-task-def.json \
  --region $AWS_REGION
echo -e "${GREEN}✓ Task definition registered${NC}"

# Step 7: Display next steps
echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Create VPC and Security Groups (if not already done)"
echo "2. Create DocumentDB and ElastiCache instances"
echo "3. Create Application Load Balancer"
echo "4. Update the task definition with your VPC/subnet IDs"
echo "5. Create ECS Service using:"
echo ""
echo "   aws ecs create-service \\"
echo "     --cluster $CLUSTER_NAME \\"
echo "     --service-name $SERVICE_NAME \\"
echo "     --task-definition ${APP_NAME}-backend:1 \\"
echo "     --desired-count 2 \\"
echo "     --launch-type FARGATE \\"
echo "     --network-configuration 'awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}' \\"
echo "     --load-balancers 'targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=backend,containerPort=8000' \\"
echo "     --region $AWS_REGION"
echo ""
echo -e "${YELLOW}For detailed instructions, see AWS_DEPLOYMENT_GUIDE.md${NC}"
