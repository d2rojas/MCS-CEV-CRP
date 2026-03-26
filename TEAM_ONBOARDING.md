# MCS-CEV Optimization System - Team Onboarding

**Repository:** https://github.com/d2rojas/MCS-CEV-CRP
**Status:** ✅ Ready for Production Deployment
**Date:** March 26, 2026

---

## 🎉 Welcome to the Team!

This document will help you get started with the MCS-CEV Optimization System. The project is production-ready and can be deployed to the university server using Docker.

---

## 📋 Quick Links

- **GitHub Repository:** https://github.com/d2rojas/MCS-CEV-CRP
- **Main Documentation:** [README.md](README.md)
- **User Manual:** [docs/USER_MANUAL.md](docs/USER_MANUAL.md)
- **Docker Deployment Guide:** [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)
- **Project Assessment:** [docs/PROJECT_READINESS_ASSESSMENT.md](docs/PROJECT_READINESS_ASSESSMENT.md)

---

## 🚀 Quick Start (3 Steps)

### Step 1: Clone the Repository

```bash
git clone https://github.com/d2rojas/MCS-CEV-CRP.git
cd MCS-CEV-CRP
```

### Step 2: Configure Environment

```bash
# Create .env file from template
cp env.example .env

# Edit .env file with your OpenAI API key (optional - only for AI chat)
nano .env
# Change: OPENAI_API_KEY=your_openai_api_key_here
# To: OPENAI_API_KEY=sk-your-actual-key
```

### Step 3: Deploy with Docker

```bash
# Make script executable
chmod +x docker-start.sh

# Start the application
./docker-start.sh

# Access the application
# Open browser to: http://localhost:3003
```

---

## 🎯 What This System Does

The MCS-CEV Optimization System helps optimize the operation of **Mobile Charging Stations (MCS)** that serve **Construction Electric Vehicles (CEV)**. It determines:

- ⚡ **When** each MCS should charge from the grid (to minimize costs)
- 🚛 **Where** each MCS should travel (which construction sites)
- 🔌 **How much power** to deliver to each CEV
- 🏗️ **When** each CEV should perform its work

**Key Benefits:**
- Minimizes total operational costs (electricity + carbon + demand charges)
- Leverages time-varying electricity prices
- Accounts for carbon emission factors
- Provides comprehensive visualizations and reports

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  MCS-CEV System                         │
│                                                         │
│  ┌─────────────────┐  ┌──────────────────────────┐   │
│  │  React Frontend │  │  Node.js Backend         │   │
│  │  (Port 3003)    │──│  (Port 3004)             │   │
│  │                 │  │  • Express API           │   │
│  │  • Wizard UI    │  │  • WebSocket             │   │
│  │  • AI Chat      │  │  • Julia spawner         │   │
│  │  • Results View │  │  • Multi-agent AI        │   │
│  └─────────────────┘  └──────────────────────────┘   │
│                              │                         │
│                              ▼                         │
│                    ┌──────────────────┐               │
│                    │  Julia Engine    │               │
│                    │  • JuMP/HiGHS    │               │
│                    │  • Optimization  │               │
│                    │  • Visualization │               │
│                    └──────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

---

## 🐳 Docker Deployment (Recommended for University Server)

### Prerequisites

**Required on server:**
- Docker 20.10+ ([Install Guide](https://docs.docker.com/engine/install/))
- Docker Compose 2.0+ (usually included with Docker)
- Git (for cloning)

**System Requirements:**
- **Minimum:** 2 CPU cores, 4 GB RAM, 10 GB storage
- **Recommended:** 4 CPU cores, 8 GB RAM, 20 GB storage

### Deployment Steps

```bash
# 1. Install Docker (if not already installed)
# Ubuntu/Debian:
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin

# CentOS/RHEL:
sudo yum install -y docker docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker

# 2. Add user to docker group (optional - to run without sudo)
sudo usermod -aG docker $USER
# Log out and log back in

# 3. Clone repository
git clone https://github.com/d2rojas/MCS-CEV-CRP.git
cd MCS-CEV-CRP

# 4. Configure environment
cp env.example .env
nano .env  # Add OpenAI API key if using AI chat

# 5. Deploy
./docker-start.sh

# 6. Access application
# Open browser to: http://server-ip:3003
```

### Verify Deployment

```bash
# Check if containers are running
docker ps

# Check backend health
curl http://localhost:3004/api/health

# View logs
docker compose -f docker/docker-compose.yml logs -f
```

---

## 📦 What's in the Docker Container?

The Docker image includes:
- ✅ **Ubuntu 22.04** base system
- ✅ **Julia 1.11.6** with optimization packages (JuMP, HiGHS, etc.)
- ✅ **Node.js 18** for backend and frontend
- ✅ **All dependencies** pre-installed
- ✅ **System libraries** for plotting and optimization
- ✅ **Sample datasets** for testing

**Total image size:** ~2-3 GB (first build takes 5-10 minutes)

---

## 🔧 Configuration

### Environment Variables (.env file)

**Required:**
```bash
# OpenAI API Key (for AI chat features - optional)
OPENAI_API_KEY=sk-your-key-here
```

**Optional (defaults work fine):**
```bash
# Server ports
PORT=3004                    # Backend port
FRONTEND_URL=http://localhost:3003

# Optimization settings
MAX_CONCURRENT_JOBS=3        # Simultaneous optimizations
OPTIMIZATION_TIMEOUT=1800000 # 30 minutes
MAX_FILE_SIZE=104857600      # 100 MB

# Logging
LOG_LEVEL=info              # debug, info, warn, error
```

### Port Configuration

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 3003 | Web interface (React) |
| Backend API | 3004 | REST API + WebSocket |

**Changing ports:** Edit `docker/docker-compose.yml` and update the `ports:` section.

### Firewall Configuration

**Allow incoming traffic:**
```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 3003/tcp  # Frontend
sudo ufw allow 3004/tcp  # Backend API
sudo ufw reload

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=3003/tcp
sudo firewall-cmd --permanent --add-port=3004/tcp
sudo firewall-cmd --reload
```

---

## 📊 Sample Datasets

The repository includes 3 ready-to-use datasets:

### 1. `1MCS-1CEV-2nodes-24hours` (Simple)
- **Configuration:** 1 MCS, 1 CEV, 2 nodes (1 grid + 1 site)
- **Duration:** 24 hours (96 periods at 15-min resolution)
- **Use case:** Quick testing and demonstration
- **Run time:** ~5 seconds

### 2. `report_CPR_1` (Medium)
- **Configuration:** 1 MCS, 2 CEVs, 2 nodes (1 grid + 1 site)
- **Duration:** 24 hours
- **Use case:** Multiple CEVs at single site
- **Run time:** ~10-15 seconds

### 3. `report_CPR_2` (Complex)
- **Configuration:** 1 MCS, 2 CEVs, 3 nodes (1 grid + 2 sites)
- **Duration:** 24 hours
- **Use case:** Multiple sites scenario
- **Run time:** ~20-30 seconds

**Test the system:**
```bash
# Inside Docker container
docker exec -it mcs-cev-optimization bash
julia src/julia/mcs_optimization_main.jl data/1MCS-1CEV-2nodes-24hours

# Or from host (if Julia installed locally)
julia src/julia/mcs_optimization_main.jl data/1MCS-1CEV-2nodes-24hours
```

---

## 📖 Documentation

### For End Users
- **[USER_MANUAL.md](docs/USER_MANUAL.md)** (33 KB) - Complete step-by-step guide
  - How to use the web interface
  - Parameter explanations
  - Results interpretation
  - Troubleshooting FAQs

### For Developers/Admins
- **[README.md](README.md)** - Project overview
- **[DOCKER_README.md](DOCKER_README.md)** - Detailed Docker guide
- **[DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)** (23 KB) - Production deployment
  - Installation steps
  - Server configuration
  - Monitoring and maintenance
  - Security best practices

### For Technical Review
- **[PROJECT_READINESS_ASSESSMENT.md](docs/PROJECT_READINESS_ASSESSMENT.md)** (17 KB)
  - Complete code review
  - Architecture analysis
  - Security assessment
  - Performance considerations

---

## 🧪 Testing the Deployment

### 1. Backend API Test
```bash
curl http://localhost:3004/api/health

# Expected response:
# {"status":"OK","message":"MCS-CEV Optimization Backend is running"}
```

### 2. Frontend Test
Open browser to: `http://localhost:3003`

You should see the optimization wizard interface.

### 3. Full Optimization Test
1. Open web interface: `http://localhost:3003`
2. Use "Load Sample Dataset" or upload `data/1MCS-1CEV-2nodes-24hours.zip`
3. Click "Run Optimization"
4. Wait ~5-10 seconds
5. View results (12 PNG files + CSV exports)

---

## 🔍 Monitoring and Maintenance

### View Logs
```bash
# All logs
docker compose -f docker/docker-compose.yml logs

# Follow logs in real-time
docker compose -f docker/docker-compose.yml logs -f

# Filter for errors
docker compose -f docker/docker-compose.yml logs | grep ERROR
```

### Check Resource Usage
```bash
# Container stats (CPU, memory, network)
docker stats

# Disk usage
docker system df
```

### Stop/Start/Restart
```bash
# Stop the application
docker compose -f docker/docker-compose.yml stop

# Start (after stop)
docker compose -f docker/docker-compose.yml start

# Restart
docker compose -f docker/docker-compose.yml restart

# Remove containers (keeps data volumes)
docker compose -f docker/docker-compose.yml down
```

### Update the Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose -f docker/docker-compose.yml up --build -d
```

---

## 🐛 Troubleshooting

### Issue: Container fails to start

**Check logs:**
```bash
docker compose -f docker/docker-compose.yml logs
```

**Common causes:**
1. Ports 3003/3004 already in use
   ```bash
   sudo lsof -i :3003
   sudo lsof -i :3004
   ```
2. Missing .env file
   ```bash
   ls -la .env
   ```

### Issue: "Cannot connect to backend"

**Check backend health:**
```bash
curl http://localhost:3004/api/health
```

**Restart services:**
```bash
docker compose -f docker/docker-compose.yml restart
```

### Issue: Julia optimization fails

**Enter container:**
```bash
docker exec -it mcs-cev-optimization bash
```

**Test Julia:**
```bash
julia --version
julia -e 'using JuMP, HiGHS'
```

**Test optimization:**
```bash
julia src/julia/mcs_optimization_main.jl data/1MCS-1CEV-2nodes-24hours
```

### Issue: Out of memory

**Check memory usage:**
```bash
docker stats
```

**Reduce concurrent jobs** in .env:
```bash
MAX_CONCURRENT_JOBS=1
```

---

## 🔐 Security Best Practices

### 1. Protect API Keys
```bash
# Never commit .env to git (already in .gitignore)
# Verify:
grep ".env" .gitignore
```

### 2. Restrict Network Access
```bash
# Use firewall to limit access to specific IPs
sudo ufw allow from YOUR_IP to any port 3003
sudo ufw allow from YOUR_IP to any port 3004
```

### 3. Use HTTPS in Production
Set up a reverse proxy (nginx) with SSL certificate for production deployment. See [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for details.

### 4. Regular Updates
```bash
# Update code
git pull origin main

# Rebuild container
docker compose -f docker/docker-compose.yml up --build -d

# Update Node.js packages (inside container)
docker exec -it mcs-cev-optimization bash
cd /app/src/web-interface/backend
npm update
npm audit fix
```

---

## 🙋 Getting Help

### Check Documentation First
1. [USER_MANUAL.md](docs/USER_MANUAL.md) - Usage questions
2. [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) - Deployment issues
3. [PROJECT_READINESS_ASSESSMENT.md](docs/PROJECT_READINESS_ASSESSMENT.md) - Technical details

### Debugging Commands
```bash
# Container shell access
docker exec -it mcs-cev-optimization bash

# Check Julia
docker exec -it mcs-cev-optimization julia --version

# Check Node.js
docker exec -it mcs-cev-optimization node --version

# Test backend
docker exec -it mcs-cev-optimization curl http://localhost:3004/api/health

# View environment variables
docker exec -it mcs-cev-optimization env
```

### Create GitHub Issue
If you encounter bugs or have questions:
1. Go to: https://github.com/d2rojas/MCS-CEV-CRP/issues
2. Click "New Issue"
3. Provide: OS, Docker version, error logs, steps to reproduce

---

## ✅ Pre-Deployment Checklist

Before deploying to university server, verify:

- [ ] Docker and Docker Compose installed
- [ ] Ports 3003 and 3004 available
- [ ] Firewall configured to allow incoming traffic
- [ ] `.env` file configured (OpenAI key optional)
- [ ] Server has minimum 4 GB RAM
- [ ] Server has 20+ GB free disk space
- [ ] Network access to pull Docker images
- [ ] Tested with sample dataset locally

---

## 📊 Expected Results

### Sample Output (1MCS-1CEV-2nodes-24hours)

**Optimization Metrics:**
- ✅ Status: OPTIMAL
- ✅ Objective Value: $6.20
- ✅ Total Energy: 23.21 kWh
- ✅ Energy Efficiency: 95%
- ✅ Execution Time: ~5 seconds
- ✅ Work Completion: 100%

**Generated Files (12 total):**
1. Combined overview (8-panel plot)
2. Total grid power profile (PNG + CSV)
3. Work profiles by site (PNG + CSV)
4. MCS state of energy (PNG + CSV)
5. CEV state of energy (PNG + CSV)
6. Electricity prices (PNG + CSV)
7. MCS location trajectory (PNG + CSV)
8. Node map with assignments (PNG)
9. Optimization summary (PNG)
10. Cost/emissions analysis (PNG + 2 CSVs)
11. Individual MCS power profiles (PNG + CSV per MCS)

---

## 🎓 University Server Deployment Workflow

### Phase 1: Local Testing (Your Machine)
1. Clone repo: `git clone https://github.com/d2rojas/MCS-CEV-CRP.git`
2. Run locally: `./docker-start.sh`
3. Test with sample dataset
4. Verify all features work

### Phase 2: Server Preparation
1. SSH into university server
2. Install Docker and Docker Compose
3. Configure firewall rules
4. Set up monitoring (optional)

### Phase 3: Deployment
1. Clone repo on server
2. Configure `.env` file
3. Run `./docker-start.sh`
4. Verify health checks pass
5. Test with sample dataset

### Phase 4: Team Access
1. Share server URL with team: `http://server-ip:3003`
2. Share this onboarding document
3. Provide access to GitHub repository
4. Set up team communication channel for support

---

## 🚀 Production Deployment Command Summary

```bash
# Full deployment script (copy-paste ready)

# 1. Install Docker (Ubuntu/Debian)
sudo apt-get update && \
sudo apt-get install -y docker.io docker-compose-plugin && \
sudo systemctl start docker && \
sudo systemctl enable docker

# 2. Add user to docker group
sudo usermod -aG docker $USER
# Log out and log back in

# 3. Clone and setup
git clone https://github.com/d2rojas/MCS-CEV-CRP.git && \
cd MCS-CEV-CRP && \
cp env.example .env

# 4. Configure firewall
sudo ufw allow 3003/tcp && \
sudo ufw allow 3004/tcp && \
sudo ufw reload

# 5. Deploy
chmod +x docker-start.sh && \
./docker-start.sh

# 6. Verify
curl http://localhost:3004/api/health

# 7. Access application
# Open browser to: http://server-ip:3003
```

---

## 📞 Support Contacts

- **GitHub Repository:** https://github.com/d2rojas/MCS-CEV-CRP
- **GitHub Issues:** https://github.com/d2rojas/MCS-CEV-CRP/issues
- **Project Lead:** [Your contact information]
- **University IT Support:** [IT support contact]

---

## 🎉 You're All Set!

The MCS-CEV Optimization System is now ready for deployment. Follow the quick start guide above, and refer to the detailed documentation for any questions.

**Remember:**
- ✅ Docker handles all dependencies
- ✅ Sample datasets included for testing
- ✅ Comprehensive documentation available
- ✅ Production-ready and tested

**Happy Optimizing!** 🚛⚡🏗️

---

**Onboarding Document Version:** 1.0
**Last Updated:** March 26, 2026
**Repository:** https://github.com/d2rojas/MCS-CEV-CRP
