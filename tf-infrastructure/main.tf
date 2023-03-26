terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  required_version = ">= 1.2.0"
}

variable "access_key" {
  description = "aws public access key"
}

variable "secret_key" {
  description = "aws secret access key"
}

provider "aws" {
  region  = "us-west-2"
  access_key  = var.access_key
  secret_key  = var.secret_key
}

variable "github_token" {
  description = "GitHub personal access token"
}

resource "aws_amplify_app" "personal-site" {
  name       = "personal site"
  repository = "https://github.com/KaihWhite/personal-site"
  access_token = var.github_token

  # The default build_spec added by the Amplify Console for React.
  build_spec = <<-EOT
  version: 0.1
  frontend:
    phases:
      preBuild:
        commands:
          - npm install
      build:
        commands:
          - npm run build
    artifacts:
      baseDirectory: .next
      files:
        - '**/*'
    cache:
      paths:
        - node_modules/**/*
        - .next/cache/**/*
EOT

  custom_rule {
  source      = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json)$)([^.]+$)/>"
  target      = "/index.html"
  status      = "200"
  condition   = "404"
  }

  custom_rule {
  source      = "/_next/static/<*>"
  target      = "/_next/static/<*>"
  status      = "200"
  }

  environment_variables = {
    ENV = "dev"
  }
}

resource "aws_amplify_branch" "development" {
  app_id      = aws_amplify_app.personal-site.id
  branch_name = "develop"
  framework = "React"
  stage     = "DEVELOPMENT"
}

resource "aws_amplify_branch" "master" {
  app_id      = aws_amplify_app.personal-site.id
  branch_name = "master"
  framework = "React"
  stage     = "PRODUCTION"
}
