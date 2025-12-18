#!/bin/bash
set -e

echo "🚀 Deploying CEM Backend with GridFS to AWS ECS"
echo "================================================"

# Configuration
AWS_REGION="ap-south-1"
AWS_ACCOUNT_ID="701708343469"
CLUSTER_NAME="ziamis-cluster"
SERVICE_NAME="cem-backend-gridfs"
TASK_FAMILY="cem-backend-gridfs"
ECR_REPO="ziamis-backend"
SUBNETS="subnet-0a1b5166bc9857a2f,subnet-03dccdbaa3482bbcc"
SECURITY_GROUP="sg-0dd20bc58d7beb34b"
REDIS_ENDPOINT="ziamis-redis-001.ziamis-redis.nb3o6e.aps1.cache.amazonaws.com:6379"

echo ""
echo "📋 Using existing infrastructure:"
echo "   VPC: vpc-0f2efcef588929787 (cem-vpc)"
echo "   Subnets: $SUBNETS"
echo "   Security Group: $SECURITY_GROUP (cem-backend-sg)"
echo "   Redis: $REDIS_ENDPOINT"
echo "   Secrets: ziamis/mongodb-url, ziamis/jwt-secret, ziamis/secret-key"
echo ""

# Step 1: Build and push Docker image
echo "🐳 Step 1/4: Building and pushing Docker image..."
cd /workspaces/Phase1/backend

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build image
echo "Building image with GridFS support..."
docker build -t $ECR_REPO:gridfs .

# Tag and push
docker tag $ECR_REPO:gridfs $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:gridfs
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:gridfs

echo "✅ Image pushed: $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:gridfs"

# Step 2: Create/update task definition
echo ""
echo "📝 Step 2/4: Creating ECS task definition..."

cat > /tmp/cem-task-def.json << EOF
{
  "family": "$TASK_FAMILY",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:gridfs",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "MONGODB_DB_NAME",
          "value": "zambian_farmer_db"
        },
        {
          "name": "ENVIRONMENT",
          "value": "production"
        },
        {
          "name": "DEBUG",
          "value": "False"
        },
        {
          "name": "ACCESS_TOKEN_EXPIRE_MINUTES",
          "value": "60"
        },
        {
          "name": "REFRESH_TOKEN_EXPIRE_DAYS",
          "value": "7"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://$REDIS_ENDPOINT/0"
        },
        {
          "name": "CORS_ORIGINS",
          "value": "[\"capacitor://localhost\",\"http://localhost\",\"https://*.amazonaws.com\",\"http://*\"]"
        }
      ],
      "secrets": [
        {
          "name": "MONGODB_URL",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:ziamis/mongodb-url-flvTdg"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:ziamis/jwt-secret-XOQ6YD"
        },
        {
          "name": "SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:ziamis/secret-key-9Bc7UL"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/cem-backend-gridfs",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "backend"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8000/api/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    },
    {
      "name": "celery-worker",
      "image": "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO:gridfs",
      "essential": true,
      "command": ["celery", "-A", "app.tasks.celery_app", "worker", "--loglevel=info"],
      "environment": [
        {
          "name": "MONGODB_DB_NAME",
          "value": "zambian_farmer_db"
        },
        {
          "name": "ENVIRONMENT",
          "value": "production"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://$REDIS_ENDPOINT/0"
        }
      ],
      "secrets": [
        {
          "name": "MONGODB_URL",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:ziamis/mongodb-url-flvTdg"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:ziamis/jwt-secret-XOQ6YD"
        },
        {
          "name": "SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:$AWS_REGION:$AWS_ACCOUNT_ID:secret:ziamis/secret-key-9Bc7UL"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/cem-celery-gridfs",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "celery"
        }
      }
    }
  ]
}
EOF

# Create CloudWatch log groups if they don't exist
aws logs create-log-group --log-group-name /ecs/cem-backend-gridfs --region $AWS_REGION 2>/dev/null || true
aws logs create-log-group --log-group-name /ecs/cem-celery-gridfs --region $AWS_REGION 2>/dev/null || true

# Register task definition
TASK_DEF_ARN=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/cem-task-def.json \
  --region $AWS_REGION \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "✅ Task definition registered: $TASK_DEF_ARN"

# Step 3: Create or update ECS service
echo ""
echo "🔄 Step 3/4: Deploying ECS service..."

# Check if service exists
if aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $AWS_REGION --query 'services[0].status' --output text 2>/dev/null | grep -q "ACTIVE"; then
  echo "Service exists, updating..."
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $SERVICE_NAME \
    --task-definition $TASK_DEF_ARN \
    --force-new-deployment \
    --region $AWS_REGION \
    --output text > /dev/null
  echo "✅ Service updated and redeploying..."
else
  echo "Creating new service..."
  aws ecs create-service \
    --cluster $CLUSTER_NAME \
    --service-name $SERVICE_NAME \
    --task-definition $TASK_DEF_ARN \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
    --region $AWS_REGION \
    --output text > /dev/null
  echo "✅ Service created..."
fi

# Step 4: Wait for service to stabilize
echo ""
echo "⏳ Step 4/4: Waiting for service to become stable (this may take 2-3 minutes)..."
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $AWS_REGION

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Getting service details..."

# Get task details
TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --region $AWS_REGION --query 'taskArns[0]' --output text)

if [ "$TASK_ARN" != "None" ] && [ -n "$TASK_ARN" ]; then
  TASK_DETAILS=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARN --region $AWS_REGION --query 'tasks[0]')
  
  ENI_ID=$(echo $TASK_DETAILS | jq -r '.attachments[0].details[] | select(.name=="networkInterfaceId") | .value')
  PUBLIC_IP=$(aws ec2 describe-network-interfaces --network-interface-ids $ENI_ID --region $AWS_REGION --query 'NetworkInterfaces[0].Association.PublicIp' --output text)
  
  echo ""
  echo "🎉 Backend is deployed and running!"
  echo "================================================"
  echo "Public IP: $PUBLIC_IP"
  echo "Health Check: http://$PUBLIC_IP:8000/api/health"
  echo "API Docs: http://$PUBLIC_IP:8000/docs"
  echo ""
  echo "Test the API:"
  echo "  curl http://$PUBLIC_IP:8000/api/health"
  echo ""
  echo "View logs:"
  echo "  Backend: aws logs tail /ecs/cem-backend-gridfs --follow"
  echo "  Celery: aws logs tail /ecs/cem-celery-gridfs --follow"
  echo ""
else
  echo "⚠️ Task details not available yet. Service is starting..."
  echo "Check status: aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME"
fi
