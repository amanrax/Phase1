# AWS Deployment Quick Reference

## Files Created for Deployment

| File | Purpose |
|------|---------|
| `AWS_DEPLOYMENT_GUIDE.md` | Complete step-by-step deployment guide |
| `AWS_DEPLOYMENT_CHECKLIST.md` | Interactive checklist to follow |
| `docker-compose.prod.yml` | Production compose file (AWS services) |
| `ecs-task-definition.json` | ECS Fargate task definition |
| `backend/.env.example` | Environment variable template |
| `.github/workflows/deploy-aws-ecs.yml` | Auto-deploy GitHub Actions workflow |
| `deploy-aws.sh` | Semi-automated deployment script |

## Quick Start (5 steps)

### Step 1: Prepare Secrets
```bash
# Generate SECRET_KEY
openssl rand -hex 32

# Get DocumentDB connection string from AWS Console
# Get ElastiCache Redis endpoint from AWS Console
```

### Step 2: Push Docker Image to ECR
```bash
# Login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t ziamis-backend:latest backend/
docker tag ziamis-backend:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ziamis-backend:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ziamis-backend:latest
```

### Step 3: Create AWS Resources
Follow `AWS_DEPLOYMENT_CHECKLIST.md` phases 1-7

### Step 4: Deploy to ECS
```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json

# Create service
aws ecs create-service \
  --cluster ziamis-prod \
  --service-name ziamis-api \
  --task-definition ziamis-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:...,containerName=backend,containerPort=8000"
```

### Step 5: Update Mobile App
```bash
# Update frontend/.env.production with your domain
VITE_API_PROD_URL=https://api.yourdomain.com
VITE_API_BASE_URL=https://api.yourdomain.com

# Rebuild APK
cd frontend
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

## What Gets Deployed

```
┌─────────────────────────────────────────────────────────────┐
│                   Mobile App (APK)                          │
│  Points to: https://api.yourdomain.com                      │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼────┐           ┌──────▼──────┐
    │   ALB   │           │ CloudFront  │
    │(HTTPS)  │           │(CDN)        │
    └────┬────┘           └──────┬──────┘
         │                       │
    ┌────▼────────────────────────▼────┐
    │      ECS Fargate (2 tasks)       │
    │  ├─ Backend (FastAPI)            │
    │  └─ Celery Worker                │
    └────┬──────────────────────┬──────┘
         │                      │
    ┌────▼────────┐  ┌──────────▼──────┐
    │ DocumentDB  │  │  ElastiCache    │
    │ (MongoDB)   │  │  (Redis)        │
    └─────────────┘  └─────────────────┘
```

## Environment Variables (stored in AWS Secrets Manager)

```
MONGODB_URL=mongodb+srv://admin:password@cluster.docdb.amazonaws.com/ziamis?tls=true
REDIS_URL=redis://:password@endpoint:6379/0
SECRET_KEY=your-long-random-key
```

## CORS Configuration

Add your domains to `backend/app/main.py`:
```python
CORS_ORIGINS = [
    "https://api.yourdomain.com",
    "https://app.yourdomain.com",
    "capacitor://localhost",
    "http://localhost"
]
```

## Monitoring

```bash
# Check service status
aws ecs describe-services --cluster ziamis-prod --services ziamis-api

# View logs
aws logs tail /ecs/ziamis-backend --follow
aws logs tail /ecs/ziamis-celery-worker --follow

# Check ALB health
aws elbv2 describe-target-health --target-group-arn arn:aws:...
```

## Cost Estimate (AWS Student Pack)
- Year 1: ~$0 (covered by credits)
- Year 2+: ~$100-150/month

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Tasks won't start | Check `/ecs/ziamis-backend` logs |
| Can't connect to DB | Check DocumentDB security group |
| API unreachable | Check ALB is healthy |
| Mobile app error | Check CORS in backend |

## Next Steps

1. Follow `AWS_DEPLOYMENT_GUIDE.md` from top to bottom
2. Use `AWS_DEPLOYMENT_CHECKLIST.md` to track progress
3. Enable GitHub Actions for auto-deploy (see `.github/workflows/deploy-aws-ecs.yml`)
4. Set up CloudWatch alarms for monitoring
