terraform {
  required_version = ">= 0.12"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.53"
    }

    http = {
      source  = "hashicorp/http"
      version = "~> 1.1"
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

variable "region" {
  ## Sorry I'm from this region
  default = "ap-southeast-2"
}

provider "aws" {
  region                      = var.region
  skip_metadata_api_check     = true
  skip_region_validation      = true
  skip_credentials_validation = true
}
