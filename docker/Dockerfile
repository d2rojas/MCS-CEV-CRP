# MCS-CEV Optimization System - Complete Application
# Single Dockerfile for Frontend + Backend + Julia

FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV JULIA_VERSION=1.11.6
ENV NODE_VERSION=18
ENV JULIA_PATH=/usr/local/julia/bin
ENV PATH=$JULIA_PATH:$PATH

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Basic utilities
    curl \
    wget \
    git \
    unzip \
    build-essential \
    cmake \
    pkg-config \
    # Math libraries for optimization solvers
    libblas-dev \
    liblapack-dev \
    libgmp-dev \
    libmpfr-dev \
    libgsl-dev \
    # Graphics libraries for plotting
    libcairo2-dev \
    libpango1.0-dev \
    libgdk-pixbuf2.0-dev \
    libffi-dev \
    # Python for some Julia packages
    python3 \
    python3-pip \
    python3-dev \
    # Additional dependencies
    libssl-dev \
    libcurl4-openssl-dev \
    libxml2-dev \
    libz-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 18
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Install Julia 1.11.6 (using official Julia download)
RUN wget https://julialang-s3.julialang.org/bin/linux/x64/1.11/julia-1.11.6-linux-x86_64.tar.gz \
    && tar -xzf julia-1.11.6-linux-x86_64.tar.gz \
    && mv julia-1.11.6 /usr/local/julia \
    && rm julia-1.11.6-linux-x86_64.tar.gz

# Set working directory
WORKDIR /app

# Copy Julia project files first (for better caching)
COPY src/julia/mcs_optimization_main.jl ./
COPY src/julia/src/ ./src/

# Create Julia project file
RUN echo '[deps]\nJuMP = "4076af6c-e467-56ae-b986-b466b2749572"\nHiGHS = "87dc4568-4c63-4d18-b0c0-bb2238e4078b"\nPlots = "91a5bcdd-55d7-5caf-9e0b-520d859cae80"\nDataFrames = "a93c6f00-e57d-5684-b7b6-d8193f3e46c0"\nCSV = "336ed68f-0bac-5ca0-87d4-7b16caf5d00b"\nPrintf = "de0858da-6303-5e67-8744-51eddeeeb8d7"\nDates = "ade2ca70-3891-5945-98fb-dc099432e06a"\nLinearAlgebra = "37e2e46d-f89d-539d-b4ee-838fcccc9c8e"\nArgParse = "c7e460c6-2fb9-53a9-8c5b-6f83d869c6b2"\nBSON = "fbb218c0-5317-5bc6-957e-2ee96eb4d4a0"\nCategoricalArrays = "324d7699-5711-5eae-9e2f-1d82baa6b597"\nCbc = "9961bab8-2ea3-5c89-af9e-9fe4741a44c3"\nClp = "e2554f3b-3117-50c0-a5a1-79565f6830d3"\nClustering = "aaaa29a8-35af-5cbb-8b9f-54c8e8623e70"\nDistributions = "31c24e10-a181-5473-b8eb-7969acd0382f"\nFileIO = "5789e2e9-d7fb-5bc7-8068-2c6fae9b9549"\nGLPK = "e9467ef8-e4e7-5192-8a1a-b1aee30f663e"\nGR = "28b8d3ca-fb5f-59d9-8090-bfdbd6d07a71"\nGlob = "c27321d9-0574-5035-807b-f59d2c89b15c"\nIpopt = "b6b21f68-93f8-5de0-b562-5493be1c77c9"\nJSON = "682c06a0-de6a-54ab-a142-c8b1cf79cde6"\nMathOptInterface = "b8f27783-ece5-5df3-8400-5b405195fefc"\nPrettyTables = "08abe8b2-0bf0-5a39-bc48-b1b3e3d4c844"\nStatistics = "10745b16-79ce-11e8-11f9-7d13ad32a3b2"\nStatsBase = "2913bbd2-ae8a-5f71-897c-aaacd4118bc9"\nStatsPlots = "f3b207a7-027a-5e70-b257-86293d7955fd"' > Project.toml

# Create Manifest.toml for package versions
RUN echo '[[deps]]\nname = "JuMP"\nuuid = "4076af6c-e467-56ae-b986-b466b2749572"\nversion = "1.22.0"' > Manifest.toml

# Copy package.json files
COPY src/web-interface/package.json ./src/web-interface/
COPY src/web-interface/backend/package.json ./src/web-interface/backend/

# Install Node.js dependencies
RUN cd src/web-interface && npm install
RUN cd src/web-interface/backend && npm install

# Copy the entire application
COPY . .

# Create necessary directories
RUN mkdir -p src/web-interface/backend/uploads \
    && mkdir -p src/web-interface/backend/datasets \
    && mkdir -p src/web-interface/backend/results \
    && mkdir -p results \
    && mkdir -p logs

# Create environment file template
RUN echo "# MCS-CEV Optimization Environment Variables\n\
# Copy this file to .env and configure your settings\n\
\n\
# OpenAI Configuration\n\
OPENAI_API_KEY=your_openai_api_key_here\n\
\n\
# Server Configuration\n\
PORT=3002\n\
NODE_ENV=production\n\
HOST=0.0.0.0\n\
FRONTEND_URL=http://localhost:3003\n\
\n\
# Julia Configuration\n\
JULIA_PATH=/usr/local/julia/bin/julia\n\
JULIA_DEPOT_PATH=/opt/julia\n\
\n\
# CORS Configuration\n\
CORS_ORIGIN=http://localhost:3003\n\
\n\
# Logging\n\
LOG_LEVEL=info\n\
LOG_FILE=/app/logs/app.log\n\
\n\
# Optimization Settings\n\
MAX_CONCURRENT_JOBS=3\n\
OPTIMIZATION_TIMEOUT=1800000\n\
\n\
# File Management\n\
MAX_FILE_SIZE=104857600\n\
JOB_CLEANUP_HOURS=24" > .env.template

# Create startup script for Docker
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
echo "🚀 Starting MCS-CEV Optimization System (Complete)..."\n\
echo "====================================================="\n\
\n\
# Check if .env file exists, if not copy from template\n\
if [ ! -f .env ]; then\n\
    echo "⚠️  No .env file found. Copying from template..."\n\
    cp .env.template .env\n\
    echo "📝 Please edit .env file with your OpenAI API key and other settings"\n\
    echo "   Then restart the container"\n\
    exit 1\n\
fi\n\
\n\
# Install Julia packages if not already installed\n\
echo "📦 Installing Julia packages..."\n\
julia -e "using Pkg; Pkg.activate(\\".\\"); Pkg.instantiate()" || {\n\
    echo "⚠️  Package installation failed, trying individual packages..."\n\
    julia -e "using Pkg; Pkg.activate(\\".\\"); Pkg.add([\\"JuMP\\", \\"HiGHS\\", \\"Plots\\", \\"DataFrames\\", \\"CSV\\", \\"Printf\\", \\"Dates\\", \\"LinearAlgebra\\"])"\n\
}\n\
\n\
# Source environment variables\n\
export $(cat .env | grep -v ^# | xargs)\n\
\n\
# Start backend server\n\
echo "📡 Starting backend server..."\n\
cd src/web-interface/backend\n\
npm start &\n\
BACKEND_PID=$!\n\
\n\
# Wait for backend to start\n\
sleep 5\n\
\n\
# Start frontend server\n\
echo "🌐 Starting frontend server..."\n\
cd ..\n\
npm start &\n\
FRONTEND_PID=$!\n\
\n\
# Wait for frontend to start\n\
sleep 8\n\
\n\
echo "✅ System ready!"\n\
echo "📱 Frontend: http://localhost:3003"\n\
echo "📊 Backend: http://localhost:3002"\n\
echo "🔗 WebSocket: ws://localhost:3002"\n\
\n\
# Keep container running\n\
wait' > docker-start.sh && chmod +x docker-start.sh

# Expose ports (Frontend: 3003, Backend: 3002)
EXPOSE 3002 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3002/api/health || exit 1

# Default command
CMD ["./docker-start.sh"]