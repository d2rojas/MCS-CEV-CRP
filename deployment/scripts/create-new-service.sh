#!/bin/bash

# Create a completely new App Runner service
set -e

echo "🚀 Creating a completely new App Runner service"

# Configuration
AWS_REGION="us-west-2"
ECR_REPOSITORY="green-construction-backend-api"
NEW_SERVICE_NAME="green-construction-backend-new"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "📋 Configuration:"
echo "   AWS Region: $AWS_REGION"
echo "   ECR Repository: $ECR_REPOSITORY"
echo "   New Service: $NEW_SERVICE_NAME"

# Create new App Runner service
echo "Step 1: Creating new App Runner service..."

aws apprunner create-service \
    --service-name $NEW_SERVICE_NAME \
    --source-configuration '{
        "ImageRepository": {
            "ImageIdentifier": "'$AWS_ACCOUNT_ID'.dkr.ecr.'$AWS_REGION'.amazonaws.com/'$ECR_REPOSITORY':latest",
            "ImageConfiguration": {
                "Port": "3004",
                "RuntimeEnvironmentVariables": {
                    "NODE_ENV": "production",
                    "PORT": "3004"
                }
            },
            "ImageRepositoryType": "ECR"
        },
        "AutoDeploymentsEnabled": true,
        "AuthenticationConfiguration": {
            "AccessRoleArn": "arn:aws:iam::'$AWS_ACCOUNT_ID':role/AppRunnerECRAccessRole"
        }
    }' \
    --instance-configuration '{
        "Cpu": "1 vCPU",
        "Memory": "2 GB"
    }' \
    --health-check-configuration '{
        "Protocol": "HTTP",
        "Path": "/api/health",
        "Interval": 30,
        "Timeout": 20,
        "HealthyThreshold": 2,
        "UnhealthyThreshold": 5
    }'

echo "✅ New App Runner service created!"
echo "⏳ Wait 5-10 minutes for the service to be ready"
echo "💡 Check AWS Console for the new service URL"



