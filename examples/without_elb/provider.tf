terraform {
  required_version = ">= 0.12"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.53"
    }

    null = {
      source  = "hashicorp/null"
      version = "~> 2.1"
    }

    archive = {
      source  = "hashicorp/archive"
      version = "~> 1.2"
    }
  }
}

provider "aws" {
  region = local.region
}
