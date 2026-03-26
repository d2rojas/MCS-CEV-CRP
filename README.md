# MCS-CEV Optimization System

[![Julia](https://img.shields.io/badge/Julia-1.11.6-purple.svg)](https://julialang.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

## 🎯 Overview

A comprehensive optimization system for **Mobile Charging Stations (MCS)** and **Construction Electric Vehicles (CEV)**. This system combines advanced mathematical optimization with an intelligent web interface powered by AI multi-agent architecture.

### Key Features

- 🧮 **Mathematical Optimization**: Julia-based optimization model using JuMP and HiGHS
- 🤖 **AI-Powered Interface**: Multi-agent system with natural language processing
- 🌐 **Web Application**: React frontend with Node.js backend
- 🐳 **Docker Ready**: Complete containerization for easy deployment
- 📊 **Data Visualization**: Comprehensive analysis and reporting tools

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Interface │    │   Backend API    │    │  Julia Model    │
│   (React.js)    │◄──►│   (Node.js)      │◄──►│  (Optimization) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ AI Multi-Agent   │
                    │   System         │
                    └──────────────────┘
```

## 📁 Project Structure

```
MCS-CEV-Optimization/
├── README.md                    # This file
├── run-app.sh                   # One-command start (plain app: backend + frontend)
├── env.example                  # Environment variables template (copy to .env)
│
├── src/                         # Source code
│   ├── julia/                   # Optimization model
│   │   ├── mcs_optimization_main.jl
│   │   └── src/                 # Core modules (DataLoader, MCSOptimizer, etc.)
│   ├── web-interface/           # Web application
│   │   ├── src/                # React app (App.js, components/, utils/)
│   │   ├── public/             # Static assets (index.html)
│   │   └── backend/            # Node.js API (server.js, services/, prompts/)
│   └── scripts/                # Utility scripts
│
├── docker/                      # Docker configuration
│   ├── Dockerfile              # Single container (frontend + backend + Julia)
│   └── docker-compose.yml      # Compose definition
│
├── deployment/                  # Deployment configurations
├── docs/                        # Documentation (see docs/README.md)
├── data/                        # Data and results
└── archive/                     # Backup and old files
```

## 🚀 Quick Start

### Prerequisites

- **Julia 1.11.6+**
- **Node.js 18.x+**
- **Docker** (optional)

### Local Development (plain app)

**Option A – One command (recommended):**
```bash
./run-app.sh
```
Then open **http://localhost:3003**. Backend runs on port 3002, frontend on 3003. Press Ctrl+C to stop both.

**Option B – Manual start:**

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd MCS-CEV-Refactoring   # or your repo directory name
   ```

2. **Install Node.js dependencies**
   ```bash
   cd src/web-interface && npm install
   cd backend && npm install
   ```

3. **Install Julia dependencies** (required for Run Optimization)
   ```bash
   julia -e 'using Pkg; Pkg.add(["JuMP", "HiGHS", "Plots", "DataFrames", "CSV", "Printf", "Dates"])'
   ```

4. **Start backend** (terminal 1)
   ```bash
   cd src/web-interface/backend && PORT=3002 npm start
   ```

5. **Start frontend** (terminal 2)
   ```bash
   cd src/web-interface && npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:3003
   - Backend API: http://localhost:3002
   - Health: http://localhost:3002/api/health

### Docker Deployment (Recommended)

**🚀 Quick Start with Docker:**

1. **Clone and setup**
   ```bash
   git clone https://github.com/d2rojas/MCS-CEV-Refactoring.git
   cd MCS-CEV-Refactoring
   ```

2. **Configure environment**
   ```bash
   cp env.example .env
   # Edit .env with your OpenAI API key
   ```

3. **Start the complete application**
   ```bash
   ./docker-start.sh
   ```

4. **Access the application**
   - Frontend: http://localhost:3003
   - Backend API: http://localhost:3004

**📚 For detailed Docker instructions, see [DOCKER_README.md](DOCKER_README.md)**

**🛠️ Manual Docker commands:**
```bash
# Build and start
docker-compose -f docker/docker-compose.yml up --build -d

# View logs
docker-compose -f docker/docker-compose.yml logs -f

# Stop
docker-compose -f docker/docker-compose.yml down
```

## 🐳 Container Information

### Complete Application Container

**Features:**
- ✅ **Complete System** - Frontend + Backend + Julia optimization engine
- ✅ **Julia 1.11.6** - Stable and compatible version with all packages
- ✅ **Universal Compatibility** - Works on Mac ARM64 and PC x86_64
- ✅ **AI Multi-Agent System** - 10 specialized AI agents
- ✅ **Production Ready** - Optimized for deployment
- ✅ **Easy Setup** - One-command startup with `./docker-start.sh`

**What's Included:**
- React Frontend (Port 3003)
- Node.js Backend API (Port 3004)
- Julia Optimization Engine (v1.11.6)
- All mathematical solvers (HiGHS, GLPK, Cbc, Clp, Ipopt)
- Data visualization tools (Plots, StatsPlots, GR)
- AI multi-agent system
- Persistent data storage

**Quick Test:**
```bash
# Start the complete system
./docker-start.sh

# Test the API
curl http://localhost:3004/api/health
# Expected response: {"status":"OK","message":"MCS-CEV Optimization Backend is running"}

# Access the frontend
open http://localhost:3003
```

## 🤖 AI Multi-Agent System

The system features an advanced AI multi-agent architecture:

- **Understanding Agent**: Extracts parameters from natural language
- **Validation Agent**: Ensures data consistency and quality
- **Recommendation Agent**: Provides intelligent suggestions
- **Conversation Agent**: Manages user interaction flow

## 📊 Optimization Model

The Julia-based optimization model:

- **Objective**: Minimize total costs (electricity + carbon emissions)
- **Constraints**: Battery limits, work requirements, time windows
- **Solver**: HiGHS (open-source linear programming solver)
- **Output**: Optimal routes, charging schedules, cost analysis

## 🔧 Configuration

Copy `env.example` to `.env` in the project root and configure:

```bash
# OpenAI (optional; required for AI chat)
OPENAI_API_KEY=your_api_key_here

# Plain app: backend port (frontend expects 3002 by default)
PORT=3002
FRONTEND_URL=http://localhost:3003

# Julia (optional; default is "julia" from PATH)
JULIA_PATH=/path/to/julia
```

## 📚 Documentation

- [Documentation index](docs/README.md) – list of all docs
- [Docker setup](DOCKER_README.md) – run with Docker
- [Docker details](docs/README-Docker.md) – Docker instructions
- [AWS deployment](docs/AWS-DEPLOYMENT-GUIDE.md)
- [Julia download fix](docs/JULIA_DOWNLOAD_FIX.md) – if Julia install fails
- [AI agents & prompts](src/web-interface/backend/prompts/README.md) – multi-agent system
- [Deployment scripts](deployment/) – deployment configs

## 🧪 Testing

```bash
# Run Julia tests
julia src/julia/mcs_optimization_main.jl

# Run web interface tests
cd src/web-interface/backend && npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request


## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation in `docs/`
- Review the troubleshooting guide

---

**Status**: ✅ Production Ready  
**Last Updated**: October 2025  
**Version**: 2.0