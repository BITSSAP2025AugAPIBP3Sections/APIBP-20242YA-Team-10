# Streamify - Architecture Diagrams

This document contains the System Context, Container, and Deployment diagrams for the Streamify video streaming platform following the C4 model.

---

## 1. System Context Diagram

### Overview
The System Context diagram shows how Streamify fits into the world around it, depicting the system as a whole and its relationships with users and external systems.
.
```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                         External Systems                            │
│                                                                     │
│  ┌──────────────────┐         ┌──────────────────┐                │
│  │  Payment Gateway │         │  Email Service   │                │
│  │   (Future)       │         │    (Future)      │                │
│  └──────────────────┘         └──────────────────┘                │
│           │                             │                          │
└───────────┼─────────────────────────────┼──────────────────────────┘
            │                             │
            │                             │
            ▼                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                    STREAMIFY SYSTEM                                 │
│          Video Streaming Platform with Microservices               │
│                                                                     │
│  • User Authentication & Authorization                              │
│  • Video Upload & Management                                        │
│  • Pay-per-Minute Video Streaming                                   │
│  • Billing & Payment Processing                                     │
│  • Analytics & Reporting                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
            ▲                             ▲
            │                             │
            │                             │
   ┌────────┴────────┐         ┌─────────┴─────────┐
   │                 │         │                   │
   │  End Users      │         │  Content Creators │
   │  (Viewers)      │         │  (Uploaders)      │
   │                 │         │                   │
   │  • Watch videos │         │  • Upload videos  │
   │  • Manage funds │         │  • Track revenue  │
   │  • View history │         │  • View analytics │
   │                 │         │                   │
   └─────────────────┘         └───────────────────┘
```

### Key Actors

1. **End Users (Viewers)**
   - Watch videos on pay-per-minute basis
   - Manage account balance
   - View viewing history and statistics

2. **Content Creators (Uploaders)**
   - Upload and manage video content
   - Set pricing for videos
   - Track video performance and revenue

3. **Payment Gateway (Future Integration)**
   - Process credit card payments
   - Handle payment verification
   - Manage refunds

4. **Email Service (Future Integration)**
   - Send registration confirmations
   - Send transaction receipts
   - Send notifications

---

## 2. Container Diagram

### Overview
The Container diagram zooms into the Streamify system, showing the high-level technical building blocks (containers) and how they communicate.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           STREAMIFY SYSTEM                                │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     WEB BROWSER                                   │   │
│  │                 Single Page Application                           │   │
│  │        [HTML/CSS/JavaScript - Vanilla JS]                         │   │
│  │                                                                    │   │
│  │  • User Authentication UI    • Video Player                       │   │
│  │  • Video Upload Forms        • Analytics Dashboard                │   │
│  │  • Billing Interface         • Profile Management                 │   │
│  └────────────────────────────┬─────────────────────────────────────┘   │
│                                │                                          │
│                                │ HTTPS/JSON                               │
│                                │                                          │
│  ┌────────────────────────────▼─────────────────────────────────────┐   │
│  │                      API GATEWAY                                  │   │
│  │                [Node.js/Express - Port 3000]                      │   │
│  │                                                                    │   │
│  │  • Request Routing          • Rate Limiting                       │   │
│  │  • Load Balancing           • Error Handling                      │   │
│  │  • Serves Static Files      • Logging                             │   │
│  └──┬────────┬────────┬────────┬────────┬────────────────────────────┘   │
│     │        │        │        │        │                                │
│     │        │        │        │        │                                │
│     │        │        │        │        │                                │
│  ┌──▼──┐  ┌─▼──┐  ┌──▼──┐  ┌──▼──┐  ┌─▼──┐                            │
│  │Auth │  │Video│  │Stream│ │Bill │  │Analy│                            │
│  │Svc  │  │Svc  │  │Svc   │ │Svc  │  │Svc  │                            │
│  └──┬──┘  └─┬──┘  └──┬───┘ └──┬──┘  └─┬──┘                            │
│     │        │        │        │        │                                │
│  ┌──▼─────────────────────────────────────────────────────────────┐    │
│  │                    MICROSERVICES LAYER                          │    │
│  │                                                                  │    │
│  │  ┌──────────────────┐  ┌──────────────────┐                    │    │
│  │  │  Auth Service    │  │  Video Service   │                    │    │
│  │  │  [Port 3001]     │  │  [Port 3002]     │                    │    │
│  │  │                  │  │                  │                    │    │
│  │  │ • User Mgmt      │  │ • Video Catalog  │                    │    │
│  │  │ • JWT Auth       │  │ • File Upload    │                    │    │
│  │  │ • Profile Mgmt   │  │ • Metadata Mgmt  │                    │    │
│  │  └────────┬─────────┘  └────────┬─────────┘                    │    │
│  │           │                      │                               │    │
│  │           ▼                      ▼                               │    │
│  │  ┌─────────────────┐   ┌─────────────────┐                    │    │
│  │  │   PostgreSQL    │   │   PostgreSQL    │                    │    │
│  │  │   streamify_    │   │   streamify_    │                    │    │
│  │  │     auth        │   │     video       │                    │    │
│  │  └─────────────────┘   └─────────────────┘                    │    │
│  │                                                                  │    │
│  │  ┌──────────────────┐  ┌──────────────────┐                    │    │
│  │  │ Streaming Service│  │  Billing Service │                    │    │
│  │  │  [Port 3003]     │  │  [Port 3004]     │                    │    │
│  │  │                  │  │                  │                    │    │
│  │  │ • Session Mgmt   │  │ • Balance Mgmt   │                    │    │
│  │  │ • Video Delivery │  │ • Transactions   │                    │    │
│  │  │ • Heartbeat      │  │ • Charging       │                    │    │
│  │  └────────┬─────────┘  └────────┬─────────┘                    │    │
│  │           │                      │                               │    │
│  │           ▼                      ▼                               │    │
│  │  ┌─────────────────┐   ┌─────────────────┐                    │    │
│  │  │   PostgreSQL    │   │   PostgreSQL    │                    │    │
│  │  │   streamify_    │   │   streamify_    │                    │    │
│  │  │   streaming     │   │    billing      │                    │    │
│  │  └─────────────────┘   └─────────────────┘                    │    │
│  │                                                                  │    │
│  │  ┌──────────────────────────────────────┐                      │    │
│  │  │      Analytics Service               │                      │    │
│  │  │        [Port 3005]                   │                      │    │
│  │  │                                      │                      │    │
│  │  │ • Data Aggregation                   │                      │    │
│  │  │ • Reporting                          │                      │    │
│  │  │ • Metrics Collection                 │                      │    │
│  │  └────────┬─────────────────────────────┘                      │    │
│  │           │                                                      │    │
│  │           ▼                                                      │    │
│  │  ┌─────────────────────────────────────┐                      │    │
│  │  │         PostgreSQL                  │                      │    │
│  │  │       streamify_analytics           │                      │    │
│  │  └─────────────────────────────────────┘                      │    │
│  │                                                                  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                   SHARED STORAGE                                  │   │
│  │              Docker Volume: video-uploads                         │   │
│  │         (Shared between Video & Streaming Services)               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Container Details

#### Frontend Container
- **Technology**: HTML, CSS, Vanilla JavaScript
- **Purpose**: User interface for all platform features
- **Communication**: REST API calls to API Gateway

#### API Gateway Container
- **Technology**: Node.js, Express.js, http-proxy-middleware
- **Port**: 3000
- **Purpose**: Single entry point, request routing, rate limiting
- **Features**: Load balancing, error handling, static file serving

#### Microservices Containers

1. **Auth Service**
   - Port: 3001
   - Database: PostgreSQL (streamify_auth)
   - Responsibilities: Authentication, JWT management, user profiles

2. **Video Service**
   - Port: 3002
   - Database: PostgreSQL (streamify_video)
   - Responsibilities: Video catalog, file uploads, metadata management

3. **Streaming Service**
   - Port: 3003
   - Database: PostgreSQL (streamify_streaming)
   - Responsibilities: Session management, video delivery, heartbeat tracking

4. **Billing Service**
   - Port: 3004
   - Database: PostgreSQL (streamify_billing)
   - Responsibilities: Balance management, transactions, charging

5. **Analytics Service**
   - Port: 3005
   - Database: PostgreSQL (streamify_analytics)
   - Responsibilities: Data aggregation, reporting, metrics collection

#### Database Containers
- **Technology**: PostgreSQL 15 Alpine
- **Count**: 5 independent databases
- **Purpose**: Data persistence for each microservice
- **Pattern**: Database per service

---

## 3. Deployment Diagram

### Overview
The Deployment diagram shows how the containers are deployed onto infrastructure, including runtime environments and networking.

```
┌──────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT ENVIRONMENT                         │
│                         (Docker Host Machine)                         │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   Docker Network: streamify-network          │    │
│  │                        (Bridge Network)                       │    │
│  │                                                               │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │           FRONTEND & API GATEWAY LAYER               │    │    │
│  │  │                                                       │    │    │
│  │  │  ┌─────────────────────────────────────────┐        │    │    │
│  │  │  │  api-gateway Container                  │        │    │    │
│  │  │  │  Image: streamify-api-gateway:latest    │        │    │    │
│  │  │  │  Port Mapping: 3000:3000                │        │    │    │
│  │  │  │                                          │        │    │    │
│  │  │  │  • Express.js Application                │        │    │    │
│  │  │  │  • Static Files (public/)                │        │    │    │
│  │  │  │  • Health Check Endpoint                 │        │    │    │
│  │  │  │  • Rate Limiter: 100 req/15min           │        │    │    │
│  │  │  │                                          │        │    │    │
│  │  │  │  Resources:                              │        │    │    │
│  │  │  │  CPU: 0.5 cores                          │        │    │    │
│  │  │  │  Memory: 256MB                           │        │    │    │
│  │  │  └─────────────────────────────────────────┘        │    │    │
│  │  └───────────────────────────────────────────────────┘    │    │
│  │                                                               │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │              MICROSERVICES LAYER                     │    │    │
│  │  │                                                       │    │    │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │    │    │
│  │  │  │ auth-service │  │ video-service│  │ streaming │ │    │    │
│  │  │  │              │  │              │  │  -service  │ │    │    │
│  │  │  │ Port: 3001   │  │ Port: 3002   │  │ Port: 3003│ │    │    │
│  │  │  │ CPU: 0.5     │  │ CPU: 0.5     │  │ CPU: 0.5  │ │    │    │
│  │  │  │ Mem: 256MB   │  │ Mem: 512MB   │  │ Mem: 512MB│ │    │    │
│  │  │  └──────────────┘  └──────────────┘  └───────────┘ │    │    │
│  │  │                                                       │    │    │
│  │  │  ┌──────────────┐  ┌──────────────┐                │    │    │
│  │  │  │billing-service│ │analytics-svc │                │    │    │
│  │  │  │              │  │              │                │    │    │
│  │  │  │ Port: 3004   │  │ Port: 3005   │                │    │    │
│  │  │  │ CPU: 0.5     │  │ CPU: 0.5     │                │    │    │
│  │  │  │ Mem: 256MB   │  │ Mem: 512MB   │                │    │    │
│  │  │  └──────────────┘  └──────────────┘                │    │    │
│  │  └───────────────────────────────────────────────────┘    │    │
│  │                                                               │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │               DATABASE LAYER                         │    │    │
│  │  │                                                       │    │    │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │    │    │
│  │  │  │postgres-auth │  │postgres-video│  │postgres-  │ │    │    │
│  │  │  │              │  │              │  │ streaming │ │    │    │
│  │  │  │ DB: auth     │  │ DB: video    │  │ DB: stream│ │    │    │
│  │  │  │ Port: 5432   │  │ Port: 5432   │  │ Port: 5432│ │    │    │
│  │  │  │ CPU: 0.25    │  │ CPU: 0.25    │  │ CPU: 0.25 │ │    │    │
│  │  │  │ Mem: 256MB   │  │ Mem: 256MB   │  │ Mem: 256MB│ │    │    │
│  │  │  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │    │    │
│  │  │         │                  │                 │       │    │    │
│  │  │         ▼                  ▼                 ▼       │    │    │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │    │    │
│  │  │  │Volume:       │  │Volume:       │  │Volume:    │ │    │    │
│  │  │  │auth-data     │  │video-data    │  │stream-data│ │    │    │
│  │  │  └──────────────┘  └──────────────┘  └───────────┘ │    │    │
│  │  │                                                       │    │    │
│  │  │  ┌──────────────┐  ┌──────────────┐                │    │    │
│  │  │  │postgres-     │  │postgres-     │                │    │    │
│  │  │  │  billing     │  │  analytics   │                │    │    │
│  │  │  │ DB: billing  │  │ DB: analytics│                │    │    │
│  │  │  │ Port: 5432   │  │ Port: 5432   │                │    │    │
│  │  │  │ CPU: 0.25    │  │ CPU: 0.25    │                │    │    │
│  │  │  │ Mem: 256MB   │  │ Mem: 512MB   │                │    │    │
│  │  │  └──────┬───────┘  └──────┬───────┘                │    │    │
│  │  │         │                  │                         │    │    │
│  │  │         ▼                  ▼                         │    │    │
│  │  │  ┌──────────────┐  ┌──────────────┐                │    │    │
│  │  │  │Volume:       │  │Volume:       │                │    │    │
│  │  │  │billing-data  │  │analytics-data│                │    │    │
│  │  │  └──────────────┘  └──────────────┘                │    │    │
│  │  └───────────────────────────────────────────────────┘    │    │
│  │                                                               │    │
│  │  ┌─────────────────────────────────────────────────────┐    │    │
│  │  │             SHARED STORAGE LAYER                     │    │    │
│  │  │                                                       │    │    │
│  │  │  ┌───────────────────────────────────────────────┐  │    │    │
│  │  │  │  Docker Volume: video-uploads                 │  │    │    │
│  │  │  │  Mounted in: video-service, streaming-service │  │    │    │
│  │  │  │  Path: /app/uploads/videos                    │  │    │    │
│  │  │  └───────────────────────────────────────────────┘  │    │    │
│  │  └───────────────────────────────────────────────────┘    │    │
│  │                                                               │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 EXTERNAL ACCESS                              │    │
│  │                                                               │    │
│  │  Internet → Port 3000 → API Gateway                          │    │
│  │                                                               │    │
│  │  Health Monitoring:                                           │    │
│  │  • http://localhost:3000/health (API Gateway)                │    │
│  │  • http://localhost:3001/health (Auth Service)               │    │
│  │  • http://localhost:3002/health (Video Service)              │    │
│  │  • http://localhost:3003/health (Streaming Service)          │    │
│  │  • http://localhost:3004/health (Billing Service)            │    │
│  │  • http://localhost:3005/health (Analytics Service)          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Deployment Configuration

#### Docker Compose Setup
```yaml
Services: 11 containers total
├── 1 API Gateway
├── 5 Microservices
└── 5 PostgreSQL Databases

Networks: 1 bridge network (streamify-network)

Volumes: 6 persistent volumes
├── postgres-auth-data
├── postgres-video-data
├── postgres-streaming-data
├── postgres-billing-data
├── postgres-analytics-data
└── video-uploads (shared)
```

#### Resource Allocation

| Component | CPU | Memory | Disk | Replicas |
|-----------|-----|--------|------|----------|
| API Gateway | 0.5 | 256MB | - | 1 |
| Auth Service | 0.5 | 256MB | - | 1 |
| Video Service | 0.5 | 512MB | - | 1 |
| Streaming Service | 0.5 | 512MB | - | 1 |
| Billing Service | 0.5 | 256MB | - | 1 |
| Analytics Service | 0.5 | 512MB | - | 1 |
| PostgreSQL (each) | 0.25 | 256-512MB | 10GB | 5 |

**Total Resources Required:**
- CPU: ~5 cores
- Memory: ~4GB
- Disk: ~50GB (with video storage)

#### Port Mappings

| Service | Internal Port | External Port | Protocol |
|---------|--------------|---------------|----------|
| API Gateway | 3000 | 3000 | HTTP |
| Auth Service | 3001 | 3001 | HTTP |
| Video Service | 3002 | 3002 | HTTP |
| Streaming Service | 3003 | 3003 | HTTP |
| Billing Service | 3004 | 3004 | HTTP |
| Analytics Service | 3005 | 3005 | HTTP |
| PostgreSQL (all) | 5432 | - (internal only) | PostgreSQL |

#### Scaling Strategy

**Horizontal Scaling:**
```bash
# Scale individual services
docker-compose up --scale auth-service=3
docker-compose up --scale video-service=2
docker-compose up --scale streaming-service=3
```

**Vertical Scaling:**
- Increase memory/CPU limits in docker-compose.yml
- Add database read replicas
- Implement Redis caching layer

#### High Availability Setup

**Production Recommendations:**
1. Run API Gateway behind load balancer (nginx/HAProxy)
2. Deploy multiple replicas of each microservice
3. Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
4. Implement database replication
5. Use object storage for videos (S3, Google Cloud Storage)
6. Add Redis for caching and session management
7. Implement service mesh (Istio, Linkerd)
8. Add monitoring (Prometheus, Grafana)
9. Centralized logging (ELK Stack)
10. Automated backups and disaster recovery

---

## Summary

These diagrams provide three levels of architectural detail:

1. **System Context**: Shows Streamify in its environment with users and external systems
2. **Container Diagram**: Details the internal structure with all microservices and databases
3. **Deployment Diagram**: Illustrates how everything runs on Docker infrastructure

The architecture follows microservices best practices:
-  Service isolation
- Database per service
-  API Gateway pattern
-  Container-based deployment
-  Health monitoring
-  Scalability support
-  Clear separation of concerns
