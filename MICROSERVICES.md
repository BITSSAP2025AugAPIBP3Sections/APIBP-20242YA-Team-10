# Streamify Microservices Architecture

## Overview

Streamify has been completely restructured into a true microservices architecture with separate services, each with its own PostgreSQL database. This document provides a comprehensive guide to understanding, deploying, and maintaining the system.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway (3000)                       │
│                    Routes requests to services                   │
└─────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│ Auth Service │         │Video Service │         │Streaming Svc │
│   (3001)     │◄────────┤   (3002)     │◄────────┤   (3003)     │
└──────────────┘         └──────────────┘         └──────────────┘
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  PostgreSQL  │         │  PostgreSQL  │         │  PostgreSQL  │
│     Auth     │         │     Video    │         │   Streaming  │
└──────────────┘         └──────────────┘         └──────────────┘

        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────┐         ┌──────────────┐         
│Billing Svc   │         │Analytics Svc │         
│   (3004)     │◄────────┤   (3005)     │         
└──────────────┘         └──────────────┘         
        │                         │                         
        ▼                         ▼                         
┌──────────────┐         ┌──────────────┐         
│  PostgreSQL  │         │  PostgreSQL  │         
│    Billing   │         │  Analytics   │         
└──────────────┘         └──────────────┘         
```

## Microservices

### 1. Auth Service (Port 3001)
**Responsibility:** User authentication and profile management

**Database:** `streamify_auth`

**Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify` - Token verification
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

**Database Schema:**
```sql
users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### 2. Video Service (Port 3002)
**Responsibility:** Video catalog and file management

**Database:** `streamify_video`

**Endpoints:**
- `GET /api/videos` - List videos with filtering/pagination
- `POST /api/videos` - Upload new video
- `GET /api/videos/:id` - Get video details
- `PUT /api/videos/:id` - Update video metadata
- `DELETE /api/videos/:id` - Delete video

**Database Schema:**
```sql
videos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  duration INTEGER,
  price_per_minute INTEGER,
  filename VARCHAR(255) NOT NULL,
  uploaded_by INTEGER NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### 3. Streaming Service (Port 3003)
**Responsibility:** Video streaming sessions and playback

**Database:** `streamify_streaming`

**Endpoints:**
- `POST /api/stream/start/:videoId` - Start streaming session
- `GET /api/stream/url/:sessionId` - Get video stream URL
- `PUT /api/stream/heartbeat/:sessionId` - Update watch progress
- `POST /api/stream/end/:sessionId` - End streaming session

**Database Schema:**
```sql
stream_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  video_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  start_time TIMESTAMP,
  watched_time INTEGER,
  is_active BOOLEAN,
  last_heartbeat TIMESTAMP,
  created_at TIMESTAMP
)
```

### 4. Billing Service (Port 3004)
**Responsibility:** Payment processing and account management

**Database:** `streamify_billing`

**Endpoints:**
- `POST /api/billing/account/create` - Create billing account
- `GET /api/billing/balance` - Get user balance
- `POST /api/billing/deposit` - Deposit funds
- `POST /api/billing/charge` - Charge user (internal)
- `GET /api/billing/transactions` - Get transaction history
- `GET /api/billing/revenue/total` - Get total revenue

**Database Schema:**
```sql
billing_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  balance INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type VARCHAR(50),
  description TEXT,
  session_id VARCHAR(255),
  created_at TIMESTAMP
)
```

### 5. Analytics Service (Port 3005)
**Responsibility:** Data analytics and reporting

**Database:** `streamify_analytics`

**Endpoints:**
- `POST /api/analytics/track` - Track viewing activity (internal)
- `GET /api/analytics/dashboard` - Platform-wide metrics
- `GET /api/analytics/videos/:id` - Video-specific analytics
- `GET /api/analytics/user` - User activity history
- `GET /api/analytics/top-videos` - Most popular videos
- `GET /api/analytics/revenue` - Revenue reports
- `GET /api/analytics/reports/:period` - Period-based reports

**Database Schema:**
```sql
video_analytics (
  id SERIAL PRIMARY KEY,
  video_id INTEGER NOT NULL,
  total_views INTEGER,
  total_watch_time INTEGER,
  total_revenue INTEGER,
  completion_rate DECIMAL(5,2),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

user_activities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  video_id INTEGER NOT NULL,
  watch_time INTEGER,
  revenue INTEGER,
  session_id VARCHAR(255),
  created_at TIMESTAMP
)

platform_metrics (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  total_views INTEGER,
  total_users INTEGER,
  total_revenue INTEGER,
  total_watch_time INTEGER,
  created_at TIMESTAMP
)
```

### 6. API Gateway (Port 3000)
**Responsibility:** Request routing, rate limiting, and serving frontend

**Features:**
- Routes all `/api/*` requests to appropriate microservices
- Implements rate limiting (100 requests per 15 minutes by default)
- Serves static frontend files
- Provides centralized error handling
- Single entry point for all client requests

## Deployment

### Using Docker Compose (Recommended)

1. **Build and start all services:**
```bash
docker-compose up --build -d
```

2. **View logs:**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service
```

3. **Stop all services:**
```bash
docker-compose down
```

4. **Stop and remove volumes (clean slate):**
```bash
docker-compose down -v
```

### Manual Deployment

Each service can be deployed independently:

```bash
# Auth Service
cd services/auth-service
npm install
cp .env.example .env
# Edit .env with your configuration
npm start

# Repeat for each service
```

## Environment Variables

### Auth Service
```env
PORT=3001
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://user:pass@host:5432/streamify_auth
NODE_ENV=production
```

### Video Service
```env
PORT=3002
DATABASE_URL=postgresql://user:pass@host:5432/streamify_video
AUTH_SERVICE_URL=http://auth-service:3001
NODE_ENV=production
```

### Streaming Service
```env
PORT=3003
DATABASE_URL=postgresql://user:pass@host:5432/streamify_streaming
AUTH_SERVICE_URL=http://auth-service:3001
VIDEO_SERVICE_URL=http://video-service:3002
BILLING_SERVICE_URL=http://billing-service:3004
ANALYTICS_SERVICE_URL=http://analytics-service:3005
NODE_ENV=production
```

### Billing Service
```env
PORT=3004
DATABASE_URL=postgresql://user:pass@host:5432/streamify_billing
AUTH_SERVICE_URL=http://auth-service:3001
NODE_ENV=production
```

### Analytics Service
```env
PORT=3005
DATABASE_URL=postgresql://user:pass@host:5432/streamify_analytics
AUTH_SERVICE_URL=http://auth-service:3001
VIDEO_SERVICE_URL=http://video-service:3002
BILLING_SERVICE_URL=http://billing-service:3004
NODE_ENV=production
```

### API Gateway
```env
PORT=3000
AUTH_SERVICE_URL=http://auth-service:3001
VIDEO_SERVICE_URL=http://video-service:3002
STREAMING_SERVICE_URL=http://streaming-service:3003
BILLING_SERVICE_URL=http://billing-service:3004
ANALYTICS_SERVICE_URL=http://analytics-service:3005
NODE_ENV=production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Service Communication

Services communicate with each other using HTTP REST APIs:

1. **Authentication Flow:**
   - Client → API Gateway → Auth Service
   - Auth Service returns JWT token
   - Other services verify token with Auth Service

2. **Video Upload Flow:**
   - Client → API Gateway → Video Service
   - Video Service verifies auth with Auth Service
   - Video file stored in shared volume

3. **Streaming Flow:**
   - Client → API Gateway → Streaming Service
   - Streaming Service checks balance with Billing Service
   - Streaming Service creates session
   - During playback, heartbeats update Billing & Analytics

4. **Analytics Flow:**
   - Streaming Service → Analytics Service (track views)
   - Billing Service → Analytics Service (track revenue)
   - Analytics aggregates data across services

## Database Management

Each service has its own PostgreSQL database, ensuring:
- **Data Isolation:** Services cannot directly access other services' data
- **Independent Scaling:** Databases can be scaled independently
- **Schema Evolution:** Each service can modify its schema without affecting others

### Database Initialization

Databases are automatically initialized on first run using the schema defined in each service's `db.js` file.

### Backup Strategy

```bash
# Backup all databases
docker exec streamify-postgres-auth pg_dump -U streamify_user streamify_auth > backup_auth.sql
docker exec streamify-postgres-video pg_dump -U streamify_user streamify_video > backup_video.sql
docker exec streamify-postgres-streaming pg_dump -U streamify_user streamify_streaming > backup_streaming.sql
docker exec streamify-postgres-billing pg_dump -U streamify_user streamify_billing > backup_billing.sql
docker exec streamify-postgres-analytics pg_dump -U streamify_user streamify_analytics > backup_analytics.sql
```

## Monitoring & Health Checks

Each service exposes a `/health` endpoint:

```bash
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Video Service
curl http://localhost:3003/health  # Streaming Service
curl http://localhost:3004/health  # Billing Service
curl http://localhost:3005/health  # Analytics Service
curl http://localhost:3000/health  # API Gateway
```

## Scaling Strategies

### Horizontal Scaling
Each service can be scaled independently:

```bash
docker-compose up --scale auth-service=3 --scale video-service=2
```

### Load Balancing
Use a reverse proxy (nginx, HAProxy) in front of the API Gateway for production deployments.

### Database Optimization
- Add read replicas for read-heavy services (Analytics, Video)
- Implement caching layer (Redis) for frequently accessed data
- Use connection pooling (already implemented with pg.Pool)

## Security Considerations

1. **JWT Tokens:** Change JWT_SECRET in production
2. **Database Passwords:** Use strong passwords in production
3. **Rate Limiting:** API Gateway implements rate limiting
4. **CORS:** Configured for all services
5. **Input Validation:** Implemented at service level
6. **SQL Injection:** Using parameterized queries
7. **File Upload:** Validated file types and sizes

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs service-name

# Check database connection
docker-compose exec postgres-auth psql -U streamify_user -d streamify_auth
```

### Database Connection Issues
```bash
# Verify database is running
docker-compose ps

# Check network connectivity
docker-compose exec auth-service ping postgres-auth
```

### Inter-Service Communication Issues
```bash
# Check service discovery
docker-compose exec auth-service nslookup video-service

# Test service endpoint
docker-compose exec auth-service curl http://video-service:3002/health
```

## Development Workflow

1. **Local Development:**
```bash
# Start databases only
docker-compose up postgres-auth postgres-video postgres-streaming postgres-billing postgres-analytics

# Run services locally
cd services/auth-service && npm run dev
```

2. **Testing Individual Services:**
```bash
# Build specific service
docker-compose build auth-service

# Run specific service
docker-compose up auth-service
```

## Migration from Monolithic Architecture

The original `server.js` has been split into 6 independent microservices. Key changes:

1. **Data Storage:** Migrated from in-memory to PostgreSQL
2. **Service Isolation:** Each service runs independently
3. **API Gateway:** Centralized entry point for all requests
4. **Shared Storage:** Video files stored in shared volume
5. **Service Discovery:** Docker network enables service-to-service communication

## Future Enhancements

1. **Message Queue:** Implement RabbitMQ/Kafka for async communication
2. **Service Mesh:** Consider Istio for advanced traffic management
3. **Monitoring:** Add Prometheus + Grafana for metrics
4. **Logging:** Centralized logging with ELK stack
5. **CI/CD:** Automated testing and deployment pipeline
6. **API Documentation:** OpenAPI/Swagger for each service
7. **Authentication:** OAuth2/OpenID Connect integration
8. **Caching:** Redis for performance optimization

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review health endpoints
- Consult service-specific README files
- Contact team members listed in README.md
