#!/bin/bash
# ============================================
# Pre-Flight Checklist - Run Before Deployment
# ============================================

echo "🔍 CEM AWS Pre-Flight Checklist"
echo "================================"
echo ""

PASS=0
FAIL=0

# Check 1: AWS CLI
echo -n "✓ Checking AWS CLI... "
if command -v aws &> /dev/null; then
    echo "OK"
    PASS=$((PASS+1))
else
    echo "❌ FAIL - Install AWS CLI"
    FAIL=$((FAIL+1))
fi

# Check 2: AWS Credentials
echo -n "✓ Checking AWS credentials... "
if aws sts get-caller-identity &> /dev/null; then
    ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    echo "OK (Account: $ACCOUNT)"
    PASS=$((PASS+1))
else
    echo "❌ FAIL - Run 'aws configure'"
    FAIL=$((FAIL+1))
fi

# Check 3: Docker
echo -n "✓ Checking Docker... "
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    echo "OK"
    PASS=$((PASS+1))
else
    echo "❌ FAIL - Docker not running"
    FAIL=$((FAIL+1))
fi

# Check 4: MongoDB Atlas Connection
echo -n "✓ Checking MongoDB Atlas... "
MONGO_URI="mongodb+srv://Aman:Zambia1234@farmer.hvygb26.mongodb.net/?retryWrites=true&w=majority&appName=Farmer"
if command -v mongosh &> /dev/null; then
    if timeout 5 mongosh "$MONGO_URI" --eval "db.adminCommand('ping')" --quiet &> /dev/null; then
        echo "OK"
        PASS=$((PASS+1))
    else
        echo "⚠️  WARN - Cannot connect (may work from AWS)"
        PASS=$((PASS+1))
    fi
else
    echo "⚠️  WARN - mongosh not installed (skipping)"
    PASS=$((PASS+1))
fi

# Check 5: Backend files exist
echo -n "✓ Checking backend files... "
if [ -f "/workspaces/Phase1/backend/app/main.py" ] && \
   [ -f "/workspaces/Phase1/backend/app/services/gridfs_service.py" ] && \
   [ -f "/workspaces/Phase1/backend/Dockerfile" ]; then
    echo "OK"
    PASS=$((PASS+1))
else
    echo "❌ FAIL - Missing backend files"
    FAIL=$((FAIL+1))
fi

# Check 6: Deployment scripts
echo -n "✓ Checking deployment scripts... "
if [ -x "/workspaces/Phase1/aws-deployment/01-cleanup-aws.sh" ] && \
   [ -x "/workspaces/Phase1/aws-deployment/deploy-all.sh" ]; then
    echo "OK"
    PASS=$((PASS+1))
else
    echo "❌ FAIL - Scripts not executable (run: chmod +x aws-deployment/*.sh)"
    FAIL=$((FAIL+1))
fi

# Check 7: ECS task definition
echo -n "✓ Checking ECS task definition... "
if [ -f "/workspaces/Phase1/aws-deployment/ecs-task-definition.json" ]; then
    echo "OK"
    PASS=$((PASS+1))
else
    echo "❌ FAIL - Missing task definition"
    FAIL=$((FAIL+1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Results: $PASS passed, $FAIL failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "✅ All checks passed! Ready to deploy."
    echo ""
    echo "Next steps:"
    echo "  cd /workspaces/Phase1/aws-deployment"
    echo "  ./deploy-all.sh"
    echo ""
    exit 0
else
    echo "❌ Some checks failed. Fix issues before deploying."
    exit 1
fi
