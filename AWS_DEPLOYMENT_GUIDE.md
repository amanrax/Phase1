# AWS Deployment Guide - Complete Setup

## Architecture Overview
```
Mobile APK
    ↓
API Gateway / ALB (Application Load Balancer)
    ↓
ECS Fargate (FastAPI Backend + Celery Worker)
    ↓
DocumentDB (MongoDB) + ElastiCache (Redis) + S3 (Files)
```

## Prerequisites
- AWS Account with Student Developer Pack (free tier + $100 credits)
- AWS CLI installed and configured
- Docker images pushed to ECR (Elastic Container Registry)

---

## Step 1: AWS IAM Setup

Create an IAM user for deployment:
```bash
aws iam create-user --user-name ziamis-deploy
aws iam attach-user-policy --user-name ziamis-deploy --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
aws iam create-access-key --user-name ziamis-deploy
# Save the AccessKeyId and SecretAccessKey
```

---

## Step 2: Create VPC & Security Groups

### VPC
```bash
aws ec2 create-vpc --cidr-block 10.0.0.0/16
# Note the VpcId
```

### Security Groups
```bash
# Backend SG
aws ec2 create-security-group \
  --group-name ziamis-backend-sg \
  --description "Backend services" \
  --vpc-id <VpcId>

# Allow inbound on port 8000 (API) and 6379 (Redis internal)
aws ec2 authorize-security-group-ingress \
  --group-id <BackendSGId> \
  --protocol tcp --port 8000 --cidr 0.0.0.0/0

# DocumentDB SG
aws ec2 create-security-group \
  --group-name ziamis-db-sg \
  --description "Database services" \
  --vpc-id <VpcId>

aws ec2 authorize-security-group-ingress \
  --group-id <DbSGId> \
  --protocol tcp --port 27017 --source-security-group-id <BackendSGId>
```

---

## Step 3: Create DocumentDB Cluster

```bash
aws docdb create-db-cluster \
  --db-cluster-identifier ziamis-cluster \
  --engine docdb \
  --master-username admin \
  --master-user-password "YourSecurePassword123!" \
  --vpc-security-group-ids <DbSGId> \
  --db-subnet-group-name default \
  --storage-encrypted \
  --backup-retention-period 7
```

Create instance in cluster:
```bash
aws docdb create-db-instance \
  --db-instance-identifier ziamis-instance-1 \
  --db-cluster-identifier ziamis-cluster \
  --db-instance-class db.t3.small \
  --engine docdb
```

Get connection string:
```bash
aws docdb describe-db-clusters --db-cluster-identifier ziamis-cluster \
  --query 'DBClusters[0].Endpoint'
# Format: ziamis-cluster.xxxxx.docdb.amazonaws.com
```

---

## Step 4: Create ElastiCache Redis

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id ziamis-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --security-group-ids <BackendSGId>
```

Get endpoint:
```bash
aws elasticache describe-cache-clusters --cache-cluster-id ziamis-redis \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint'
# Format: ziamis-redis.xxxxx.ng.0001.use1.cache.amazonaws.com:6379
```

---

## Step 5: Push Docker Image to ECR

```bash
# Create ECR repository
aws ecr create-repository --repository-name ziamis-backend

# Get login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <AccountId>.dkr.ecr.us-east-1.amazonaws.com

# Build and push
cd /workspaces/Phase1
docker build -t ziamis-backend:latest backend/
docker tag ziamis-backend:latest <AccountId>.dkr.ecr.us-east-1.amazonaws.com/ziamis-backend:latest
docker push <AccountId>.dkr.ecr.us-east-1.amazonaws.com/ziamis-backend:latest
```

---

## Step 6: Create ECS Task Definition

Create `ecs-task-definition.json`:
```json
{
  "family": "ziamis-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<AccountId>.dkr.ecr.us-east-1.amazonaws.com/ziamis-backend:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "hostPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ENVIRONMENT",
          "value": "production"
        },
        {
          "name": "MONGODB_URL",
          "value": "mongodb+srv://admin:YourPassword@ziamis-cluster.xxxxx.docdb.amazonaws.com:27017/ziamis?tls=true&retryWrites=false"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://:@ziamis-redis.xxxxx.ng.0001.use1.cache.amazonaws.com:6379/0"
        },
        {
          "name": "SECRET_KEY",
          "value": "your-secret-key-here-min-32-chars"
        },
        {
          "name": "CORS_ORIGINS",
          "value": "https://api.yourdomain.com,capacitor://localhost,http://localhost"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/ziamis-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Register task:
```bash
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json
```

---

## Step 7: Create ECS Cluster & Service

```bash
# Create cluster
aws ecs create-cluster --cluster-name ziamis-prod

# Create service
aws ecs create-service \
  --cluster ziamis-prod \
  --service-name ziamis-api \
  --task-definition ziamis-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[<BackendSGId>],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=backend,containerPort=8000
```

---

## Step 8: Create Application Load Balancer (ALB)

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name ziamis-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups <BackendSGId> \
  --scheme internet-facing

# Create target group
aws elbv2 create-target-group \
  --name ziamis-backend \
  --protocol HTTP \
  --port 8000 \
  --vpc-id <VpcId>

# Create listener
aws elbv2 create-listener \
  --load-balancer-arn <ALBArn> \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=<TargetGroupArn>
```

Get ALB DNS:
```bash
aws elbv2 describe-load-balancers --load-balancer-arns <ALBArn> \
  --query 'LoadBalancers[0].DNSName'
# e.g., ziamis-alb-123456789.us-east-1.elb.amazonaws.com
```

---

## Step 9: Set Up Custom Domain & ACM Certificate

```bash
# Request certificate in ACM
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS

# Validate via DNS (check AWS Console for CNAME record to add to your DNS provider)

# Update ALB listener to HTTPS
aws elbv2 modify-listener \
  --listener-arn <ListenerArn> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<CertArn>

# Add Route 53 record (or your DNS provider)
aws route53 change-resource-record-sets \
  --hosted-zone-id <ZoneId> \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "api.yourdomain.com",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [{"Value": "ziamis-alb-123456789.us-east-1.elb.amazonaws.com"}]
        }
      }
    ]
  }'
```

---

## Step 10: Create S3 Bucket for Static Files

```bash
aws s3 mb s3://ziamis-uploads --region us-east-1

# Block public access (optional)
aws s3api put-public-access-block \
  --bucket ziamis-uploads \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Enable CORS for mobile app
cat > cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "POST", "PUT", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors --bucket ziamis-uploads --cors-configuration file://cors.json
```

---

## Step 11: Create CloudFront Distribution

```bash
aws cloudfront create-distribution \
  --origin-domain-name ziamis-uploads.s3.us-east-1.amazonaws.com \
  --default-root-object index.html \
  --comment "ZIAMIS Static Files"
```

Get distribution domain:
```bash
aws cloudfront list-distributions --query 'DistributionList.Items[0].DomainName'
```

---

## Step 12: Update Mobile App Configuration

Update `frontend/.env.production`:
```env
VITE_API_PROD_URL=https://api.yourdomain.com
VITE_API_BASE_URL=https://api.yourdomain.com
```

Rebuild APK:
```bash
cd frontend
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

---

## Step 13: CloudWatch Monitoring

```bash
# Create log group
aws logs create-log-group --log-group-name /ecs/ziamis-backend

# Create alarms
aws cloudwatch put-metric-alarm \
  --alarm-name ziamis-high-cpu \
  --alarm-description "Alert if CPU > 70%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 70 \
  --comparison-operator GreaterThanThreshold
```

---

## Costs Estimate (Student Pack + Free Tier)

| Service | Free Tier | Cost |
|---------|-----------|------|
| **DocumentDB** | 1 month free | ~$60/month after |
| **ElastiCache** | 1 month free | ~$15/month (t3.micro) |
| **ECS Fargate** | 750 hours/month | Free for 1 task |
| **ALB** | First 750 hours | Free; then ~$16/month |
| **S3** | 5 GB storage | Free; then $0.023/GB |
| **CloudFront** | 1 TB egress | Free; then ~$0.085/GB |
| **Total (Year 1)** | | ~$0 (Student Pack covers) |
| **Total (Year 2+)** | | ~$100-150/month |

---

## Monitoring & Logs

Check ECS service status:
```bash
aws ecs describe-services --cluster ziamis-prod --services ziamis-api
```

View logs:
```bash
aws logs tail /ecs/ziamis-backend --follow
```

---

## Next: CI/CD Pipeline

Add GitHub Actions workflow to auto-deploy:
- Build Docker image
- Push to ECR
- Update ECS task definition
- Deploy to Fargate

---

**Questions?** Check AWS Student Developer Pack docs or DM.
