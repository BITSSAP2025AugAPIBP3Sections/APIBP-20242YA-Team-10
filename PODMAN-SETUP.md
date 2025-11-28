# Streamify - Podman Setup Guide

## 🐳 Running Streamify with Podman

This guide explains how to run Streamify using Podman instead of Docker.

---

## Prerequisites

- **Podman** and **podman-compose** installed
- At least 4GB RAM available
- Ports 3000-3005 available

### Install podman-compose

```bash
# macOS
brew install podman-compose

# Linux (pip)
pip3 install podman-compose

# Linux (package manager)
sudo apt install podman-compose  # Debian/Ubuntu
sudo dnf install podman-compose  # Fedora
```

---

## 🚀 Quick Start

### 1. Start Podman Machine (macOS/Windows only)

```bash
# Initialize and start podman machine
podman machine init
podman machine start

# Check status
podman machine list
```

### 2. Start All Services

```bash
# Navigate to project directory
cd APIBP-20242YA-Team-10

# Start databases first
podman-compose up -d postgres-auth postgres-video postgres-streaming postgres-billing postgres-analytics

# Wait for databases to initialize (IMPORTANT!)
echo "Waiting 90 seconds for databases..."
sleep 90

# Start all services
podman-compose up --build -d

# Wait for services to start
echo "Waiting 30 seconds for services..."
sleep 30
```

### 3. Verify All Services Are Running

```bash
# Check container status
podman-compose ps

# All containers should show "Up" status
# Databases should show "(healthy)" status

# Test health endpoints
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Video Service
curl http://localhost:3003/health  # Streaming Service
curl http://localhost:3004/health  # Billing Service
curl http://localhost:3005/health  # Analytics Service
```

### 4. Access the Application

Open your browser to: **http://localhost:3000**

---

## 🧪 Test the API

### Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 🛠️ Common Commands

```bash
# View logs
podman-compose logs -f

# View logs for specific service
podman-compose logs -f auth-service
podman-compose logs -f api-gateway

# Restart a service
podman-compose restart auth-service

# Stop all services
podman-compose down

# Stop and remove all data (fresh start)
podman-compose down -v

# Rebuild specific service
podman-compose build auth-service
podman-compose up -d auth-service

# Check resource usage
podman stats

# List all containers
podman ps -a

# List all images
podman images
```

---

## 🐛 Troubleshooting

### Issue 1: Services Stuck in "starting" Status

**Solution:** Restart services after databases are ready

```bash
# Wait for databases
sleep 90

# Restart services
podman-compose restart auth-service video-service streaming-service billing-service analytics-service api-gateway
```

### Issue 2: "Connection Refused" Errors

**Solution:** Ensure podman machine is running (macOS/Windows)

```bash
# Check podman machine
podman machine list

# If stopped, start it
podman machine start

# Wait and restart services
sleep 30
podman-compose restart api-gateway
```

### Issue 3: Port Already in Use

**Solution:** Check what's using the ports

```bash
# Find process using port
lsof -i :3000

# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Or use different ports in docker-compose.yml
```

### Issue 4: "Request Aborted" Errors

**Solution:** This is already fixed in the updated code. If you still see it:

```bash
# Rebuild services with fixes
podman-compose down
podman-compose build api-gateway auth-service
podman-compose up -d

# Wait for services
sleep 60
```

### Issue 5: Permission Denied

**Solution:** Volume permission issues

```bash
# Option 1: Use sudo (not recommended)
sudo podman-compose up -d

# Option 2: Fix ownership
podman unshare chown -R 0:0 ./uploads

# Option 3: Use podman machine
podman machine start
```

---

## 🔄 Complete Reset (Clean Slate)

If nothing works, perform a complete reset:

```bash
# 1. Stop and remove everything
podman-compose down -v

# 2. Remove all project images
podman rmi $(podman images | grep apibp-20242ya-team-10 | awk '{print $3}')

# 3. Clean up system
podman system prune -a --volumes -f

# 4. Restart podman machine (macOS/Windows)
podman machine stop
podman machine rm
podman machine init
podman machine start

# 5. Start fresh
cd APIBP-20242YA-Team-10
podman-compose up --build -d

# 6. Wait for everything to initialize
sleep 120

# 7. Test
curl http://localhost:3000/health
```

---

## 📋 Differences Between Docker and Podman

| Feature | Docker | Podman |
|---------|--------|--------|
| **Daemon** | Requires Docker daemon | Daemonless (runs rootless) |
| **Root Access** | Often requires sudo | Runs as regular user |
| **Compose** | docker-compose | podman-compose |
| **Commands** | `docker` | `podman` |
| **Security** | Daemon runs as root | Rootless by default |
| **Pods** | No native support | Native Kubernetes pods |

**Key Point:** Replace `docker` with `podman` and `docker-compose` with `podman-compose` in all commands.

---

## ✅ Verification Checklist

Before considering setup complete, verify:

- [ ] All 11 containers are running: `podman-compose ps`
- [ ] All databases show "(healthy)" status
- [ ] API Gateway health check passes: `curl http://localhost:3000/health`
- [ ] Auth service health check passes: `curl http://localhost:3001/health`
- [ ] Can register a new user successfully
- [ ] Can login with registered user
- [ ] Web interface loads at http://localhost:3000
- [ ] No errors in logs: `podman-compose logs | grep -i error`

---

## 🚀 Production Deployment

For production environments with Podman:

```bash
# Use Kubernetes manifests
cd k8s/

# Deploy with podman play
podman play kube postgres/postgres-auth.yaml
podman play kube postgres/postgres-video.yaml
podman play kube postgres/postgres-streaming.yaml
podman play kube postgres/postgres-billing.yaml
podman play kube postgres/postgres-analytics.yaml

# Wait for databases
sleep 90

# Deploy services
podman play kube services/auth-deployment.yaml
podman play kube services/video-deployment.yaml
podman play kube services/streaming-deployment.yaml
podman play kube services/billing-deployment.yaml
podman play kube services/analytics-deployment.yaml
podman play kube services/api-gateway-deployment.yaml
```

---

## 📞 Support

If you encounter issues:

1. Check logs: `podman-compose logs <service-name>`
2. Verify podman machine is running: `podman machine list`
3. Ensure ports are available: `lsof -i :3000-3005`
4. Try complete reset (see above)
5. Check this guide for common issues

---

## 🎯 Quick Reference

```bash
# Start everything
podman-compose up -d

# Stop everything
podman-compose down

# View logs
podman-compose logs -f

# Restart service
podman-compose restart <service-name>

# Rebuild
podman-compose build --no-cache

# Clean slate
podman-compose down -v && podman system prune -a --volumes -f
```

---

**✅ Your Streamify platform should now be running successfully with Podman!**

Access it at: **http://localhost:3000**
