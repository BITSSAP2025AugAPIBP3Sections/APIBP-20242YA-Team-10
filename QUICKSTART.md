# Streamify Microservices - Quick Start Guide

## Prerequisites

- Docker and Docker Compose installed
- At least 4GB RAM available
- Ports 3000-3005 available

## 🚀 Quick Start (5 minutes)

### 1. Start All Services

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd APIBP-20242YA-Team-10

# Build and start all services
docker-compose up --build -d
```

This command will:
- Build 6 microservices (Auth, Video, Streaming, Billing, Analytics, API Gateway)
- Start 5 PostgreSQL databases
- Initialize all database schemas automatically
- Set up networking between services

### 2. Verify Services Are Running

```bash
# Check all containers are running
docker-compose ps

# You should see all services as "Up"
```

### 3. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

You'll be automatically redirected to the login page.

### 4. Create Your First Account

1. Click "Register" on the login page
2. Fill in your details:
   - First Name
   - Last Name
   - Email
   - Password
3. Click "Register"
4. You'll be automatically logged in

### 5. Explore the Platform

Once logged in, you'll have access to:

- **Dashboard** - Overview of all services
- **Videos** - Browse and upload videos
- **Streaming** - Watch videos (pay-per-minute)
- **Billing** - Manage your account balance
- **Analytics** - View statistics and reports
- **Profile** - Manage your account

## 💰 Add Funds to Your Account

Before streaming videos, you need to add funds:

1. Go to the **Billing** page
2. Click one of the quick deposit buttons ($5, $10, $20, $50)
3. Your balance will update immediately

## 🎥 Upload and Watch Videos

### Upload a Video

1. Go to the **Videos** page
2. Click "Upload Video"
3. Fill in:
   - Title
   - Description (optional)
   - Category
   - Price per minute
   - Select video file
4. Click "Upload"

### Watch a Video

1. Go to the **Streaming** page
2. Browse available videos
3. Click "Watch" on any video
4. Click "Play" to start streaming
5. You'll be charged per minute watched

## 📊 View Analytics

1. Go to the **Analytics** page
2. View platform-wide statistics:
   - Total views
   - Total revenue
   - Total watch time
3. View your personal activity history

## 🔧 Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service
docker-compose logs -f video-service
docker-compose logs -f streaming-service
docker-compose logs -f billing-service
docker-compose logs -f analytics-service
docker-compose logs -f api-gateway
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v
```

### Restart a Single Service

```bash
docker-compose restart auth-service
```

### Rebuild After Code Changes

```bash
docker-compose up --build -d
```

## 🏗️ Architecture Overview

The platform consists of 6 independent microservices:

1. **API Gateway (3000)** - Single entry point for all requests
2. **Auth Service (3001)** - User authentication and profiles
3. **Video Service (3002)** - Video catalog and file management
4. **Streaming Service (3003)** - Video playback sessions
5. **Billing Service (3004)** - Payment processing
6. **Analytics Service (3005)** - Data analytics and reporting

Each service has its own PostgreSQL database for complete data isolation.

## 🔍 Health Checks

Check if services are healthy:

```bash
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Video Service
curl http://localhost:3003/health  # Streaming Service
curl http://localhost:3004/health  # Billing Service
curl http://localhost:3005/health  # Analytics Service
```

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check for port conflicts
lsof -i :3000-3005

# Check Docker resources
docker stats

# View error logs
docker-compose logs
```

### Database Connection Issues

```bash
# Restart databases
docker-compose restart postgres-auth postgres-video postgres-streaming postgres-billing postgres-analytics

# Wait 30 seconds, then restart services
docker-compose restart auth-service video-service streaming-service billing-service analytics-service
```

### Clean Slate (Reset Everything)

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Rebuild and start fresh
docker-compose up --build -d
```

## 📚 Additional Documentation

- **MICROSERVICES.md** - Comprehensive architecture documentation
- **README.md** - Project overview and team information
- **v1.yaml** - API specification

## 🎯 Test the API Directly

You can also test the API endpoints directly:

### Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the returned token for authenticated requests.

### Get Videos

```bash
curl http://localhost:3000/api/videos
```

### Check Balance (Authenticated)

```bash
curl http://localhost:3000/api/billing/balance \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🎓 Learning Resources

1. **Microservices Pattern** - Each service is independent and scalable
2. **Database per Service** - Each microservice has its own database
3. **API Gateway Pattern** - Single entry point for all client requests
4. **Service Discovery** - Docker networking enables service-to-service communication
5. **Health Checks** - Each service exposes health status

## 📞 Support

For issues or questions:
1. Check the logs: `docker-compose logs -f`
2. Review MICROSERVICES.md for detailed documentation
3. Check service health endpoints
4. Contact the development team

---

**You're all set! Happy streaming! 🎬**
