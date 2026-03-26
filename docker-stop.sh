#!/bin/bash

# MCS-CEV Optimization System - Docker Stop Script
# ================================================

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

print_status $BLUE "🛑 MCS-CEV Optimization System - Docker Stop"
echo "============================================="

# Stop and remove containers
print_status $YELLOW "🛑 Stopping containers..."
docker-compose -f docker/docker-compose.yml down

print_status $GREEN "✅ Application stopped successfully!"

print_status $YELLOW "📋 To start again, run:"
print_status $YELLOW "   ./docker-start.sh"
