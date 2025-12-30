Terraform baseline for Phase1

This folder contains a minimal Terraform baseline to provision core AWS resources used by the Phase1 project:

- VPC (single AZ minimal subnet)
- ECR repository for Docker images
- ECS Fargate cluster
- ALB (Application Load Balancer)
- S3 bucket for uploads
- CloudFront distribution (origin: ALB)
- Secrets Manager placeholder secret
- IAM role for ECS task execution

This is a starting scaffold — review, harden, and adapt to your org's policies before applying in production.

Quick start:

1. Configure AWS credentials with least-privilege admin (do not use exposed keys):

```bash
export AWS_PROFILE=ci-admin
export TF_VAR_region=us-east-1
```

2. Initialize Terraform

```bash
cd infra/terraform
terraform init
terraform plan -out plan.tfplan
terraform apply plan.tfplan
```

Notes:
- This uses basic defaults and creates public subnets for simplicity.
- Consider adding a remote `terraform` state backend (S3 + DynamoDB) before team use.
- Review IAM policies and tighten permissions.

Files:
- `main.tf` — core resources
- `variables.tf` — variables and defaults
- `outputs.tf` — useful outputs
