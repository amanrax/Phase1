# ✅ AWS Migration Complete - Quick Start Guide

## 🎯 What's Ready

All code and scripts are prepared for AWS deployment with GridFS file storage.

## 📦 What Was Created

### Code Changes:
- ✅ GridFS service for cloud file storage (`backend/app/services/gridfs_service.py`)
- ✅ File download API (`backend/app/routes/files.py`)
- ✅ Updated uploads to use GridFS (`backend/app/routes/uploads.py`)
- ✅ ID card generation with GridFS (`backend/app/tasks/id_card_task.py`)
- ✅ Production-ready Dockerfile

### AWS Deployment Scripts:
- ✅ `00-preflight-check.sh` - Verify prerequisites
- ✅ `01-cleanup-aws.sh` - Remove old resources
- ✅ `02-setup-aws-infrastructure.sh` - Create ECS, Redis, ECR
- ✅ `03-create-secrets.sh` - AWS Secrets Manager
- ✅ `04-create-iam-roles.sh` - IAM roles
- ✅ `05-build-and-push.sh` - Docker build & push
- ✅ `06-deploy-ecs-service.sh` - Deploy service
- ✅ `deploy-all.sh` - Master deployment script
- ✅ `ecs-task-definition.json` - Task configuration

### Documentation:
- ✅ `aws-deployment/README.md` - Complete guide
- ✅ `AWS_MIGRATION_SUMMARY.md` - Architecture overview
- ✅ This quick start guide

---

## 🚀 Deploy in 3 Steps

### Step 1: Pre-Flight Check
```bash
cd /workspaces/Phase1/aws-deployment
./00-preflight-check.sh
```

This verifies:
- AWS CLI configured
- Docker running
- MongoDB Atlas accessible
- All files present

### Step 2: Deploy Everything
```bash
./deploy-all.sh
```

This interactive script will:
1. Clean up old AWS resources
2. Create ECS cluster & Redis
3. Add secrets to Secrets Manager
4. Create IAM roles
5. Build & push Docker image
6. Deploy ECS service

**⏱️ Estimated time:** 15-20 minutes

### Step 3: Verify Deployment
```bash
# Get task status
aws ecs describe-services \
  --cluster cem-prod-v2 \
  --services cem-backend-service \
  --region ap-south-1

# Get public IP
./get-public-ip.sh  # (create this helper)

# Test API
curl http://<PUBLIC_IP>:8000/api/health
```

---

## 📊 Architecture

```
AWS Cloud
├── ECS Fargate (cem-prod-v2)
│   ├── Backend Container (FastAPI, port 8000)
│   └── Celery Worker Container (Background tasks)
├── ElastiCache Redis (cache.t3.micro)
├── AWS Secrets Manager (8 secrets)
└── CloudWatch Logs (/ecs/cem-backend, /ecs/cem-celery)

External
└── MongoDB Atlas (M0 Free Tier)
    ├── Collections (farmers, users, logs)
    └── GridFS (cem_files - photos, docs, PDFs)
```

---

## 💰 Cost Estimate

**~$52/month** for production deployment:
- ECS Fargate: ~$30
- ElastiCache Redis: ~$12
- MongoDB Atlas: $0 (free tier)
- Other AWS services: ~$10

**Cost optimization:** Use Fargate Spot → **~$20/month**

---

## 🧪 Test Locally First (Recommended)

Before AWS deployment, test GridFS locally:

```bash
# 1. Start local Redis
docker run -d -p 6379:6379 redis:7.0

# 2. Start backend
cd /workspaces/Phase1/backend
uvicorn app.main:app --reload

# 3. Test file upload (in another terminal)
# Login first to get token
TOKEN=$(curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@agrimanage.com","password":"admin123"}' | jq -r '.access_token')

# Upload a test file
curl -X POST http://localhost:8000/api/uploads/TESTFARMER01/photo \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_photo.jpg"

# Should return: {"message":"Photo uploaded","file_id":"..."}
# NOT a file path!

# 4. Download the file
curl http://localhost:8000/api/files/<file_id> \
  -H "Authorization: Bearer $TOKEN" \
  --output downloaded.jpg
```

---

## 📝 Manual Deployment Steps

If you prefer step-by-step control:

```bash
cd /workspaces/Phase1/aws-deployment

# Step 1: Clean up
./01-cleanup-aws.sh

# Step 2: Infrastructure
./02-setup-aws-infrastructure.sh
# 📝 SAVE the Redis endpoint from output!

# Step 3: Secrets (enter Redis endpoint when prompted)
./03-create-secrets.sh

# Step 4: IAM Roles
./04-create-iam-roles.sh

# Step 5: Build & Push
./05-build-and-push.sh

# Step 6: Deploy
./06-deploy-ecs-service.sh
```

---

## 🔍 Troubleshooting

### Service won't start
```bash
# Check logs
aws logs tail /ecs/cem-backend --since 10m --region ap-south-1
```

### MongoDB connection fails
- Go to MongoDB Atlas console
- Network Access → Add IP: `0.0.0.0/0` (allow all)
- Database Access → Verify user/password

### Redis connection fails
- Check security group: Must allow port 6379 from ECS tasks
- Verify Redis endpoint in secrets

### Files not uploading
```bash
# Check GridFS in MongoDB
mongosh "<YOUR_ATLAS_URI>"
use zambian_farmer_db
db.getCollectionNames()  // Should see cem_files.files, cem_files.chunks
```

---

## 📚 Key Files

| File | Purpose |
|------|---------|
| `aws-deployment/README.md` | Complete deployment guide |
| `AWS_MIGRATION_SUMMARY.md` | Architecture & data flow |
| `backend/app/services/gridfs_service.py` | GridFS operations |
| `backend/app/routes/files.py` | File download API |
| `aws-deployment/ecs-task-definition.json` | ECS configuration |

---

## 🎬 Next Actions

### Option A: Deploy Now
```bash
cd /workspaces/Phase1/aws-deployment
./00-preflight-check.sh && ./deploy-all.sh
```

### Option B: Test Locally First
```bash
cd /workspaces/Phase1/backend
docker-compose up -d farmer-redis
uvicorn app.main:app --reload
# Test file upload/download
```

### Option C: Review Code
```bash
# Review GridFS changes
cat backend/app/services/gridfs_service.py
cat backend/app/routes/files.py

# Review deployment scripts
cat aws-deployment/deploy-all.sh
```

---

## ✅ Success Criteria

Deployment is successful when:
- [ ] ECS service status: `RUNNING`
- [ ] Health check: `http://<PUBLIC_IP>:8000/api/health` → 200 OK
- [ ] Login works
- [ ] File upload returns `file_id` (not path)
- [ ] File download works via `/api/files/{file_id}`
- [ ] ID card generation creates PDF in GridFS
- [ ] Celery worker logs show task processing
- [ ] No errors in CloudWatch logs

---

## 🆘 Need Help?

1. **Pre-deployment issues:** Run `./00-preflight-check.sh`
2. **Deployment fails:** Check CloudWatch logs
3. **Service issues:** Review `aws-deployment/README.md`
4. **Code questions:** See `AWS_MIGRATION_SUMMARY.md`

---

## 📞 AWS Resource Info

- **Region:** `ap-south-1` (Mumbai)
- **Account ID:** `701708343469`
- **Cluster:** `cem-prod-v2`
- **Service:** `cem-backend-service`
- **ECR Repository:** `cem-backend`

---

**Status:** ✅ Ready for deployment  
**Last Updated:** December 18, 2025

---

## 🎉 After Successful Deployment

1. **Get public IP and save it**
2. **Update mobile app:**
   ```javascript
   // app/config.js
   export const API_BASE_URL = 'http://<PUBLIC_IP>:8000/api';
   ```
3. **Rebuild APK**
4. **Monitor costs in AWS Console**
5. **Set up CloudWatch alarms**
6. **Consider adding ALB for HTTPS**

---

**Let's deploy! 🚀**
