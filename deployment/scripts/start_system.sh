#!/bin/bash

# MCS-CEV Optimization System Startup Script
# ==========================================

echo "🚀 Iniciando Sistema MCS-CEV Optimization..."
echo "=============================================="

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

# Function to cleanup background processes
cleanup() {
    echo ""
    print_status $YELLOW "🛑 Cerrando servidores..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        print_status $GREEN "✅ Backend cerrado"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        print_status $GREEN "✅ Frontend cerrado"
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_status $RED "❌ Error: Node.js no está instalado. Por favor instala Node.js primero."
    exit 1
fi

print_status $GREEN "✅ Node.js encontrado: $(node --version)"

# Check if Julia is installed
if ! command -v julia &> /dev/null; then
    print_status $YELLOW "⚠️  Advertencia: Julia no se encuentra en PATH. Asegúrate de que Julia esté instalado."
    echo "   Puedes establecer la variable de entorno JULIA_PATH para especificar la ruta del ejecutable de Julia."
else
    print_status $GREEN "✅ Julia encontrado: $(julia --version)"
fi

# Check if we're in the right directory
if [ ! -d "optimization-interface" ]; then
    print_status $RED "❌ Error: No se encuentra el directorio optimization-interface"
    print_status $YELLOW "   Asegúrate de ejecutar este script desde el directorio raíz del proyecto"
    exit 1
fi

# Navigate to optimization-interface
cd optimization-interface

# Check if node_modules exists for frontend
if [ ! -d "node_modules" ]; then
    print_status $YELLOW "📦 Instalando dependencias del frontend..."
    npm install
    if [ $? -ne 0 ]; then
        print_status $RED "❌ Error: Fallo al instalar dependencias del frontend"
        exit 1
    fi
fi

# Check if node_modules exists for backend
if [ ! -d "backend/node_modules" ]; then
    print_status $YELLOW "📦 Instalando dependencias del backend..."
    cd backend
    npm install
    if [ $? -ne 0 ]; then
        print_status $RED "❌ Error: Fallo al instalar dependencias del backend"
        exit 1
    fi
    cd ..
fi

# Start backend server
print_status $BLUE "📡 Iniciando servidor backend en puerto 3002..."
cd backend
npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
print_status $YELLOW "⏳ Esperando que el backend inicie..."
sleep 5

# Check if backend started successfully
if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
    print_status $GREEN "✅ Servidor backend ejecutándose en http://localhost:3002"
else
    print_status $RED "❌ Error: El servidor backend falló al iniciar"
    print_status $YELLOW "   Revisando logs del backend..."
    if [ -f "backend.log" ]; then
        tail -10 backend.log
    fi
    cleanup
    exit 1
fi

# Start frontend server
print_status $BLUE "🌐 Iniciando servidor frontend en puerto 3001..."
npm start > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
print_status $YELLOW "⏳ Esperando que el frontend inicie..."
sleep 8

# Check if frontend started successfully
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    print_status $GREEN "✅ Servidor frontend ejecutándose en http://localhost:3001"
else
    print_status $RED "❌ Error: El servidor frontend falló al iniciar"
    print_status $YELLOW "   Revisando logs del frontend..."
    if [ -f "frontend.log" ]; then
        tail -10 frontend.log
    fi
    cleanup
    exit 1
fi

# Display success message
echo ""
print_status $GREEN "🎉 ¡Sistema MCS-CEV Optimization listo!"
echo ""
print_status $BLUE "📱 Abre tu navegador y ve a: http://localhost:3001"
echo ""
print_status $BLUE "📊 API Backend: http://localhost:3002"
print_status $BLUE "🔗 WebSocket: ws://localhost:3002"
echo ""
print_status $YELLOW "💡 Para usar el sistema:"
print_status $YELLOW "   1. Abre http://localhost:3001 en tu navegador"
print_status $YELLOW "   2. Comienza una conversación con la IA: 'Necesito configurar un escenario...'"
print_status $YELLOW "   3. Sigue las instrucciones de la IA para configurar tu escenario"
print_status $YELLOW "   4. Descarga los archivos CSV generados"
print_status $YELLOW "   5. Ejecuta la optimización: julia mcs_optimization_main.jl nombre_dataset"
echo ""
print_status $YELLOW "📝 Presiona Ctrl+C para detener todos los servidores"
echo ""

# Wait for user to stop
wait
