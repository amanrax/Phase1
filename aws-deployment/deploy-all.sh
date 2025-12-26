#!/bin/bash
# ============================================
# Master Deployment Script
# ============================================

# SAFETY GUARD: AWS deployment scripts temporarily DISABLED
# Reason: User requested to disable AWS automation to avoid unexpected charges.
# To re-enable, remove or comment out the following two lines.
echo "[SAFE-GUARD] AWS deployment disabled. Remove guard to re-enable." >&2
exit 0

set -e

echo "🚀 CEM AWS Deployment - Complete Pipeline"
echo "=========================================="
echo ""

# Step 1: Cleanup
echo "Step 1: Cleanup old resources"
echo "------------------------------"
read -p "Run cleanup? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./01-cleanup-aws.sh
fi

# Step 2: Infrastructure
echo ""
echo "Step 2: Setup AWS infrastructure"
echo "---------------------------------"
read -p "Create ECS cluster, Redis, etc.? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./02-setup-aws-infrastructure.sh
fi

# Step 3: Secrets
echo ""
echo "Step 3: Create secrets in AWS Secrets Manager"
echo "-----------------------------------------------"
read -p "Create secrets? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./03-create-secrets.sh
fi

# Step 4: IAM Roles
echo ""
echo "Step 4: Create IAM roles"
echo "------------------------"
read -p "Create IAM roles? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./04-create-iam-roles.sh
fi

# Step 5: Build & Push
echo ""
echo "Step 5: Build and push Docker image"
echo "------------------------------------"
read -p "Build and push image? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./05-build-and-push.sh
fi

# Step 6: Deploy
echo ""
echo "Step 6: Deploy ECS service"
echo "--------------------------"
read -p "Deploy to ECS? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./06-deploy-ecs-service.sh
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Get ECS task public IP"
echo "   2. Update frontend environment with new backend URL"
echo "   3. Test API endpoints"
echo "   4. Monitor logs in CloudWatch"
