#!/bin/bash

# MCS-CEV Optimization System - Docker Startup Script
# ===================================================

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

print_status $BLUE "🚀 MCS-CEV Optimization System - Docker Startup"
echo "=================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_status $RED "❌ Error: Docker is not installed. Please install Docker first."
    print_status $YELLOW "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_status $RED "❌ Error: Docker Compose is not installed. Please install Docker Compose first."
    print_status $YELLOW "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

print_status $GREEN "✅ Docker found: $(docker --version)"

# Check if .env file exists
if [ ! -f .env ]; then
    print_status $YELLOW "⚠️  No .env file found. Creating from template..."
    if [ -f env.example ]; then
        cp env.example .env
        print_status $GREEN "✅ Created .env file from env.example"
        print_status $YELLOW "📝 Please edit .env file with your OpenAI API key:"
        print_status $YELLOW "   nano .env"
        print_status $YELLOW "   Then run this script again."
        exit 1
    else
        print_status $RED "❌ No env.example file found. Please create a .env file manually."
        exit 1
    fi
fi

# Check if OpenAI API key is set
if grep -q "your_openai_api_key_here" .env; then
    print_status $YELLOW "⚠️  Please set your OpenAI API key in the .env file:"
    print_status $YELLOW "   OPENAI_API_KEY=your_actual_api_key_here"
    print_status $YELLOW "   Then run this script again."
    exit 1
fi

print_status $GREEN "✅ Environment configuration found"

# Stop any existing containers
print_status $YELLOW "🛑 Stopping any existing containers..."
docker-compose -f docker/docker-compose.yml down 2>/dev/null || true

# Build and start the application
print_status $YELLOW "🔨 Building and starting the application..."
docker-compose -f docker/docker-compose.yml up --build -d

# Wait for services to start
print_status $YELLOW "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose -f docker/docker-compose.yml ps | grep -q "Up"; then
    print_status $GREEN "✅ Application started successfully!"
    echo ""
    print_status $BLUE "📱 Access the application:"
    print_status $BLUE "   Frontend: http://localhost:3003"
    print_status $BLUE "   Backend API: http://localhost:3004"
    print_status $BLUE "   Health Check: http://localhost:3004/api/health"
    echo ""
    print_status $YELLOW "📋 Useful commands:"
    print_status $YELLOW "   View logs: docker-compose -f docker/docker-compose.yml logs -f"
    print_status $YELLOW "   Stop app: docker-compose -f docker/docker-compose.yml down"
    print_status $YELLOW "   Restart: docker-compose -f docker/docker-compose.yml restart"
    echo ""
    print_status $GREEN "🎉 Ready to optimize! Open http://localhost:3003 in your browser."
else
    print_status $RED "❌ Failed to start the application. Check the logs:"
    print_status $YELLOW "   docker-compose -f docker/docker-compose.yml logs"
    exit 1
fi
