# MCS-CEV Optimization - Docker Deployment Guide

**Version:** 1.0
**Date:** March 26, 2026

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/d2rojas/MCS-CEV-CRP.git
cd MCS-CEV-CRP

# 2. Configure environment
cp env.example .env
nano .env  # Add your OpenAI API key (optional)

# 3. Build and deploy
./docker-start.sh

# 4. Access the application
# Open browser to: http://server-ip:3003
```

---

## Prerequisites

### Required Software
- **Docker:** Version 20.10 or newer
- **Docker Compose:** Version 2.0 or newer
- **Git:** For cloning the repository

### System Requirements
- **Minimum:** 2 CPU cores, 4 GB RAM, 10 GB storage
- **Recommended:** 4 CPU cores, 8 GB RAM, 20 GB storage
- **For large scenarios:** 8+ CPU cores, 16+ GB RAM

### Network Requirements
- **Incoming ports:** 3003 (frontend), 3004 (backend API)
- **Outgoing:** Port 443 for OpenAI API (if using AI chat)

---

## Installation Steps

### Step 1: Install Docker (if not already installed)

#### Ubuntu/Debian
```bash
# Update package index
sudo apt-get update

# Install dependencies
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

#### CentOS/RHEL
```bash
# Install Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Verify installation
docker --version
docker compose version
```

### Step 2: Configure Docker Permissions (Optional)

```bash
# Add current user to docker group (to run without sudo)
sudo usermod -aG docker $USER

# Log out and log back in for changes to take effect
# Or run: newgrp docker
```

### Step 3: Clone the Repository

```bash
# Clone from GitHub
git clone https://github.com/d2rojas/MCS-CEV-CRP.git
cd MCS-CEV-CRP

# Verify files are present
ls -la
# You should see: docker/, src/, data/, env.example, docker-start.sh, etc.
```

### Step 4: Configure Environment Variables

```bash
# Create .env file from template
cp env.example .env

# Edit .env file
nano .env
# or use your preferred editor: vim .env, gedit .env, etc.
```

**Required Configuration:**

```bash
# OpenAI API Key (REQUIRED for AI chat features - optional for core optimization)
OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# Server ports (usually keep default values)
PORT=3004
FRONTEND_URL=http://localhost:3003

# Julia path (auto-configured in Docker, no changes needed)
JULIA_PATH=/usr/local/julia/bin/julia
```

**Optional Configurations:**
```bash
# Adjust if needed
MAX_CONCURRENT_JOBS=3          # Number of simultaneous optimizations
OPTIMIZATION_TIMEOUT=1800000   # 30 minutes in milliseconds
MAX_FILE_SIZE=104857600        # 100 MB max upload
LOG_LEVEL=info                 # debug, info, warn, error
```

### Step 5: Build and Start the Application

#### Using the startup script (recommended):
```bash
# Make script executable (if not already)
chmod +x docker-start.sh

# Run the startup script
./docker-start.sh
```

The script will:
1. ✅ Check Docker installation
2. ✅ Verify environment configuration
3. ✅ Stop any existing containers
4. ✅ Build the Docker image (~5-10 minutes first time)
5. ✅ Start the containers
6. ✅ Verify services are running
7. ✅ Display access URLs

#### Manual Docker Compose commands:
```bash
# Build and start (detached mode)
docker compose -f docker/docker-compose.yml up --build -d

# View logs
docker compose -f docker/docker-compose.yml logs -f

# Stop the application
docker compose -f docker/docker-compose.yml down
```

---

## Verifying the Deployment

### Check Container Status
```bash
# View running containers
docker ps

# Expected output:
# CONTAINER ID   IMAGE                  STATUS                  PORTS
# xxxx           mcs-cev-optimization   Up X minutes (healthy)  0.0.0.0:3003->3003/tcp, 0.0.0.0:3004->3004/tcp
```

### Check Application Health
```bash
# Test backend API
curl http://localhost:3004/api/health

# Expected response:
# {"status":"OK","message":"MCS-CEV Optimization Backend is running"}
```

### Access the Web Interface
```bash
# Open in browser
http://localhost:3003

# Or if on remote server:
http://server-ip-address:3003
```

### View Logs
```bash
# View all logs
docker compose -f docker/docker-compose.yml logs

# Follow logs in real-time
docker compose -f docker/docker-compose.yml logs -f

# View specific service logs
docker compose -f docker/docker-compose.yml logs mcs-optimization
```

---

## Port Configuration

### Default Ports
- **3003** - Frontend web interface (React app)
- **3004** - Backend API server (Node.js + Express)

### Changing Ports

#### If ports 3003/3004 are already in use:

**Option 1: Modify docker-compose.yml**
```yaml
services:
  mcs-optimization:
    ports:
      - "8080:3003"   # Map external port 8080 to internal 3003
      - "8081:3004"   # Map external port 8081 to internal 3004
```

**Option 2: Use different external ports**
```bash
# Edit docker-compose.yml
nano docker/docker-compose.yml

# Change ports section:
ports:
  - "YOUR_FRONTEND_PORT:3003"
  - "YOUR_BACKEND_PORT:3004"
```

After changing ports, rebuild:
```bash
docker compose -f docker/docker-compose.yml down
docker compose -f docker/docker-compose.yml up --build -d
```

---

## Firewall Configuration

### Ubuntu/Debian (UFW)
```bash
# Allow frontend port
sudo ufw allow 3003/tcp

# Allow backend port
sudo ufw allow 3004/tcp

# Reload firewall
sudo ufw reload

# Check status
sudo ufw status
```

### CentOS/RHEL (firewalld)
```bash
# Allow frontend port
sudo firewall-cmd --permanent --add-port=3003/tcp

# Allow backend port
sudo firewall-cmd --permanent --add-port=3004/tcp

# Reload firewall
sudo firewall-cmd --reload

# Check status
sudo firewall-cmd --list-ports
```

### Cloud Provider Security Groups

If deploying on AWS, Azure, or GCP, configure security groups:
1. Open inbound rules
2. Add TCP rule for port 3003 (frontend)
3. Add TCP rule for port 3004 (backend API)
4. Source: Your IP or 0.0.0.0/0 (public access)

---

## Data Persistence

### Volume Mounts

The application uses Docker volumes for data persistence:

```yaml
volumes:
  # Results from optimizations
  - ../results:/app/results

  # Application logs
  - ../logs:/app/logs

  # Uploaded datasets
  - mcs-uploads:/app/web-interface/backend/uploads

  # Generated datasets
  - mcs-datasets:/app/web-interface/backend/datasets

  # Optimization results
  - mcs-backend-results:/app/web-interface/backend/results
```

### Accessing Data

```bash
# View results on host machine
ls -lh results/

# View logs
tail -f logs/app.log

# Enter container to access data
docker exec -it mcs-cev-optimization bash
cd /app/results
ls -lh
```

### Backing Up Data

```bash
# Backup results directory
tar -czf results-backup-$(date +%Y%m%d).tar.gz results/

# Backup Docker volumes
docker run --rm -v mcs-uploads:/data -v $(pwd):/backup \
  ubuntu tar czf /backup/uploads-backup.tar.gz /data

# Copy to remote server
scp results-backup-*.tar.gz user@backup-server:/backups/
```

---

## Maintenance and Operations

### Starting and Stopping

```bash
# Stop the application
docker compose -f docker/docker-compose.yml stop

# Start the application (after stop)
docker compose -f docker/docker-compose.yml start

# Restart the application
docker compose -f docker/docker-compose.yml restart

# Remove containers (but keep volumes/data)
docker compose -f docker/docker-compose.yml down

# Remove containers AND volumes (⚠️ deletes data!)
docker compose -f docker/docker-compose.yml down -v
```

### Updating the Application

```bash
# Pull latest code from GitHub
git pull origin main

# Rebuild and restart
docker compose -f docker/docker-compose.yml up --build -d

# View logs to verify update
docker compose -f docker/docker-compose.yml logs -f
```

### Cleaning Up

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove all unused Docker resources
docker system prune -a
```

### Monitoring Resources

```bash
# View container resource usage
docker stats

# View disk usage
docker system df

# View detailed container info
docker inspect mcs-cev-optimization
```

---

## Troubleshooting

### Issue 1: Container fails to start

**Symptoms:**
```bash
docker ps  # Shows no running containers
```

**Solutions:**
```bash
# Check logs for errors
docker compose -f docker/docker-compose.yml logs

# Common causes:
# 1. Port already in use
sudo lsof -i :3003
sudo lsof -i :3004

# 2. Missing .env file
ls -la .env

# 3. Invalid environment variables
cat .env | grep OPENAI_API_KEY
```

### Issue 2: "Cannot connect to backend" error

**Symptoms:** Frontend loads but shows connection error

**Solutions:**
```bash
# Check backend is running
curl http://localhost:3004/api/health

# Check container logs
docker compose -f docker/docker-compose.yml logs mcs-optimization

# Restart services
docker compose -f docker/docker-compose.yml restart
```

### Issue 3: Julia optimization fails

**Symptoms:** Optimization starts but ends with error

**Solutions:**
```bash
# Enter container
docker exec -it mcs-cev-optimization bash

# Test Julia directly
julia --version

# Test optimization with sample data
cd /app
julia src/julia/mcs_optimization_main.jl data/1MCS-1CEV-2nodes-24hours

# Check Julia packages
julia -e 'using Pkg; Pkg.status()'
```

### Issue 4: Out of memory

**Symptoms:** Container crashes or becomes unresponsive

**Solutions:**
```bash
# Check memory usage
docker stats

# Increase Docker memory limit (Docker Desktop)
# Open Docker Desktop → Settings → Resources → Memory → Increase

# For large scenarios, reduce concurrent jobs in .env:
MAX_CONCURRENT_JOBS=1
```

### Issue 5: Permission denied errors

**Symptoms:** Cannot write to volumes or access files

**Solutions:**
```bash
# Fix ownership of mounted directories
sudo chown -R $USER:$USER results/
sudo chown -R $USER:$USER logs/

# Or run container with specific user
docker compose -f docker/docker-compose.yml down
# Edit docker-compose.yml, add: user: "${UID}:${GID}"
docker compose -f docker/docker-compose.yml up -d
```

---

## Security Best Practices

### 1. Protect API Keys
```bash
# Never commit .env to git
# Verify .env is in .gitignore
grep ".env" .gitignore

# Use environment-specific .env files
# .env.production (for server)
# .env.development (for local testing)
```

### 2. Restrict Network Access
```bash
# Use firewall to limit access
# Only allow specific IP addresses
sudo ufw allow from YOUR_IP_ADDRESS to any port 3003
sudo ufw allow from YOUR_IP_ADDRESS to any port 3004
```

### 3. Regular Updates
```bash
# Update base images regularly
docker compose -f docker/docker-compose.yml pull
docker compose -f docker/docker-compose.yml up --build -d

# Update Node.js packages
docker exec -it mcs-cev-optimization bash
cd /app/src/web-interface/backend
npm update
npm audit fix
```

### 4. Use HTTPS (Production)

For production deployment, use a reverse proxy (nginx) with SSL:

```nginx
# /etc/nginx/sites-available/mcs-cev
server {
    listen 443 ssl;
    server_name your-domain.edu;

    ssl_certificate /etc/ssl/certs/your-cert.crt;
    ssl_certificate_key /etc/ssl/private/your-key.key;

    location / {
        proxy_pass http://localhost:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Performance Tuning

### For Large-Scale Deployments

**Increase container resources:**
```yaml
# docker-compose.yml
services:
  mcs-optimization:
    deploy:
      resources:
        limits:
          cpus: '8.0'
          memory: 16G
        reservations:
          cpus: '4.0'
          memory: 8G
```

**Adjust optimization settings:**
```bash
# .env
MAX_CONCURRENT_JOBS=5           # More simultaneous jobs
OPTIMIZATION_TIMEOUT=3600000    # 60 minutes
```

**Julia performance:**
```bash
# Set Julia threads (in Dockerfile or docker-compose.yml)
ENV JULIA_NUM_THREADS=8
```

---

## Monitoring and Logging

### Application Logs

```bash
# View all logs
docker compose -f docker/docker-compose.yml logs -f

# Filter logs
docker compose -f docker/docker-compose.yml logs -f | grep ERROR

# Save logs to file
docker compose -f docker/docker-compose.yml logs > app-logs-$(date +%Y%m%d).txt
```

### Health Monitoring

```bash
# Automated health check script
cat > check-health.sh << 'EOF'
#!/bin/bash
HEALTH=$(curl -s http://localhost:3004/api/health | jq -r '.status')
if [ "$HEALTH" == "OK" ]; then
    echo "✅ Application is healthy"
    exit 0
else
    echo "❌ Application is unhealthy"
    exit 1
fi
EOF

chmod +x check-health.sh

# Add to cron for regular checks
crontab -e
# Add line: */5 * * * * /path/to/check-health.sh
```

---

## Production Checklist

Before deploying to production:

- [ ] ✅ Docker and Docker Compose installed
- [ ] ✅ `.env` file configured with valid API keys
- [ ] ✅ Firewall rules configured
- [ ] ✅ Ports 3003 and 3004 accessible
- [ ] ✅ SSL certificate configured (for HTTPS)
- [ ] ✅ Backup strategy implemented
- [ ] ✅ Monitoring and logging configured
- [ ] ✅ Health check endpoint verified
- [ ] ✅ Test optimization completed successfully
- [ ] ✅ Documentation shared with team
- [ ] ✅ Support contact information available

---

## Getting Help

### Check Documentation
1. **README.md** - Project overview
2. **DOCKER_README.md** - Detailed Docker guide
3. **USER_MANUAL.md** - Step-by-step usage
4. **PROJECT_READINESS_ASSESSMENT.md** - Technical review

### Debugging Commands
```bash
# Container shell access
docker exec -it mcs-cev-optimization bash

# Check Julia installation
docker exec -it mcs-cev-optimization julia --version

# Check Node.js version
docker exec -it mcs-cev-optimization node --version

# Test backend directly
docker exec -it mcs-cev-optimization curl http://localhost:3004/api/health

# View environment variables
docker exec -it mcs-cev-optimization env
```

### Support Contacts
- **GitHub Issues:** https://github.com/d2rojas/MCS-CEV-CRP/issues
- **Project Lead:** [Your contact information]
- **University IT Support:** [IT support contact]

---

## Appendix: Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Container                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Ubuntu 22.04 Base Image                              │  │
│  │                                                        │  │
│  │  ┌────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │ Julia 1.11 │  │ Node.js 18  │  │ System Deps  │  │  │
│  │  │  + JuMP    │  │  + Express  │  │  + Graphics  │  │  │
│  │  │  + HiGHS   │  │  + React    │  │  + Math Libs │  │  │
│  │  └────────────┘  └─────────────┘  └──────────────┘  │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │  Backend (Port 3004)                         │    │  │
│  │  │  - Express API server                        │    │  │
│  │  │  - WebSocket for real-time updates          │    │  │
│  │  │  - Julia process spawner                    │    │  │
│  │  │  - AI agent orchestration                   │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  │                                                        │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │  Frontend (Port 3003)                        │    │  │
│  │  │  - React web application                     │    │  │
│  │  │  - Step-by-step wizard                      │    │  │
│  │  │  - Results visualization                     │    │  │
│  │  │  - AI chat interface                        │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  │                                                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Volumes:                                                    │
│  - /app/results     → Host: ./results                       │
│  - /app/logs        → Host: ./logs                          │
│  - mcs-uploads      → Docker volume                         │
│  - mcs-datasets     → Docker volume                         │
│  - mcs-results      → Docker volume                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Network (bridge)
                              │
                    ┌─────────┴─────────┐
                    │                   │
              Port 3003           Port 3004
           (Frontend UI)       (Backend API)
```

---

**Deployment Guide Version:** 1.0
**Last Updated:** March 26, 2026
**Maintained by:** MCS-CEV Optimization Team
