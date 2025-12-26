#!/usr/bin/env bash
# scripts/aws_cleanup_force.sh
# Destructive: Deletes many AWS resources for the account/region you run this in.
# MUST be run locally by an account owner with admin credentials.
# WARNING: IRREVERSIBLE. DO NOT RUN UNLESS YOU UNDERSTAND THE CONSEQUENCES.

set -euo pipefail

usage(){
  cat <<EOF
Usage: AWS_PROFILE=default ./scripts/aws_cleanup_force.sh --region <region> [--domain <cloudfront-domain>] [--cluster <ecs-cluster>]

This script will:
 - Attempt to disable+delete CloudFront distribution for the domain (if found)
 - Delete ECS services, deregister taskdefs, delete cluster
 - Delete ECR repos and images
 - Delete ALBs / target groups / listeners
 - Terminate EC2 instances with tags matching the project
 - Delete RDS instances (prompt)
 - Empty and delete S3 buckets matching common project names
 - Delete SecretsManager secrets with project prefix
 - Delete CloudWatch log groups matching project

Final confirmation REQUIRED: type the exact phrase: DELETE EVERYTHING

EOF
}

if [[ ${1:-} == "-h" || ${1:-} == "--help" ]]; then
  usage
  exit 0
fi

REGION=""
DOMAIN="d118h66w5gx0vz.cloudfront.net"
CLUSTER="ziamis-cluster"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --region) REGION="$2"; shift 2;;
    --domain) DOMAIN="$2"; shift 2;;
    --cluster) CLUSTER="$2"; shift 2;;
    *) echo "Unknown arg: $1"; usage; exit 1;;
  esac
done

if [ -z "$REGION" ]; then
  echo "--region is required"
  usage
  exit 1
fi

echo "*** DESTRUCTIVE CLEANUP SCRIPT ***"
echo "Region: $REGION"
echo "CloudFront domain: $DOMAIN"
echo "ECS cluster: $CLUSTER"

echo "You are about to PERMANENTLY DELETE many AWS resources in the account tied to your credentials."
echo "This INCLUDES data (S3, DBs), compute (ECS, EC2), registries (ECR), and CDN (CloudFront)."

echo "If you are NOT the account owner or not 100% sure, exit now (CTRL-C)."

echo
read -p "Type 'DELETE EVERYTHING' to proceed: " CONFIRM
if [ "$CONFIRM" != "DELETE EVERYTHING" ]; then
  echo "Aborting - confirmation mismatch."
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "aws cli not found. Install and configure AWS CLI before running.";
  exit 1
fi

echo "Running destructive cleanup. This may take several minutes."

# Helper: run with AWS_PROFILE if set in environment
AWS_CMD="aws --region $REGION"

# 1) CloudFront: find distribution for domain, disable and delete
DIST_ID=$($AWS_CMD cloudfront list-distributions --query "DistributionList.Items[?DomainName=='${DOMAIN}'].Id" --output text || true)
if [ -n "$DIST_ID" ]; then
  echo "Found CloudFront distribution $DIST_ID for $DOMAIN. Disabling..."
  # fetch config and etag
  tmpf=$(mktemp)
  $AWS_CMD cloudfront get-distribution-config --id $DIST_ID > $tmpf
  ETAG=$(jq -r '.ETag' $tmpf)
  jq '.DistributionConfig.Enabled=false' $tmpf > ${tmpf}.new
  $AWS_CMD cloudfront update-distribution --id $DIST_ID --if-match "$ETAG" --distribution-config file://${tmpf}.new
  echo "Waiting 60s for invalidation of deployment..."
  sleep 60
  # get new etag then delete
  ETAG_NEW=$($AWS_CMD cloudfront get-distribution-config --id $DIST_ID --query ETag --output text)
  $AWS_CMD cloudfront delete-distribution --id $DIST_ID --if-match "$ETAG_NEW"
  echo "CloudFront $DIST_ID delete requested."
else
  echo "No CloudFront distribution found for $DOMAIN."
fi

# 2) ECS: scale to 0, delete services, deregister taskdefs, delete cluster
if $AWS_CMD ecs describe-clusters --clusters $CLUSTER >/dev/null 2>&1; then
  echo "Processing ECS cluster $CLUSTER"
  SVC_ARNS=$($AWS_CMD ecs list-services --cluster $CLUSTER --query 'serviceArns[]' --output text || true)
  for s in $SVC_ARNS; do
    echo "Updating service $s to desired-count 0 and deleting"
    $AWS_CMD ecs update-service --cluster $CLUSTER --service $s --desired-count 0 || true
    $AWS_CMD ecs delete-service --cluster $CLUSTER --service $s --force || true
  done
  # Stop running tasks
  TASKS=$($AWS_CMD ecs list-tasks --cluster $CLUSTER --query 'taskArns[]' --output text || true)
  for t in $TASKS; do
    $AWS_CMD ecs stop-task --cluster $CLUSTER --task $t || true
  done
  # Deregister task definitions
  TD_ARNS=$($AWS_CMD ecs list-task-definitions --query 'taskDefinitionArns[]' --output text || true)
  for td in $TD_ARNS; do
    $AWS_CMD ecs deregister-task-definition --task-definition $td || true
  done
  $AWS_CMD ecs delete-cluster --cluster $CLUSTER || true
else
  echo "ECS cluster $CLUSTER not found or insufficient permission."
fi

# 3) ECR: delete all repos and images
REPOS=$($AWS_CMD ecr describe-repositories --query 'repositories[].repositoryName' --output text || true)
for r in $REPOS; do
  echo "Deleting images and repository $r"
  IMAGES_JSON=$(mktemp)
  $AWS_CMD ecr list-images --repository-name $r --output json > $IMAGES_JSON || true
  $AWS_CMD ecr batch-delete-image --repository-name $r --image-ids file://$IMAGES_JSON || true
  $AWS_CMD ecr delete-repository --repository-name $r --force || true
done

# 4) ALB/ELB: delete load balancers found with name containing 'cem' or 'backend'
LBS=$($AWS_CMD elbv2 describe-load-balancers --query 'LoadBalancers[].LoadBalancerArn' --output text || true)
for lb in $LBS; do
  name=$($AWS_CMD elbv2 describe-load-balancers --load-balancer-arns $lb --query 'LoadBalancers[0].LoadBalancerName' --output text || true)
  if echo "$name" | grep -E 'cem|backend|ziamis' >/dev/null; then
    echo "Deleting listeners and target groups for LB $name"
    LSN=$(mktemp)
    $AWS_CMD elbv2 describe-listeners --load-balancer-arn $lb --query 'Listeners[].ListenerArn' --output text > $LSN || true
    for l in $(cat $LSN); do
      $AWS_CMD elbv2 delete-listener --listener-arn $l || true
    done
    TGS=$($AWS_CMD elbv2 describe-target-groups --load-balancer-arn $lb --query 'TargetGroups[].TargetGroupArn' --output text || true)
    for tg in $TGS; do
      $AWS_CMD elbv2 delete-target-group --target-group-arn $tg || true
    done
    $AWS_CMD elbv2 delete-load-balancer --load-balancer-arn $lb || true
  fi
done

# 5) EC2: terminate instances tagged with project names
INST=$( $AWS_CMD ec2 describe-instances --filters "Name=tag:Name,Values=*cem* *ziamis*" --query 'Reservations[].Instances[].InstanceId' --output text || true)
if [ -n "$INST" ]; then
  echo "Terminating EC2 instances: $INST"
  $AWS_CMD ec2 terminate-instances --instance-ids $INST || true
fi

# 6) RDS: list instances matching 'cem' or 'ziamis' and delete after snapshot
RDS_INSTANCES=$($AWS_CMD rds describe-db-instances --query 'DBInstances[].DBInstanceIdentifier' --output text || true)
for db in $RDS_INSTANCES; do
  if echo "$db" | grep -E 'cem|ziamis|phase1' >/dev/null; then
    SNAP="${db}-predelete-$(date +%s)"
    echo "Creating final snapshot $SNAP for $db"
    $AWS_CMD rds create-db-snapshot --db-instance-identifier $db --db-snapshot-identifier $SNAP || true
    echo "Deleting RDS instance $db"
    $AWS_CMD rds delete-db-instance --db-instance-identifier $db --skip-final-snapshot false --final-db-snapshot-identifier ${db}-final-$(date +%s) || true
  fi
done

# 7) ElastiCache
CACHE_IDS=$($AWS_CMD elasticache describe-cache-clusters --query 'CacheClusters[].CacheClusterId' --output text || true)
for c in $CACHE_IDS; do
  if echo "$c" | grep -E 'cem|ziamis' >/dev/null; then
    $AWS_CMD elasticache delete-cache-cluster --cache-cluster-id $c || true
  fi
done

# 8) S3: empty and delete buckets matching name patterns
BUCKETS=$($AWS_CMD s3api list-buckets --query 'Buckets[].Name' --output text || true)
for b in $BUCKETS; do
  if echo "$b" | grep -E 'ziamis|cem|phase1' >/dev/null; then
    echo "Emptying and deleting bucket: $b"
    $AWS_CMD s3 rm s3://$b --recursive || true
    $AWS_CMD s3api delete-bucket --bucket $b || true
  fi
done

# 9) Secrets Manager: delete secrets with prefix 'ziamis' (force delete)
SECRETS=$($AWS_CMD secretsmanager list-secrets --query "SecretList[?contains(Name, 'ziamis')].Name" --output text || true)
for s in $SECRETS; do
  echo "Deleting secret: $s"
  $AWS_CMD secretsmanager delete-secret --secret-id "$s" --force-delete-without-recovery || true
done

# 10) CloudWatch logs: delete groups matching pattern
LOGS=$($AWS_CMD logs describe-log-groups --query 'logGroups[].logGroupName' --output text || true)
for lg in $LOGS; do
  if echo "$lg" | grep -E 'cem|ziamis|backend' >/dev/null; then
    echo "Deleting log group: $lg"
    $AWS_CMD logs delete-log-group --log-group-name "$lg" || true
  fi
done

# 11) Route53: list hosted zones and delete ones matching domain (CAUTION)
ZONES=$($AWS_CMD route53 list-hosted-zones --query 'HostedZones[].Id' --output text || true)
for z in $ZONES; do
  NAME=$($AWS_CMD route53 get-hosted-zone --id $z --query 'HostedZone.Name' --output text || true)
  if echo "$NAME" | grep -E 'example.com|ziamis' >/dev/null; then
    echo "Hosted zone $NAME ($z) matches pattern; skipping automated deletion. Delete manually if required."
  fi
done

# Final: recommend IAM key rotation
cat <<EOF
Destructive cleanup complete (best-effort). Please rotate any exposed AWS access keys immediately:
 - AWS Console -> IAM -> Users -> Security credentials -> Delete exposed access keys

If you want, run the script again to catch remaining resources, or run the interactive cleanup script scripts/aws_cleanup.sh for safer operation.
EOF

exit 0
