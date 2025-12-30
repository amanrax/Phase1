#!/bin/bash
set -e

echo "🔧 Setting up Application Load Balancer for CEM Backend"
echo "======================================================="

# Configuration
AWS_REGION="ap-south-1"
VPC_ID="vpc-0f2efcef588929787"
SUBNET_1="subnet-0a1b5166bc9857a2f"
SUBNET_2="subnet-03dccdbaa3482bbcc"
CLUSTER_NAME="ziamis-cluster"
SERVICE_NAME="cem-backend-gridfs"
ALB_NAME="cem-backend-alb"
TG_NAME="cem-backend-tg"
SG_NAME="cem-alb-sg"

echo ""
echo "📋 Configuration:"
echo "   VPC: $VPC_ID"
echo "   Subnets: $SUBNET_1, $SUBNET_2"
echo "   ALB Name: $ALB_NAME"
echo "   Target Group: $TG_NAME"
echo ""

# Step 1: Create security group for ALB
echo "🔐 Step 1/6: Creating ALB security group..."
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name $SG_NAME \
  --description "Security group for CEM backend ALB" \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --query 'GroupId' \
  --output text 2>/dev/null || aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$VPC_ID" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

# Allow HTTP from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION 2>/dev/null || echo "  Port 80 already allowed"

echo "✅ ALB Security Group: $ALB_SG_ID"

# Step 2: Update backend security group to allow traffic from ALB
echo ""
echo "🔐 Step 2/6: Updating backend security group..."
BACKEND_SG_ID="sg-0dd20bc58d7beb34b"

aws ec2 authorize-security-group-ingress \
  --group-id $BACKEND_SG_ID \
  --protocol tcp \
  --port 8000 \
  --source-group $ALB_SG_ID \
  --region $AWS_REGION 2>/dev/null || echo "  ALB access already allowed"

echo "✅ Backend SG updated to allow traffic from ALB"

# Step 3: Create Application Load Balancer
echo ""
echo "🌐 Step 3/6: Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names $ALB_NAME \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>/dev/null)

if [ "$ALB_ARN" == "None" ] || [ -z "$ALB_ARN" ]; then
  ALB_ARN=$(aws elbv2 create-load-balancer \
    --name $ALB_NAME \
    --subnets $SUBNET_1 $SUBNET_2 \
    --security-groups $ALB_SG_ID \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --region $AWS_REGION \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)
  echo "✅ ALB created: $ALB_NAME"
else
  echo "✅ ALB already exists: $ALB_NAME"
fi

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "   DNS: $ALB_DNS"

# Step 4: Create Target Group
echo ""
echo "🎯 Step 4/6: Creating Target Group..."
TG_ARN=$(aws elbv2 describe-target-groups \
  --names $TG_NAME \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null)

if [ "$TG_ARN" == "None" ] || [ -z "$TG_ARN" ]; then
  TG_ARN=$(aws elbv2 create-target-group \
    --name $TG_NAME \
    --protocol HTTP \
    --port 8000 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-enabled \
    --health-check-protocol HTTP \
    --health-check-path /api/health \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region $AWS_REGION \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
  echo "✅ Target Group created: $TG_NAME"
else
  echo "✅ Target Group already exists: $TG_NAME"
fi

# Step 5: Create Listener
echo ""
echo "👂 Step 5/6: Creating ALB Listener..."
LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn $ALB_ARN \
  --region $AWS_REGION \
  --query 'Listeners[0].ListenerArn' \
  --output text 2>/dev/null)

if [ "$LISTENER_ARN" == "None" ] || [ -z "$LISTENER_ARN" ]; then
  LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN \
    --region $AWS_REGION \
    --query 'Listeners[0].ListenerArn' \
    --output text)
  echo "✅ Listener created on port 80"
else
  echo "✅ Listener already exists"
fi

# Step 6: Update ECS Service to use ALB
echo ""
echo "🔄 Step 6/6: Updating ECS Service with Load Balancer..."

# Get current task definition
TASK_DEF=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $AWS_REGION \
  --query 'services[0].taskDefinition' \
  --output text)

# Update service with load balancer
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=backend,containerPort=8000" \
  --health-check-grace-period-seconds 60 \
  --region $AWS_REGION \
  --output text > /dev/null 2>&1 || echo "  Service already has load balancer configuration"

echo "✅ ECS Service updated"

# Wait for ALB to become active
echo ""
echo "⏳ Waiting for ALB to become active (this may take 2-3 minutes)..."
aws elbv2 wait load-balancer-available \
  --load-balancer-arns $ALB_ARN \
  --region $AWS_REGION

echo ""
echo "🎉 Application Load Balancer Setup Complete!"
echo "============================================"
echo ""
echo "📊 Resources Created:"
echo "   ALB: $ALB_NAME"
echo "   ALB Security Group: $ALB_SG_ID"
echo "   Target Group: $TG_NAME"
echo "   Listener: HTTP:80 -> Backend:8000"
echo ""
echo "🌐 Access URLs:"
echo "   Backend API: http://$ALB_DNS"
echo "   Health Check: http://$ALB_DNS/api/health"
echo "   API Docs: http://$ALB_DNS/docs"
echo ""
echo "⏱️ Note: It may take 1-2 minutes for targets to become healthy"
echo ""
echo "📋 Check target health:"
echo "   aws elbv2 describe-target-health --target-group-arn $TG_ARN"
echo ""
echo "🧪 Test the endpoint:"
echo "   curl http://$ALB_DNS/api/health"
