terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  region  = "us-west-2"
}

resource "aws_amplify_app" "personal-site" {
  name       = "personal site"
  repository = "https://github.com/KaihWhite/personal-site"

  # The default build_spec added by the Amplify Console for React.
  build_spec = <<-EOT
    version: 0.1
    frontend:
      phases:
        preBuild:
          commands:
            - yarn install
        build:
          commands:
            - yarn run build
      artifacts:
        baseDirectory: build
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
  EOT

  # The default rewrites and redirects added by the Amplify Console.
  custom_rule {
    source = "/<*>"
    status = "404"
    target = "/index.html"
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
