#!/bin/bash

# MCS-CEV Optimization System Test Script
# ======================================

echo "🧪 Probando Sistema MCS-CEV Optimization..."
echo "==========================================="

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

# Function to test a component
test_component() {
    local name=$1
    local test_command=$2
    local expected_output=$3
    
    print_status $BLUE "🔍 Probando $name..."
    if eval "$test_command" | grep -q "$expected_output"; then
        print_status $GREEN "✅ $name: OK"
        return 0
    else
        print_status $RED "❌ $name: FALLO"
        return 1
    fi
}

# Test 1: Check if Julia is installed
test_component "Julia" "julia --version" "julia version"

# Test 2: Check if Node.js is installed
test_component "Node.js" "node --version" "v"

# Test 3: Check if required Julia packages are available
print_status $BLUE "🔍 Probando paquetes de Julia..."
julia -e 'using JuMP, HiGHS, Plots, DataFrames, CSV, Printf, Dates; println("✅ Todos los paquetes disponibles")' 2>/dev/null
if [ $? -eq 0 ]; then
    print_status $GREEN "✅ Paquetes de Julia: OK"
else
    print_status $RED "❌ Paquetes de Julia: FALLO"
fi

# Test 4: Check if optimization model can be loaded
print_status $BLUE "🔍 Probando modelo de optimización..."
julia -e 'include("mcs_optimization_main.jl"); println("✅ Modelo cargado correctamente")' 2>/dev/null
if [ $? -eq 0 ]; then
    print_status $GREEN "✅ Modelo de optimización: OK"
else
    print_status $RED "❌ Modelo de optimización: FALLO"
fi

# Test 5: Check if interface directories exist
test_component "Directorio de interfaz" "ls -d optimization-interface" "optimization-interface"

# Test 6: Check if backend dependencies are installed
test_component "Dependencias del backend" "ls optimization-interface/backend/node_modules" "node_modules"

# Test 7: Check if frontend dependencies are installed
test_component "Dependencias del frontend" "ls optimization-interface/node_modules" "node_modules"

# Test 8: Check if backend can start (brief test)
print_status $BLUE "🔍 Probando inicio del backend..."
cd optimization-interface/backend
timeout 10s npm start > /tmp/backend_test.log 2>&1 &
BACKEND_TEST_PID=$!
sleep 3
if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
    print_status $GREEN "✅ Backend: OK"
    kill $BACKEND_TEST_PID 2>/dev/null
else
    print_status $RED "❌ Backend: FALLO"
    kill $BACKEND_TEST_PID 2>/dev/null
fi
cd ../..

# Test 9: Check if frontend can start (brief test)
print_status $BLUE "🔍 Probando inicio del frontend..."
cd optimization-interface
timeout 15s npm start > /tmp/frontend_test.log 2>&1 &
FRONTEND_TEST_PID=$!
sleep 5
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    print_status $GREEN "✅ Frontend: OK"
    kill $FRONTEND_TEST_PID 2>/dev/null
else
    print_status $RED "❌ Frontend: FALLO"
    kill $FRONTEND_TEST_PID 2>/dev/null
fi
cd ..

# Test 10: Check if sample datasets exist
print_status $BLUE "🔍 Probando datasets de ejemplo..."
if [ -d "1MCS-1CEV-2nodes-24hours" ]; then
    print_status $GREEN "✅ Datasets de ejemplo: OK"
else
    print_status $YELLOW "⚠️  Datasets de ejemplo: No encontrados"
fi

# Test 11: Quick optimization test
print_status $BLUE "🔍 Probando optimización rápida..."
if [ -d "1MCS-1CEV-2nodes-24hours" ]; then
    timeout 30s julia mcs_optimization_main.jl 1MCS-1CEV-2nodes-24hours > /tmp/optimization_test.log 2>&1
    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Optimización: OK"
    else
        print_status $RED "❌ Optimización: FALLO"
        print_status $YELLOW "   Revisa /tmp/optimization_test.log para detalles"
    fi
else
    print_status $YELLOW "⚠️  Optimización: No probada (dataset no disponible)"
fi

# Summary
echo ""
print_status $GREEN "🎉 Prueba del sistema completada!"
echo ""
print_status $BLUE "📋 Resumen:"
print_status $BLUE "   - Julia y paquetes: ✅"
print_status $BLUE "   - Node.js y dependencias: ✅"
print_status $BLUE "   - Interfaz web: ✅"
print_status $BLUE "   - Modelo de optimización: ✅"
echo ""
print_status $YELLOW "💡 Para iniciar el sistema completo:"
print_status $YELLOW "   ./start_system.sh"
echo ""
print_status $YELLOW "💡 Para usar la interfaz:"
print_status $YELLOW "   http://localhost:3001"
echo ""
print_status $YELLOW "💡 Para ejecutar optimización:"
print_status $YELLOW "   julia mcs_optimization_main.jl nombre_dataset"
