# CEM AWS Migration Guide

## 🎯 Overview

Complete migration from local filesystem storage to MongoDB GridFS + AWS ECS deployment.

**Key Changes:**
- ✅ Files stored in MongoDB Atlas GridFS (cloud-native)
- ✅ AWS ECS Fargate for backend hosting
- ✅ AWS ElastiCache Redis for caching/Celery
- ✅ AWS Secrets Manager for sensitive data
- ✅ CloudWatch for logging and monitoring
- ✅ Celery worker in same task for background jobs

---

## 📁 Project Structure

```
aws-deployment/
├── 01-cleanup-aws.sh              # Remove old failed resources
├── 02-setup-aws-infrastructure.sh # Create ECS, Redis, ECR, logs
├── 03-create-secrets.sh           # Add secrets to Secrets Manager
├── 04-create-iam-roles.sh         # Create execution & task roles
├── 05-build-and-push.sh           # Build & push Docker to ECR
├── 06-deploy-ecs-service.sh       # Deploy/update ECS service
├── deploy-all.sh                  # Master deployment script
└── ecs-task-definition.json       # ECS task configuration

backend/
├── app/
│   ├── services/
│   │   └── gridfs_service.py     # NEW: GridFS file operations
│   ├── routes/
│   │   ├── files.py               # NEW: File download endpoint
│   │   └── uploads.py             # UPDATED: Uses GridFS
│   └── tasks/
│       └── id_card_task.py        # UPDATED: GridFS for PDFs
├── Dockerfile                      # UPDATED: Production-ready
└── .env.production.example         # Reference for secrets
```

---

## 🚀 Deployment Steps

### Prerequisites

1. **AWS CLI configured:**
   ```bash
   aws configure
   # Use Access Key ID, Secret, Region: ap-south-1
   ```

2. **Docker installed and running**

3. **MongoDB Atlas cluster running** (already configured)

### Quick Start

```bash
cd /workspaces/Phase1/aws-deployment
./deploy-all.sh
```

This interactive script will guide you through all steps.

### Manual Step-by-Step

#### 1. Clean Up Old Resources

```bash
./01-cleanup-aws.sh
```

Removes:
- Old ECS services/clusters
- Task definitions
- Secrets
- ECR repositories
- CloudWatch log groups
- ElastiCache clusters

#### 2. Setup Infrastructure

```bash
./02-setup-aws-infrastructure.sh
```

Creates:
- ECS cluster: `cem-prod-v2`
- ElastiCache Redis: `cem-redis-prod`
- ECR repository: `cem-backend`
- CloudWatch log group: `/ecs/cem-backend`

**Save the Redis endpoint from output!**

#### 3. Create Secrets

```bash
./03-create-secrets.sh
```

Enter Redis endpoint when prompted. Creates secrets:
- `cem/mongo-uri` - MongoDB Atlas connection
- `cem/jwt-secret` - JWT signing key
- `cem/secret-key` - Encryption key
- `cem/redis-url` - Redis connection
- `cem/celery-broker-url` - Celery broker
- `cem/admin-email` - Admin email
- `cem/admin-password` - Admin password
- `cem/mongo-db-name` - Database name

#### 4. Create IAM Roles

```bash
./04-create-iam-roles.sh
```

Creates:
- `ecsTaskExecutionRoleCEM` - For pulling images/secrets
- `ecsTaskRoleCEM` - For application runtime

#### 5. Build & Push Docker Image

```bash
./05-build-and-push.sh
```

Builds backend Docker image and pushes to ECR.

#### 6. Deploy ECS Service

```bash
./06-deploy-ecs-service.sh
```

Registers task definition and creates/updates ECS service.

---

## 🧪 Testing Locally with GridFS

Before deploying, test GridFS locally:

### 1. Update Local Environment

```bash
cd /workspaces/Phase1
# MongoDB Atlas is already configured in backend/.env
docker-compose up -d farmer-redis
```

### 2. Test File Upload

```bash
# Start backend
cd backend
uvicorn app.main:app --reload

# In another terminal, test upload:
curl -X POST http://localhost:8000/api/uploads/ZM123456/photo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test_photo.jpg"

# Response should include file_id instead of path
```

### 3. Test File Download

```bash
curl http://localhost:8000/api/files/{file_id} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output downloaded_file.jpg
```

### 4. Test ID Card Generation

```bash
# Trigger ID card generation (Celery task)
celery -A app.tasks.celery_app.celery_app worker --loglevel=info

# In backend, check farmer document:
# Should have id_card_file_id and qr_code_file_id
```

---

## 📊 Post-Deployment Verification

### 1. Check Service Status

```bash
aws ecs describe-services \
  --cluster cem-prod-v2 \
  --services cem-backend-service \
  --region ap-south-1
```

### 2. Get Task Public IP

```bash
# List tasks
TASK_ARN=$(aws ecs list-tasks \
  --cluster cem-prod-v2 \
  --service-name cem-backend-service \
  --region ap-south-1 \
  --query 'taskArns[0]' \
  --output text)

# Get network info
aws ecs describe-tasks \
  --cluster cem-prod-v2 \
  --tasks $TASK_ARN \
  --region ap-south-1 \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text

# Get public IP from network interface
ENI_ID=<from above>
aws ec2 describe-network-interfaces \
  --network-interface-ids $ENI_ID \
  --region ap-south-1 \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text
```

### 3. Test API

```bash
PUBLIC_IP=<from above>

# Health check
curl http://$PUBLIC_IP:8000/api/health

# Login
curl -X POST http://$PUBLIC_IP:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agrimanage.com","password":"admin123"}'
```

### 4. View Logs

```bash
# Backend logs
aws logs tail /ecs/cem-backend --follow --region ap-south-1

# Celery worker logs
aws logs tail /ecs/cem-celery --follow --region ap-south-1
```

---

## 🔧 Troubleshooting

### Service Won't Start

**Check task logs:**
```bash
aws logs tail /ecs/cem-backend --since 10m --region ap-south-1
```

**Common issues:**
- Secrets not found: Verify ARNs in `ecs-task-definition.json`
- Database connection: Check MongoDB Atlas IP whitelist (allow `0.0.0.0/0` or AWS IPs)
- Redis connection: Verify security group allows port 6379 from ECS tasks

### Files Not Uploading

**Check GridFS connection:**
```python
# In Python shell:
from pymongo import MongoClient
client = MongoClient("mongodb+srv://...")
db = client['zambian_farmer_db']
fs = GridFSBucket(db, bucket_name="cem_files")
print(list(fs.find()))
```

### Celery Tasks Not Running

**Check worker logs:**
```bash
aws logs tail /ecs/cem-celery --follow --region ap-south-1
```

**Verify Redis connection:**
```bash
redis-cli -h <redis-endpoint> ping
```

---

## 🌐 Update Mobile App

After backend is stable:

### 1. Get Backend URL

```bash
# From ECS task public IP
export BACKEND_URL="http://<PUBLIC_IP>:8000"
```

### 2. Update React Native App

```javascript
// app/config.js
export const API_BASE_URL = 'http://<PUBLIC_IP>:8000/api';
```

### 3. Rebuild APK

```bash
cd mobile-app
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle
cd android && ./gradlew assembleRelease
```

---

## 📈 Cost Optimization

Current configuration:

| Service | Type | Monthly Cost (est.) |
|---------|------|---------------------|
| ECS Fargate | 1 task (1 vCPU, 2GB) | ~$30 |
| ElastiCache Redis | cache.t3.micro | ~$12 |
| MongoDB Atlas | M0 (Free tier) | $0 |
| ECR Storage | <10GB | ~$1 |
| Data Transfer | <100GB | ~$9 |
| **Total** | | **~$52/month** |

**Optimization tips:**
- Use Fargate Spot for 70% savings
- Reduce task count during off-hours
- Use CloudWatch alarms for auto-scaling

---

## 🔐 Security Best Practices

✅ **Implemented:**
- Secrets in AWS Secrets Manager (not env vars)
- IAM roles with least privilege
- VPC security groups restricting access
- MongoDB Atlas network access control
- HTTPS for API (add ALB later)

🔜 **Recommended:**
- Add Application Load Balancer with HTTPS
- Use AWS WAF for API protection
- Enable CloudTrail for audit logs
- Rotate secrets every 90 days
- Use AWS KMS for secret encryption

---

## 📚 Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [MongoDB GridFS Guide](https://www.mongodb.com/docs/manual/core/gridfs/)
- [FastAPI Production Guide](https://fastapi.tiangolo.com/deployment/)
- [Celery Best Practices](https://docs.celeryq.dev/en/stable/userguide/optimizing.html)

---

## 🆘 Support

For issues:
1. Check CloudWatch logs first
2. Verify secrets are correct
3. Test locally with same MongoDB Atlas cluster
4. Review security group rules

---

## ✅ Deployment Checklist

- [ ] AWS CLI configured
- [ ] MongoDB Atlas cluster accessible
- [ ] Old resources cleaned up
- [ ] ECS cluster created
- [ ] Redis cluster created
- [ ] Secrets created in Secrets Manager
- [ ] IAM roles created
- [ ] Docker image built and pushed
- [ ] ECS service deployed
- [ ] Health check passing
- [ ] File upload tested
- [ ] ID card generation tested
- [ ] Celery worker running
- [ ] Mobile app updated

---

**Last Updated:** December 18, 2025
