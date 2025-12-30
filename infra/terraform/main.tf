terraform {
  required_version = ">= 1.2"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# --- VPC ---
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  tags = {
    Name = "${var.project_name}-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidr
  map_public_ip_on_launch = true
  tags = {
    Name = "${var.project_name}-public-subnet"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags = { Name = "${var.project_name}-igw" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "${var.project_name}-public-rt" }
}

resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# --- ECR ---
resource "aws_ecr_repository" "app" {
  name                 = "${var.project_name}-app"
  image_tag_mutability = "MUTABLE"
  tags = { project = var.project_name }
}

# --- S3 for uploads/backups ---
resource "aws_s3_bucket" "uploads" {
  bucket = "${var.project_name}-uploads-${var.s3_bucket_suffix}"
  acl    = "private"
  force_destroy = false
  tags = { project = var.project_name }
}

# --- ECS cluster ---
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
}

# --- IAM role for ECS task execution ---
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.project_name}-ecs-task-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_exec_policy" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# --- ALB ---
resource "aws_lb" "alb" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = [aws_subnet.public.id]
  tags = { project = var.project_name }
}

resource "aws_lb_target_group" "tg" {
  name     = "${var.project_name}-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.alb.arn
  port              = "80"
  protocol          = "HTTP"
  default_action {
    type = "forward"
    target_group_arn = aws_lb_target_group.tg.arn
  }
}

# --- CloudFront (basic, using ALB as custom origin) ---
resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_lb.alb.dns_name
    origin_id   = "alb-origin"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "alb-origin"

    forwarded_values {
      query_string = true
      headers      = ["Origin", "Authorization", "Accept", "Content-Type"]
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 60
    max_ttl                = 3600
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = { project = var.project_name }
}

# --- Secrets Manager placeholder ---
resource "aws_secretsmanager_secret" "app_secret" {
  name = "${var.project_name}/app"
  description = "Placeholder secret for Phase1 application (store JWT keys, DB URIs, etc)"
  tags = { project = var.project_name }
}

resource "aws_secretsmanager_secret_version" "app_secret_version" {
  secret_id     = aws_secretsmanager_secret.app_secret.id
  secret_string = jsonencode({ placeholder = "REPLACE_ME" })
}
