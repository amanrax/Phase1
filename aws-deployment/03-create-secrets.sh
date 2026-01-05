#!/bin/bash
# ============================================
# AWS Secrets Manager - Create Production Secrets
# ============================================

# SAFETY GUARD: AWS secrets creation temporarily DISABLED
echo "[SAFE-GUARD] AWS secrets creation disabled. Remove guard to re-enable." >&2
exit 0

set -e

REGION="ap-south-1"

# Source values from backend/.env (DO NOT commit this with real values!)
# Or set them manually here:

# Get Redis endpoint from previous step
echo "Enter Redis endpoint (from step 2): "
read REDIS_ENDPOINT
REDIS_URL="redis://${REDIS_ENDPOINT}:6379/0"

echo ""
echo "🔐 Creating secrets in AWS Secrets Manager..."

# MongoDB URI (using your existing Atlas connection)
echo "📌 Creating MongoDB URI secret..."
aws secretsmanager create-secret \
  --name cem/mongo-uri \
  --description "MongoDB Atlas connection string" \
  --secret-string "${MONGODB_URL}" \
  --region $REGION

# JWT Secret
echo "📌 Creating JWT secret..."
aws secretsmanager create-secret \
  --name cem/jwt-secret \
  --description "JWT signing secret" \
  --secret-string "58073eebc4dbe24af6de85a541363740bc82bab47eeccf7f90b4a1d52995418f" \
  --region $REGION

# Secret Key
echo "📌 Creating encryption secret key..."
aws secretsmanager create-secret \
  --name cem/secret-key \
  --description "Application secret key" \
  --secret-string "supersecretkey_agrimanage_2025" \
  --region $REGION

# Redis URL
echo "📌 Creating Redis URL secret..."
aws secretsmanager create-secret \
  --name cem/redis-url \
  --description "Redis connection URL" \
  --secret-string "$REDIS_URL" \
  --region $REGION

# Celery Broker (same as Redis)
echo "📌 Creating Celery broker URL secret..."
aws secretsmanager create-secret \
  --name cem/celery-broker-url \
  --description "Celery broker connection URL" \
  --secret-string "$REDIS_URL" \
  --region $REGION

# Admin credentials
echo "📌 Creating admin credentials..."
aws secretsmanager create-secret \
  --name cem/admin-email \
  --description "Seed admin email" \
  --secret-string "admin@agrimanage.com" \
  --region $REGION

aws secretsmanager create-secret \
  --name cem/admin-password \
  --description "Seed admin password" \
  --secret-string "admin123" \
  --region $REGION

# MongoDB DB Name
echo "📌 Creating MongoDB database name..."
aws secretsmanager create-secret \
  --name cem/mongo-db-name \
  --description "MongoDB database name" \
  --secret-string "zambian_farmer_db" \
  --region $REGION

echo ""
echo "✅ All secrets created successfully!"
echo ""
echo "📋 Created secrets:"
echo "  - cem/mongo-uri"
echo "  - cem/jwt-secret"
echo "  - cem/secret-key"
echo "  - cem/redis-url"
echo "  - cem/celery-broker-url"
echo "  - cem/admin-email"
echo "  - cem/admin-password"
echo "  - cem/mongo-db-name"
echo ""
echo "Next: Run 04-create-iam-roles.sh"
