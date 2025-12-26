#!/usr/bin/env bash
# scripts/aws_cleanup.sh
# Safe, interactive AWS cleanup helper for this project.
# Usage:
#   ./scripts/aws_cleanup.sh [--dry-run] [--yes] --region <region> [--dist-id <dist-id>] [--cluster <cluster>]
# Examples:
#   DRY RUN (show commands):
#     AWS_PROFILE=default ./scripts/aws_cleanup.sh --dry-run --region ap-south-1 --domain d118h66w5gx0vz.cloudfront.net --cluster ziamis-cluster
#   Execute interactively (prompts):
#     AWS_PROFILE=default ./scripts/aws_cleanup.sh --region ap-south-1 --domain d118h66w5gx0vz.cloudfront.net --cluster ziamis-cluster
#   Auto-run without prompts (DANGEROUS):
#     AWS_PROFILE=default ./scripts/aws_cleanup.sh --yes --region ap-south-1 --domain d118h66w5gx0vz.cloudfront.net --cluster ziamis-cluster

set -u

DRY_RUN=false
AUTO_YES=false
REGION=""
DIST_ID=""
DOMAIN="d118h66w5gx0vz.cloudfront.net"
CLUSTER=""
EXECUTE=false

print_usage(){
  sed -n '1,120p' "$0" | sed -n '3,26p'
}

run_cmd(){
  local cmd="$1"
  echo "+ $cmd"
  if [ "$DRY_RUN" = false ] && [ "$AUTO_YES" = true ]; then
    eval "$cmd"
    return $?
  fi
  if [ "$DRY_RUN" = false ]; then
    read -p "Execute above command? [y/N]: " yn
    if [[ "$yn" =~ ^[Yy]$ ]]; then
      eval "$cmd"
      return $?
    fi
    return 0
  fi
  # dry-run -> do not execute
  return 0
}

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --yes) AUTO_YES=true; shift ;;
    --region) REGION="$2"; shift 2 ;;
    --dist-id) DIST_ID="$2"; shift 2 ;;
    --domain) DOMAIN="$2"; shift 2 ;;
    --cluster) CLUSTER="$2"; shift 2 ;;
    -h|--help) print_usage; exit 0 ;;
    *) echo "Unknown arg: $1"; print_usage; exit 1 ;;
  esac
done

if [ -z "$REGION" ]; then
  echo "--region is required"
  exit 1
fi

echo "AWS cleanup helper"
echo "Region: $REGION"
echo "Domain: $DOMAIN"
echo "Dry-run: $DRY_RUN"
echo "Auto-yes: $AUTO_YES"

# Check AWS CLI
if ! command -v aws >/dev/null 2>&1; then
  echo "aws cli not found. Install and configure AWS CLI with credentials before running this script."
  exit 1
fi

# If dist id not provided, try to find it
if [ -z "$DIST_ID" ]; then
  echo "Looking up CloudFront distribution for domain $DOMAIN..."
  DIST_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?DomainName=='${DOMAIN}'].Id" --output text 2>/dev/null || true)
  if [ -z "$DIST_ID" ]; then
    echo "Could not find distribution by domain. You can pass --dist-id <id> to target a specific distribution."
  else
    echo "Found distribution id: $DIST_ID"
  fi
else
  echo "Using provided distribution id: $DIST_ID"
fi

# Step: CloudFront disable/delete (if DIST_ID present)
if [ -n "$DIST_ID" ]; then
  echo "\n=== CloudFront: disable and delete distribution $DIST_ID ==="
  echo "Fetching distribution config..."
  CMD="aws cloudfront get-distribution-config --id $DIST_ID --output json"
  echo "Will run: $CMD"
  if [ "$DRY_RUN" = false ]; then
    distcfg=$(aws cloudfront get-distribution-config --id $DIST_ID 2>/dev/null) || distcfg=""
    if [ -z "$distcfg" ]; then
      echo "Unable to fetch distribution config (check permissions)."
    else
      ETAG=$(echo "$distcfg" | jq -r '.ETag')
      echo "ETag: $ETAG"
      echo "You must update the 'Enabled' flag to false in the DistributionConfig and call update-distribution."
      echo "Example disable command (manual edit required):"
      echo "  aws cloudfront get-distribution-config --id $DIST_ID > /tmp/dist-config.json"
      echo "  edit /tmp/dist-config.json -> set DistributionConfig.Enabled=false"
      echo "  aws cloudfront update-distribution --id $DIST_ID --if-match $ETAG --distribution-config file:///tmp/dist-config.json"
      echo "After disabled and deployed, delete with: aws cloudfront delete-distribution --id $DIST_ID --if-match <etag>"
      if [ "$AUTO_YES" = true ]; then
        echo "Auto mode: skipping automated disabling due to required manual edit step."
      fi
    fi
  fi
fi

# Step: ECS services and cluster
if [ -n "$CLUSTER" ]; then
  echo "\n=== ECS cluster: scale down and delete services in cluster $CLUSTER ==="
  echo "Listing services..."
  SVC_ARNS=$(aws ecs list-services --cluster $CLUSTER --query 'serviceArns[]' --output text 2>/dev/null || true)
  if [ -z "$SVC_ARNS" ]; then
    echo "No services found in cluster $CLUSTER or insufficient permissions."
  else
    for s in $SVC_ARNS; do
      echo "Service: $s"
      # scale to zero
      run_cmd "aws ecs update-service --cluster $CLUSTER --service $s --desired-count 0"
      # delete service
      run_cmd "aws ecs delete-service --cluster $CLUSTER --service $s --force"
    done
    echo "Deregistering task definitions (careful)..."
    TASKDEFS=$(aws ecs list-task-definitions --query 'taskDefinitionArns[]' --output text)
    for td in $TASKDEFS; do
      run_cmd "aws ecs deregister-task-definition --task-definition $td"
    done
    echo "Deleting cluster $CLUSTER"
    run_cmd "aws ecs delete-cluster --cluster $CLUSTER"
  fi
fi

# ECR repos (list all repos under account; prompt to delete)
echo "\n=== ECR: list repositories (will propose deletion) ==="
REPOS=$(aws ecr describe-repositories --query 'repositories[].repositoryName' --output text 2>/dev/null || true)
if [ -z "$REPOS" ]; then
  echo "No ECR repositories found or insufficient permissions."
else
  echo "Found repos:"
  echo "$REPOS"
  for r in $REPOS; do
    echo "Prepare delete for repo: $r"
    IMAGES_JSON="/tmp/ecr_images_${r}.json"
    aws ecr list-images --repository-name $r --output json > "$IMAGES_JSON" 2>/dev/null || true
    echo "Example commands to remove images and repo for $r:" 
    echo "  aws ecr batch-delete-image --repository-name $r --image-ids file://$IMAGES_JSON"
    echo "  aws ecr delete-repository --repository-name $r --force"
    if [ "$AUTO_YES" = true ]; then
      run_cmd "aws ecr batch-delete-image --repository-name $r --image-ids file://$IMAGES_JSON"
      run_cmd "aws ecr delete-repository --repository-name $r --force"
    fi
  done
fi

# S3 buckets - list buckets with project name 'ziamis' or similar
echo "\n=== S3: listing buckets containing 'ziamis' or 'cem' ==="
BUCKETS=$(aws s3api list-buckets --query 'Buckets[].Name' --output text 2>/dev/null || true)
for b in $BUCKETS; do
  if echo "$b" | grep -E 'ziamis|cem|phase1' >/dev/null; then
    echo "Found bucket: $b"
    echo "Commands: aws s3 rm s3://$b --recursive; aws s3api delete-bucket --bucket $b"
    if [ "$AUTO_YES" = true ]; then
      run_cmd "aws s3 rm s3://$b --recursive"
      run_cmd "aws s3api delete-bucket --bucket $b"
    fi
  fi
done

# CloudWatch Log Groups (list ones that match project)
echo "\n=== CloudWatch Logs: listing log groups that contain 'cem' or 'ziamis' ==="
LOGS=$(aws logs describe-log-groups --query 'logGroups[].logGroupName' --output text 2>/dev/null || true)
for lg in $LOGS; do
  if echo "$lg" | grep -E 'cem|ziamis|backend' >/dev/null; then
    echo "Found log group: $lg"
    echo "Command: aws logs delete-log-group --log-group-name '$lg'"
    if [ "$AUTO_YES" = true ]; then
      run_cmd "aws logs delete-log-group --log-group-name '$lg'"
    fi
  fi
done

# Secrets Manager - list secrets with prefix
echo "\n=== Secrets Manager: listing secrets containing 'ziamis' ==="
SECRETS=$(aws secretsmanager list-secrets --query "SecretList[?contains(Name, 'ziamis')].Name" --output text 2>/dev/null || true)
if [ -n "$SECRETS" ]; then
  echo "Secrets: $SECRETS"
  for s in $SECRETS; do
    echo "Command: aws secretsmanager delete-secret --secret-id '$s' --force-delete-without-recovery"
    if [ "$AUTO_YES" = true ]; then
      run_cmd "aws secretsmanager delete-secret --secret-id '$s' --force-delete-without-recovery"
    fi
  done
fi

# Final note
echo "\nCleanup script finished (dry-run=$DRY_RUN). Review above actions."
if [ "$DRY_RUN" = true ]; then
  echo "Re-run without --dry-run and confirm prompts (or use --yes) to execute." 
fi

exit 0
