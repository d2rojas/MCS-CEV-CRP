#!/bin/bash

# Test deployment script - Simple Node.js server
set -e

echo "🧪 Testing with simple Node.js server (no Julia)"

# Configuration
AWS_REGION="us-west-2"
ECR_REPOSITORY="green-construction-backend-api"
APP_RUNNER_SERVICE="green-construction-backend-service"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "📋 Configuration:"
echo "   AWS Region: $AWS_REGION"
echo "   ECR Repository: $ECR_REPOSITORY"

# Login to ECR
echo "Step 1: Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build and push test image
echo "Step 2: Building test image..."
docker build -f Dockerfile.test -t $ECR_REPOSITORY .
docker tag $ECR_REPOSITORY:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

echo "Step 3: Pushing test image..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

# Update App Runner service
echo "Step 4: Updating App Runner service..."
aws apprunner update-service --service-arn arn:aws:apprunner:us-west-2:204404813371:service/green-construction-backend-service --source-configuration '{
    "ImageRepository": {
        "ImageIdentifier": "204404813371.dkr.ecr.us-west-2.amazonaws.com/green-construction-backend-api:latest",
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
        "AccessRoleArn": "arn:aws:iam::204404813371:role/AppRunnerECRAccessRole"
    }
}'

echo "✅ Test deployment completed!"
echo "⏳ Wait 5-10 minutes and check if health check passes"
echo "💡 If this works, the problem is Julia startup time"



