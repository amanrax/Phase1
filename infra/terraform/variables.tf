variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "Public subnet CIDR"
  type        = string
  default     = "10.0.1.0/24"
}

variable "project_name" {
  description = "Project prefix for resource names"
  type        = string
  default     = "phase1"
}

variable "s3_bucket_suffix" {
  description = "Suffix for unique S3 bucket name (add org or env)"
  type        = string
  default     = "dev"
}
