#!/bin/bash
# ============================================
# IAM Roles for ECS Tasks
# ============================================

set -e

REGION="ap-south-1"
ACCOUNT_ID="701708343469"

echo "🔐 Creating IAM roles for ECS..."

# Create trust policy
cat > /tmp/trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create ECS Task Execution Role
echo "📌 Creating ECS Task Execution Role..."
aws iam create-role \
  --role-name ecsTaskExecutionRoleCEM \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  --description "ECS Task Execution Role for CEM project" 2>/dev/null || echo "Role already exists"

# Attach AWS managed policy
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRoleCEM \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Create inline policy for Secrets Manager access
echo "📌 Adding Secrets Manager access policy..."
aws iam put-role-policy \
  --role-name ecsTaskExecutionRoleCEM \
  --policy-name SecretsManagerAccess \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
      {
        \"Effect\": \"Allow\",
        \"Action\": [
          \"secretsmanager:GetSecretValue\",
          \"secretsmanager:DescribeSecret\"
        ],
        \"Resource\": \"arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:cem/*\"
      }
    ]
  }"

# Create ECS Task Role (for application)
echo "📌 Creating ECS Task Role..."
aws iam create-role \
  --role-name ecsTaskRoleCEM \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  --description "ECS Task Role for CEM application" 2>/dev/null || echo "Role already exists"

# Add policies for task role (CloudWatch logs, etc.)
aws iam put-role-policy \
  --role-name ecsTaskRoleCEM \
  --policy-name CloudWatchLogsAccess \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [
      {
        \"Effect\": \"Allow\",
        \"Action\": [
          \"logs:CreateLogGroup\",
          \"logs:CreateLogStream\",
          \"logs:PutLogEvents\"
        ],
        \"Resource\": \"arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/ecs/cem-*\"
      }
    ]
  }"

# Clean up temp file
rm /tmp/trust-policy.json

echo ""
echo "✅ IAM roles created successfully!"
echo ""
echo "📋 Created roles:"
echo "  - ecsTaskExecutionRoleCEM (for pulling images and secrets)"
echo "  - ecsTaskRoleCEM (for application runtime)"
echo ""
echo "ARNs:"
echo "  - arn:aws:iam::${ACCOUNT_ID}:role/ecsTaskExecutionRoleCEM"
echo "  - arn:aws:iam::${ACCOUNT_ID}:role/ecsTaskRoleCEM"
echo ""
echo "Next: Migrate code to use GridFS (see migration guide)"
