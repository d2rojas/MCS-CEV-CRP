# 🐳 Docker Setup - MCS-CEV Optimization System

This guide will help you run the complete MCS-CEV Optimization System using Docker.

## 🚀 Quick Start

### Prerequisites

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **OpenAI API Key** (for AI-powered features)

### 1. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/d2rojas/MCS-CEV-Refactoring.git
cd MCS-CEV-Refactoring

# Make scripts executable (if not already)
chmod +x docker-start.sh docker-stop.sh
```

### 2. Configure Environment

```bash
# Copy environment template
cp env.example .env

# Edit the .env file with your OpenAI API key
nano .env
```

**Required configuration in `.env`:**
```bash
OPENAI_API_KEY=your_actual_openai_api_key_here
```

### 3. Start the Application

```bash
# Start the complete system
./docker-start.sh
```

### 4. Access the Application

- **Frontend**: http://localhost:3003
- **Backend API**: http://localhost:3004
- **Health Check**: http://localhost:3004/api/health

## 🛠️ Manual Docker Commands

If you prefer to use Docker commands directly:

### Build and Start

```bash
# Build and start with Docker Compose
docker-compose -f docker/docker-compose.yml up --build -d

# View logs
docker-compose -f docker/docker-compose.yml logs -f

# Check status
docker-compose -f docker/docker-compose.yml ps
```

### Stop and Cleanup

```bash
# Stop the application
docker-compose -f docker/docker-compose.yml down

# Stop and remove volumes (WARNING: This will delete all data)
docker-compose -f docker/docker-compose.yml down -v
```

## 📊 What's Included

The Docker container includes:

- ✅ **Complete Web Application** (React Frontend + Node.js Backend)
- ✅ **Julia Optimization Engine** (v1.11.6 with all required packages)
- ✅ **AI Multi-Agent System** (10 specialized AI agents)
- ✅ **Mathematical Solvers** (HiGHS, GLPK, Cbc, Clp, Ipopt)
- ✅ **Data Visualization** (Plots, StatsPlots, GR)
- ✅ **All Dependencies** (Pre-installed and precompiled)

## 🔧 Configuration

### Environment Variables

The `.env` file contains all configuration options:

```bash
# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3004
HOST=0.0.0.0
NODE_ENV=production
FRONTEND_URL=http://localhost:3003

# Julia Configuration
JULIA_PATH=/usr/local/julia/bin/julia
JULIA_DEPOT_PATH=/opt/julia

# Optimization Settings
MAX_CONCURRENT_JOBS=3
OPTIMIZATION_TIMEOUT=1800000
MAX_FILE_SIZE=104857600
JOB_CLEANUP_HOURS=24

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log
```

### Port Configuration

- **3003**: Frontend (React application)
- **3004**: Backend API (Node.js server)

## 📁 Data Persistence

The following data is persisted between container restarts:

- **Uploads**: User-uploaded files
- **Datasets**: Generated optimization datasets
- **Results**: Optimization results and reports
- **Logs**: Application logs

## 🚀 DERConnect Deployment

### Production Deployment Process

For deploying to the DERConnect production environment:

#### 1. Build and Tag Docker Image

```bash
# Navigate to the project directory
cd MCS-CEV-Refactoring/

# Build the Docker image with DERConnect tag
docker build -t derconnectucsd/green-construction-app:latest . #replace 'latest' with version number

# Verify the image was created
docker image ls #to check local docker images
```

#### 2. Test Locally

```bash
# Test the Docker image locally
docker compose up
```

#### 3. Push to DockerHub

```bash
# Log into DockerHub with read/write token (DERConnect Staff only)
docker login --username YOUR_USER

# Push image to DockerHub
docker push derconnectucsd/green-construction-app:latest
```

#### 4. Verify DockerHub Upload

- Verify that the image shows on DockerHub with the correct tag
- Check that the image is publicly accessible

#### 5. Deploy to Production Server

```bash
# Log into the kleissl-websites VM in Brick-apps proxmox

# Update the 'docker-compose-util.yml' with the correct image version
# Copy .env file into documents folder

# Pull the latest image
docker pull derconnectucsd/green-construction-app:latest

# Restart the application
docker compose -f docker-compose-grafana.yml up -d --force-recreate
```

### Version Management

When deploying updates:

1. **Update version tag**: Replace `latest` with a specific version number (e.g., `v1.2.3`)
2. **Update docker-compose files**: Ensure production compose files reference the correct version
3. **Test thoroughly**: Always test locally before pushing to production
4. **Document changes**: Keep track of what changes are included in each version

### Production Environment Variables

Ensure the production `.env` file contains:

```bash
# Production OpenAI API Key
OPENAI_API_KEY=your_production_openai_api_key

# Production URLs
FRONTEND_URL=https://your-production-domain.com
PORT=3004
NODE_ENV=production

# Production Julia Configuration
JULIA_PATH=/usr/local/julia/bin/julia
JULIA_DEPOT_PATH=/opt/julia
```

## 🆘 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the ports
lsof -i :3003
lsof -i :3004

# Stop conflicting services or change ports in docker-compose.yml
```

#### 2. OpenAI API Key Issues
```bash
# Verify your API key is set correctly
cat .env | grep OPENAI_API_KEY

# Test API key validity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
```

#### 3. Container Build Failures
```bash
# Clean build (no cache)
docker-compose -f docker/docker-compose.yml build --no-cache

# Check build logs
docker-compose -f docker/docker-compose.yml build --progress=plain
```

#### 4. Julia Package Installation Issues
```bash
# Check Julia installation in container
docker-compose -f docker/docker-compose.yml exec mcs-optimization julia --version

# Check installed packages
docker-compose -f docker/docker-compose.yml exec mcs-optimization julia -e "using Pkg; Pkg.status()"
```

### Logs and Debugging

```bash
# View all logs
docker-compose -f docker/docker-compose.yml logs

# View specific service logs
docker-compose -f docker/docker-compose.yml logs mcs-optimization

# Follow logs in real-time
docker-compose -f docker/docker-compose.yml logs -f

# Access container shell
docker-compose -f docker/docker-compose.yml exec mcs-optimization bash
```

## 🔄 Updates

To update the application:

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
./docker-start.sh
```

## 📈 Performance

### Resource Requirements

- **CPU**: 2+ cores recommended
- **Memory**: 4GB+ RAM recommended
- **Storage**: 5GB+ free space
- **Network**: Internet connection for OpenAI API

### Optimization

The container is optimized for:
- Fast startup (precompiled Julia packages)
- Efficient memory usage
- Parallel optimization jobs
- Persistent data storage

## 🎯 Next Steps

Once the application is running:

1. **Open the Frontend**: http://localhost:3003
2. **Configure your scenario**: Use the web interface to set up optimization parameters
3. **Run optimization**: Click "Run Optimization" to start the process
4. **View results**: Download and analyze the optimization results

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose -f docker/docker-compose.yml logs`
2. Verify environment configuration: `cat .env`
3. Test individual components
4. Check system resources: `docker stats`

---

**🎉 You're ready to optimize! The complete MCS-CEV system is now running in Docker.**
