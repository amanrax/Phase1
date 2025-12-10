# AWS Deployment Checklist

Follow this step-by-step to deploy the ZIAMIS backend to AWS.

## Pre-Deployment ✓
- [ ] AWS Account created with Student Developer Pack
- [ ] AWS CLI installed: `aws --version`
- [ ] AWS credentials configured: `aws configure`
- [ ] Docker installed: `docker --version`
- [ ] Git repository up-to-date

## Phase 1: Secrets & Credentials
- [ ] Generate SECRET_KEY: `openssl rand -hex 32`
- [ ] Create MongoDB DocumentDB cluster (or use Atlas)
  - [ ] Get connection string: `mongodb+srv://admin:password@cluster.xxxxx.docdb.amazonaws.com/ziamis`
- [ ] Create ElastiCache Redis instance
  - [ ] Get connection string: `redis://:password@endpoint:6379/0`

## Phase 2: Container Registry (ECR)
- [ ] Run: `aws ecr create-repository --repository-name ziamis-backend --region us-east-1`
- [ ] Login to ECR: `aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com`
- [ ] Build Docker image: `docker build -t ziamis-backend:latest backend/`
- [ ] Tag image: `docker tag ziamis-backend:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ziamis-backend:latest`
- [ ] Push to ECR: `docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/ziamis-backend:latest`

## Phase 3: AWS Secrets Manager
- [ ] Create MongoDB secret: `aws secretsmanager create-secret --name ziamis/mongodb-url --secret-string "mongodb+srv://..."`
- [ ] Create Redis secret: `aws secretsmanager create-secret --name ziamis/redis-url --secret-string "redis://..."`
- [ ] Create SECRET_KEY: `aws secretsmanager create-secret --name ziamis/secret-key --secret-string "your-secret-key"`

## Phase 4: CloudWatch
- [ ] Create log group: `aws logs create-log-group --log-group-name /ecs/ziamis-backend`
- [ ] Create log group: `aws logs create-log-group --log-group-name /ecs/ziamis-celery-worker`

## Phase 5: Networking
- [ ] Create VPC (or use default): `aws ec2 create-vpc --cidr-block 10.0.0.0/16`
- [ ] Create security group: `aws ec2 create-security-group --group-name ziamis-sg --description "Backend" --vpc-id vpc-xxx`
- [ ] Allow inbound 8000: `aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 8000 --cidr 0.0.0.0/0`
- [ ] Create subnets (at least 2 for ALB):
  - [ ] Subnet 1: `aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24`
  - [ ] Subnet 2: `aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.2.0/24`

## Phase 6: Load Balancer
- [ ] Create Application Load Balancer: `aws elbv2 create-load-balancer --name ziamis-alb --subnets subnet-xxx subnet-yyy`
- [ ] Create target group: `aws elbv2 create-target-group --name ziamis-backend --protocol HTTP --port 8000 --vpc-id vpc-xxx`
- [ ] Register HTTP listener: `aws elbv2 create-listener --load-balancer-arn arn:aws:... --protocol HTTP --port 80 --default-actions Type=forward,TargetGroupArn=arn:aws:...`
- [ ] Get ALB DNS: `aws elbv2 describe-load-balancers --load-balancer-arns arn:aws:... --query 'LoadBalancers[0].DNSName'`

## Phase 7: SSL Certificate (ACM)
- [ ] Request certificate: `aws acm request-certificate --domain-name api.yourdomain.com --validation-method DNS`
- [ ] Validate DNS (add CNAME record in your DNS provider)
- [ ] Update ALB listener to HTTPS (once certificate is validated)

## Phase 8: ECS Cluster & Service
- [ ] Create cluster: `aws ecs create-cluster --cluster-name ziamis-prod`
- [ ] Register task definition: `aws ecs register-task-definition --cli-input-json file://ecs-task-definition.json`
- [ ] Create service:
```bash
aws ecs create-service \
  --cluster ziamis-prod \
  --service-name ziamis-api \
  --task-definition ziamis-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/ziamis-backend/xxx,containerName=backend,containerPort=8000"
```

## Phase 9: Route 53 DNS
- [ ] Create hosted zone (if needed)
- [ ] Add CNAME record pointing ALB to your domain:
```bash
aws route53 change-resource-record-sets --hosted-zone-id ZONE_ID --change-batch '{
  "Changes": [{
    "Action": "CREATE",
    "ResourceRecordSet": {
      "Name": "api.yourdomain.com",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [{"Value": "ziamis-alb-xxx.us-east-1.elb.amazonaws.com"}]
    }
  }]
}'
```

## Phase 10: S3 for Static Uploads
- [ ] Create bucket: `aws s3 mb s3://ziamis-uploads --region us-east-1`
- [ ] Enable CORS:
```bash
aws s3api put-bucket-cors --bucket ziamis-uploads --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET","POST","PUT","DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}'
```

## Phase 11: CloudFront CDN
- [ ] Create distribution pointing to S3 bucket
- [ ] Get CloudFront domain name

## Phase 12: Mobile App Update
- [ ] Update `frontend/.env.production`:
  ```
  VITE_API_PROD_URL=https://api.yourdomain.com
  VITE_API_BASE_URL=https://api.yourdomain.com
  ```
- [ ] Rebuild APK: `cd frontend && npm run build && npx cap sync android && cd android && ./gradlew assembleDebug`
- [ ] Test on device

## Post-Deployment
- [ ] Test API endpoint: `curl -I https://api.yourdomain.com/api/auth/login`
- [ ] Check ECS service status: `aws ecs describe-services --cluster ziamis-prod --services ziamis-api`
- [ ] View logs: `aws logs tail /ecs/ziamis-backend --follow`
- [ ] Create CloudWatch alarms for monitoring
- [ ] Set up auto-scaling policies (optional)

## Troubleshooting

**Task won't start:**
- Check logs: `aws logs tail /ecs/ziamis-backend --follow`
- Verify secrets are accessible
- Check security group allows outbound to DocumentDB/Redis

**Can't connect to database:**
- Verify DocumentDB security group allows inbound from ECS security group
- Check connection string in Secrets Manager

**Mobile app can't reach API:**
- Verify ALB is healthy: `aws elbv2 describe-target-health --target-group-arn arn:aws:...`
- Test endpoint: `curl -v https://api.yourdomain.com/api/auth/login`
- Check CORS in `backend/app/main.py`

## Cost Monitoring
- [ ] Enable billing alerts in AWS Console
- [ ] Set up CloudWatch alarms for high costs
- [ ] Review EC2/ECS usage regularly

## Cleanup (when done testing)
```bash
# Delete service
aws ecs delete-service --cluster ziamis-prod --service ziamis-api --force

# Delete cluster
aws ecs delete-cluster --cluster ziamis-prod

# Delete ALB
aws elbv2 delete-load-balancer --load-balancer-arn arn:aws:...

# Delete ECR repository
aws ecr delete-repository --repository-name ziamis-backend --force

# Delete S3 bucket
aws s3 rb s3://ziamis-uploads --force

# Delete secrets
aws secretsmanager delete-secret --secret-id ziamis/mongodb-url --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id ziamis/redis-url --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id ziamis/secret-key --force-delete-without-recovery
```
