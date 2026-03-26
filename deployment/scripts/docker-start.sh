#!/bin/bash

# MCS-CEV Optimization System Docker Startup Script
# =================================================

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

print_status $BLUE "🐳 MCS-CEV Optimization System Docker Setup"
echo "=================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_status $RED "❌ Error: Docker is not installed. Please install Docker first."
    exit 1
fi

print_status $GREEN "✅ Docker found: $(docker --version)"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_status $RED "❌ Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Use docker compose (newer) or docker-compose (older)
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
    print_status $GREEN "✅ Docker Compose found: $(docker compose version)"
else
    COMPOSE_CMD="docker-compose"
    print_status $GREEN "✅ Docker Compose found: $(docker-compose --version)"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    print_status $YELLOW "⚠️  No .env file found. Creating from template..."
    if [ -f env.example ]; then
        cp env.example .env
        print_status $GREEN "✅ Created .env file from template"
        print_status $YELLOW "📝 Please edit .env file with your OpenAI API key:"
        print_status $YELLOW "   nano .env"
        print_status $YELLOW "   Then run this script again."
        exit 1
    else
        print_status $RED "❌ Error: No env.example file found"
        exit 1
    fi
fi

# Create necessary directories
print_status $BLUE "📁 Creating necessary directories..."
mkdir -p data results logs
mkdir -p optimization-interface/backend/uploads
mkdir -p optimization-interface/backend/datasets
mkdir -p optimization-interface/backend/results

# Build the Docker image
print_status $BLUE "🔨 Building Docker image..."
$COMPOSE_CMD build

if [ $? -ne 0 ]; then
    print_status $RED "❌ Error: Failed to build Docker image"
    exit 1
fi

print_status $GREEN "✅ Docker image built successfully"

# Start the services
print_status $BLUE "🚀 Starting MCS-CEV Optimization System..."
$COMPOSE_CMD up -d

if [ $? -ne 0 ]; then
    print_status $RED "❌ Error: Failed to start services"
    exit 1
fi

# Wait for services to be ready
print_status $YELLOW "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if $COMPOSE_CMD ps | grep -q "Up"; then
    print_status $GREEN "✅ Services started successfully!"
else
    print_status $RED "❌ Error: Services failed to start"
    print_status $YELLOW "📋 Checking logs..."
    $COMPOSE_CMD logs
    exit 1
fi

# Display status
echo ""
print_status $GREEN "🎉 MCS-CEV Optimization System is ready!"
echo ""
print_status $BLUE "📱 Frontend: http://localhost:3001"
print_status $BLUE "📊 Backend API: http://localhost:3002"
print_status $BLUE "🔗 WebSocket: ws://localhost:3002"
echo ""
print_status $YELLOW "💡 Useful commands:"
print_status $YELLOW "   View logs: $COMPOSE_CMD logs -f"
print_status $YELLOW "   Stop system: $COMPOSE_CMD down"
print_status $YELLOW "   Restart: $COMPOSE_CMD restart"
print_status $YELLOW "   View status: $COMPOSE_CMD ps"
echo ""
print_status $YELLOW "📝 To use the system:"
print_status $YELLOW "   1. Open http://localhost:3001 in your browser"
print_status $YELLOW "   2. Start a conversation with the AI"
print_status $YELLOW "   3. Configure your optimization scenario"
print_status $YELLOW "   4. Download and run the optimization"
echo ""

# Show running containers
print_status $BLUE "📋 Running containers:"
$COMPOSE_CMD ps




