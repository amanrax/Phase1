output "vpc_id" {
  description = "VPC id"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "Public subnet id"
  value       = aws_subnet.public.id
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.app.repository_url
}

output "s3_uploads_bucket" {
  description = "S3 bucket for uploads"
  value       = aws_s3_bucket.uploads.id
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "alb_dns" {
  value = aws_lb.alb.dns_name
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.cdn.domain_name
}

output "secrets_manager_secret_arn" {
  value = aws_secretsmanager_secret.app_secret.arn
}
