#!/bin/bash

# MCS-CEV Optimization System Docker Stop Script
# ===============================================

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

print_status $BLUE "🛑 Stopping MCS-CEV Optimization System"
echo "============================================="

# Use docker compose (newer) or docker-compose (older)
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Stop and remove containers
print_status $YELLOW "🛑 Stopping containers..."
$COMPOSE_CMD down

if [ $? -eq 0 ]; then
    print_status $GREEN "✅ Containers stopped successfully"
else
    print_status $RED "❌ Error: Failed to stop containers"
    exit 1
fi

# Optional: Remove volumes (uncomment if you want to clean up data)
# print_status $YELLOW "🗑️  Removing volumes..."
# $COMPOSE_CMD down -v

# Optional: Remove images (uncomment if you want to clean up images)
# print_status $YELLOW "🗑️  Removing images..."
# $COMPOSE_CMD down --rmi all

print_status $GREEN "🎉 MCS-CEV Optimization System stopped!"
echo ""
print_status $YELLOW "💡 To start again, run: ./docker-start.sh"




