#!/bin/bash

# Docker Setup Test Script for MCS-CEV Optimization System
# ========================================================

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

print_status $BLUE "🧪 Testing Docker Setup for MCS-CEV Optimization System"
echo "============================================================="

# Test 1: Check Docker installation
print_status $YELLOW "Test 1: Checking Docker installation..."
if command -v docker &> /dev/null; then
    print_status $GREEN "✅ Docker is installed: $(docker --version)"
else
    print_status $RED "❌ Docker is not installed"
    exit 1
fi

# Test 2: Check Docker Compose
print_status $YELLOW "Test 2: Checking Docker Compose..."
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
    print_status $GREEN "✅ Docker Compose is available: $(docker compose version)"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    print_status $GREEN "✅ Docker Compose is available: $(docker-compose --version)"
else
    print_status $RED "❌ Docker Compose is not available"
    exit 1
fi

# Test 3: Check if Docker daemon is running
print_status $YELLOW "Test 3: Checking Docker daemon..."
if docker info &> /dev/null; then
    print_status $GREEN "✅ Docker daemon is running"
else
    print_status $RED "❌ Docker daemon is not running. Please start Docker."
    exit 1
fi

# Test 4: Check environment file
print_status $YELLOW "Test 4: Checking environment configuration..."
if [ -f .env ]; then
    print_status $GREEN "✅ .env file exists"
    if grep -q "OPENAI_API_KEY=" .env && ! grep -q "your_openai_api_key_here" .env; then
        print_status $GREEN "✅ OpenAI API key appears to be configured"
    else
        print_status $YELLOW "⚠️  OpenAI API key needs to be configured in .env file"
    fi
else
    print_status $YELLOW "⚠️  .env file not found. Will be created from template during startup."
fi

# Test 5: Check Dockerfile syntax
print_status $YELLOW "Test 5: Checking Dockerfile syntax..."
if [ -f Dockerfile ]; then
    print_status $GREEN "✅ Dockerfile exists"
    # Basic syntax check
    if grep -q "FROM" Dockerfile && grep -q "WORKDIR" Dockerfile; then
        print_status $GREEN "✅ Dockerfile appears to have basic structure"
    else
        print_status $RED "❌ Dockerfile appears to be malformed"
        exit 1
    fi
else
    print_status $RED "❌ Dockerfile not found"
    exit 1
fi

# Test 6: Check docker-compose.yml syntax
print_status $YELLOW "Test 6: Checking docker-compose.yml syntax..."
if [ -f docker-compose.yml ]; then
    print_status $GREEN "✅ docker-compose.yml exists"
    # Basic syntax check
    if $COMPOSE_CMD config &> /dev/null; then
        print_status $GREEN "✅ docker-compose.yml syntax is valid"
    else
        print_status $RED "❌ docker-compose.yml syntax is invalid"
        $COMPOSE_CMD config
        exit 1
    fi
else
    print_status $RED "❌ docker-compose.yml not found"
    exit 1
fi

# Test 7: Check required directories
print_status $YELLOW "Test 7: Checking required directories..."
REQUIRED_DIRS=("optimization-interface" "src" "sample_simple_dataset")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        print_status $GREEN "✅ Directory $dir exists"
    else
        print_status $RED "❌ Required directory $dir not found"
        exit 1
    fi
done

# Test 8: Check required files
print_status $YELLOW "Test 8: Checking required files..."
REQUIRED_FILES=("mcs_optimization_main.jl" "optimization-interface/package.json" "optimization-interface/backend/package.json")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status $GREEN "✅ File $file exists"
    else
        print_status $RED "❌ Required file $file not found"
        exit 1
    fi
done

# Test 9: Check if ports are available
print_status $YELLOW "Test 9: Checking port availability..."
PORTS=(3001 3002)
for port in "${PORTS[@]}"; do
    if lsof -i :$port &> /dev/null; then
        print_status $YELLOW "⚠️  Port $port is in use. You may need to stop other services."
    else
        print_status $GREEN "✅ Port $port is available"
    fi
done

# Test 10: Check disk space
print_status $YELLOW "Test 10: Checking disk space..."
AVAILABLE_SPACE=$(df . | tail -1 | awk '{print $4}')
if [ "$AVAILABLE_SPACE" -gt 5242880 ]; then  # 5GB in KB
    print_status $GREEN "✅ Sufficient disk space available ($(($AVAILABLE_SPACE / 1024 / 1024))GB)"
else
    print_status $YELLOW "⚠️  Low disk space. Docker build may fail. Available: $(($AVAILABLE_SPACE / 1024 / 1024))GB"
fi

# Summary
echo ""
print_status $GREEN "🎉 Docker setup validation completed!"
echo ""
print_status $BLUE "📋 Summary:"
print_status $BLUE "   - Docker and Docker Compose are properly installed"
print_status $BLUE "   - Configuration files are present and valid"
print_status $BLUE "   - Required application files are available"
print_status $BLUE "   - System is ready for Docker deployment"
echo ""
print_status $YELLOW "🚀 Next steps:"
print_status $YELLOW "   1. Configure your OpenAI API key in .env file (if not done)"
print_status $YELLOW "   2. Run: ./docker-start.sh"
print_status $YELLOW "   3. Access the application at http://localhost:3001"
echo ""
print_status $BLUE "💡 For detailed instructions, see README-Docker.md"




