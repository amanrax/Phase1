#!/bin/bash
set -e

REGION="ap-south-1"
CLUSTER="ziamis-cluster"
SERVICE="cem-backend-alb"
VPC="vpc-0f2efcef588929787"
SUBNETS="subnet-0a1b5166bc9857a2f subnet-03dccdbaa3482bbcc"
BACKEND_SG="sg-0dd20bc58d7beb34b"
ALB_SG="sg-04cf98ccd329debff"

echo "🔧 Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name cem-backend-alb-v2 \
  --subnets $SUBNETS \
  --security-groups $ALB_SG \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --region $REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

echo "✅ ALB created: $ALB_ARN"

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --region $REGION \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "📍 ALB DNS: $ALB_DNS"

echo ""
echo "🎯 Creating Target Group..."
TG_ARN=$(aws elbv2 create-target-group \
  --name cem-backend-tg-v2 \
  --protocol HTTP \
  --port 8000 \
  --vpc-id $VPC \
  --target-type ip \
  --health-check-enabled \
  --health-check-protocol HTTP \
  --health-check-path /api/health \
  --health-check-interval-seconds 10 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 2 \
  --matcher HttpCode=200 \
  --region $REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "✅ Target Group created: $TG_ARN"

echo ""
echo "🔊 Creating Listener..."
LISTENER_ARN=$(aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region $REGION \
  --query 'Listeners[0].ListenerArn' \
  --output text)

echo "✅ Listener created: $LISTENER_ARN"

echo ""
echo "🔄 Updating ECS service..."
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --load-balancers targetGroupArn=$TG_ARN,containerName=backend,containerPort=8000 \
  --health-check-grace-period-seconds 60 \
  --force-new-deployment \
  --region $REGION > /dev/null

echo "✅ Service updated"

echo ""
echo "⏳ Waiting 90 seconds for service to stabilize..."
sleep 90

echo ""
echo "🧪 Testing endpoints..."
echo "Health check:"
curl -i http://$ALB_DNS/api/health 2>&1 | head -8

echo ""
echo ""
echo "=================================================="
echo "✅ ALB Recreation Complete!"
echo "=================================================="
echo ""
echo "🌐 New ALB DNS: http://$ALB_DNS"
echo "🎯 Target Group: $TG_ARN"
echo "📊 Test URLs:"
echo "   - Health: http://$ALB_DNS/api/health"
echo "   - Docs: http://$ALB_DNS/docs"
echo "   - Login: POST http://$ALB_DNS/api/auth/login"
echo ""
echo "🔧 Direct Backend URL (backup): http://13.235.33.169:8000"
echo ""
