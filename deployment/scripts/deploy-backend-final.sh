#!/bin/bash

# AWS Deployment Script for Green Construction MCS-CEV Optimization Backend API (Final Fix)
# =======================================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_status $BLUE "🚀 AWS Backend API Deployment Script (Final Fix - Host Binding)"
echo "============================================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_status $RED "❌ Error: AWS CLI is not installed. Please install it first."
    exit 1
fi

print_status $GREEN "✅ AWS CLI found: $(aws --version)"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_status $RED "❌ Error: Docker is not installed. Please install it first."
    exit 1
fi

print_status $GREEN "✅ Docker found: $(docker --version)"

# Configuration
AWS_REGION="us-west-2"
ECR_REPOSITORY="green-construction-backend-api"
APP_RUNNER_SERVICE="green-construction-backend-service"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

print_status $BLUE "📋 Configuration:"
print_status $BLUE "   AWS Region: $AWS_REGION"
print_status $BLUE "   AWS Account ID: $AWS_ACCOUNT_ID"
print_status $BLUE "   ECR Repository: $ECR_REPOSITORY"
print_status $BLUE "   App Runner Service: $APP_RUNNER_SERVICE"

# Step 1: Login to ECR
print_status $YELLOW "Step 1: Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

print_status $GREEN "✅ ECR login successful"

# Step 2: Build and tag image using the fixed Dockerfile
print_status $YELLOW "Step 2: Building and tagging Docker image (fixed host binding)..."
docker build -f Dockerfile.backend-fixed -t $ECR_REPOSITORY .
docker tag $ECR_REPOSITORY:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

print_status $GREEN "✅ Docker image built and tagged"

# Step 3: Push to ECR
print_status $YELLOW "Step 3: Pushing image to ECR..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

print_status $GREEN "✅ Image pushed to ECR"

# Step 4: Update App Runner service
print_status $YELLOW "Step 4: Updating App Runner service with fixed configuration..."

# Update the App Runner service
aws apprunner update-service --service-arn arn:aws:apprunner:us-west-2:204404813371:service/green-construction-backend-service --source-configuration '{
    "ImageRepository": {
        "ImageIdentifier": "204404813371.dkr.ecr.us-west-2.amazonaws.com/green-construction-backend-api:latest",
        "ImageConfiguration": {
            "Port": "3004",
            "RuntimeEnvironmentVariables": {
                "NODE_ENV": "production",
                "PORT": "3004",
                "HOST": "0.0.0.0",
                "JULIA_PATH": "/usr/local/julia/bin/julia",
                "JULIA_DEPOT_PATH": "/opt/julia",
                "MAX_CONCURRENT_JOBS": "3",
                "OPTIMIZATION_TIMEOUT": "1800000",
                "MAX_FILE_SIZE": "104857600",
                "JOB_CLEANUP_HOURS": "24",
                "LOG_LEVEL": "info"
            }
        },
        "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": true,
    "AuthenticationConfiguration": {
        "AccessRoleArn": "arn:aws:iam::204404813371:role/AppRunnerECRAccessRole"
    }
}'

print_status $GREEN "✅ App Runner service updated with fixed host binding"

# Step 5: Get service URL
print_status $YELLOW "Step 5: Getting service URL..."
sleep 10

SERVICE_URL=$(aws apprunner describe-service \
    --service-arn arn:aws:apprunner:us-west-2:204404813371:service/green-construction-backend-service \
    --region $AWS_REGION \
    --query 'Service.ServiceUrl' \
    --output text 2>/dev/null || echo "Service is still being created...")

if [ "$SERVICE_URL" != "Service is still being created..." ]; then
    print_status $GREEN "✅ Service URL: $SERVICE_URL"
else
    print_status $YELLOW "⏳ Service is being created. Check AWS Console for the URL."
fi

print_status $GREEN "🎉 Final Backend API Deployment completed!"
echo ""
print_status $BLUE "📋 Next steps:"
print_status $BLUE "   1. Wait for the service to be ready (5-10 minutes)"
print_status $BLUE "   2. Monitor the logs for successful startup"
print_status $BLUE "   3. Test the API endpoints when ready"
echo ""
print_status $YELLOW "💡 To monitor the deployment:"
print_status $YELLOW "   aws apprunner describe-service --service-arn arn:aws:apprunner:us-west-2:204404813371:service/green-construction-backend-service --query 'Service.Status' --output text"
echo ""
print_status $YELLOW "🔧 Key fix in this version:"
print_status $YELLOW "   - Server now binds to 0.0.0.0 instead of localhost"
print_status $YELLOW "   - HOST environment variable set to 0.0.0.0"
print_status $YELLOW "   - Full Julia functionality preserved"
print_status $YELLOW "   - This should resolve the health check failure"
echo ""
print_status $BLUE "🎯 Expected result: Health check should now pass!"



