#!/bin/bash

# AWS Deployment Script for Green Construction MCS-CEV Optimization Backend API
# ============================================================================

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

print_status $BLUE "🚀 AWS Backend API Deployment Script for Green Construction"
echo "=============================================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_status $RED "❌ Error: AWS CLI is not installed. Please install it first."
    print_status $YELLOW "   Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
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

# Step 1: Create ECR repository
print_status $YELLOW "Step 1: Creating ECR repository..."
aws ecr create-repository \
    --repository-name $ECR_REPOSITORY \
    --region $AWS_REGION \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 \
    2>/dev/null || print_status $YELLOW "   Repository already exists"

print_status $GREEN "✅ ECR repository ready"

# Step 2: Login to ECR
print_status $YELLOW "Step 2: Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

print_status $GREEN "✅ ECR login successful"

# Step 3: Build and tag image using backend Dockerfile
print_status $YELLOW "Step 3: Building and tagging Docker image (backend only)..."
docker build -f Dockerfile.backend -t $ECR_REPOSITORY .
docker tag $ECR_REPOSITORY:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

print_status $GREEN "✅ Docker image built and tagged"

# Step 4: Push to ECR
print_status $YELLOW "Step 4: Pushing image to ECR..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

print_status $GREEN "✅ Image pushed to ECR"

# Step 5: Create App Runner service
print_status $YELLOW "Step 5: Creating App Runner service..."

# Create IAM role for App Runner (if it doesn't exist)
ROLE_NAME="AppRunnerServiceRole"
aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "build.apprunner.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }' 2>/dev/null || print_status $YELLOW "   IAM role already exists"

# Attach policy to role
aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AppRunnerServicePolicyForECRAccess 2>/dev/null || true

# Create App Runner service configuration
cat > apprunner-backend-config.json << EOF
{
    "ServiceName": "$APP_RUNNER_SERVICE",
    "SourceConfiguration": {
        "ImageRepository": {
            "ImageIdentifier": "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest",
            "ImageConfiguration": {
                "Port": "3004",
                "RuntimeEnvironmentVariables": {
                    "NODE_ENV": "production",
                    "PORT": "3004",
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
            "AccessRoleArn": "arn:aws:iam::$AWS_ACCOUNT_ID:role/$ROLE_NAME"
        }
    },
    "InstanceConfiguration": {
        "Cpu": "1 vCPU",
        "Memory": "2 GB"
    },
    "HealthCheckConfiguration": {
        "Protocol": "HTTP",
        "Path": "/api/health",
        "Interval": 10,
        "Timeout": 5,
        "HealthyThreshold": 2,
        "UnhealthyThreshold": 5
    }
}
EOF

# Create the App Runner service
aws apprunner create-service \
    --cli-input-json file://apprunner-backend-config.json \
    --region $AWS_REGION

print_status $GREEN "✅ App Runner service created"

# Step 6: Get service URL
print_status $YELLOW "Step 6: Getting service URL..."
sleep 10

SERVICE_URL=$(aws apprunner describe-service \
    --service-arn arn:aws:apprunner:$AWS_REGION:$AWS_ACCOUNT_ID:service/$APP_RUNNER_SERVICE \
    --region $AWS_REGION \
    --query 'Service.ServiceUrl' \
    --output text 2>/dev/null || echo "Service is still being created...")

if [ "$SERVICE_URL" != "Service is still being created..." ]; then
    print_status $GREEN "✅ Service URL: $SERVICE_URL"
else
    print_status $YELLOW "⏳ Service is being created. Check AWS Console for the URL."
fi

# Cleanup
rm -f apprunner-backend-config.json

print_status $GREEN "🎉 Backend API Deployment completed!"
echo ""
print_status $BLUE "📋 Next steps:"
print_status $BLUE "   1. Wait for the service to be ready (5-10 minutes)"
print_status $BLUE "   2. Get the service URL from AWS Console or CLI"
print_status $BLUE "   3. Configure your OpenAI API key in the environment variables"
print_status $BLUE "   4. Test your API endpoints"
echo ""
print_status $YELLOW "💡 To get the service URL later, run:"
print_status $YELLOW "   aws apprunner describe-service --service-arn arn:aws:apprunner:$AWS_REGION:$AWS_ACCOUNT_ID:service/$APP_RUNNER_SERVICE --query 'Service.ServiceUrl' --output text"
echo ""
print_status $YELLOW "🔧 To update the service, just push a new image to ECR and App Runner will auto-deploy"
echo ""
print_status $BLUE "📡 API Endpoints available:"
print_status $BLUE "   - POST /api/upload - Upload optimization files"
print_status $BLUE "   - POST /api/optimize - Start optimization"
print_status $BLUE "   - GET /api/status/:jobId - Check optimization status"
print_status $BLUE "   - GET /api/results/:jobId - Download results"
print_status $BLUE "   - GET /api/health - Health check"
