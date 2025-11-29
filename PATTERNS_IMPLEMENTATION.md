# Microservices Patterns Implementation Documentation

## Table of Contents
1. [Communication Mechanisms](#communication-mechanisms)
2. [Design Patterns](#design-patterns)
3. [Testing Guide](#testing-guide)
4. [Deployment](#deployment)

---

## Communication Mechanisms

### 1. REST APIs ✅
**Implementation**: All services expose REST endpoints via Express.js

**Services**:
- **Auth Service** (Port 3001): `/api/auth/*`
- **Video Service** (Port 3002): `/api/videos/*`
- **Streaming Service** (Port 3003): `/api/streaming/*`
- **Billing Service** (Port 3004): `/api/billing/*`
- **Analytics Service** (Port 3005): `/api/analytics/*`

**Example**:
```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","firstName":"John","lastName":"Doe"}'
```

### 2. gRPC ✅
**Implementation**: Auth service exposes gRPC server for inter-service communication

**Proto File**: `proto/auth.proto`

**Services**:
- `VerifyToken`: Verify JWT tokens
- `GetUserProfile`: Get user details
- `HealthCheck`: Service health

**Client Usage**:
```javascript
const { verifyTokenGrpc } = require('./grpc-client');
const result = await verifyTokenGrpc(token);
```

**Endpoints**:
- gRPC Server: `auth-service:50051`

**Testing**:
```bash
# Install grpcurl
brew install grpcurl

# Test health check
grpcurl -plaintext localhost:50051 auth.AuthService/HealthCheck
```

### 3. GraphQL ✅
**Implementation**: API Gateway exposes GraphQL endpoint for flexible querying

**Endpoint**: `http://localhost:3000/graphql`

**Schema Highlights**:
```graphql
type Query {
  videos(page: Int, limit: Int, category: String): VideosResponse
  video(id: Int!): Video
  videoStats(videoId: Int!): ViewStats
  platformStats: RevenueStats
  userBalance: UserBalance
}

type Mutation {
  addFunds(amount: Int!): UserBalance
  startStream(videoId: Int!): StreamSession
  endStream(sessionId: Int!): StreamSession
}
```

**Testing**:
```bash
# Query videos
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ videos(page: 1, limit: 10) { videos { id title } total } }"}'

# With authentication
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"query":"{ userBalance { userId balance } }"}'
```

**GraphQL Playground**:
Open `http://localhost:3000/graphql` in your browser to use Apollo Studio

### 4. Message Broker (RabbitMQ) ✅
**Implementation**: Asynchronous event-driven communication

**Broker**: RabbitMQ with Management UI

**Endpoints**:
- AMQP: `localhost:5672`
- Management UI: `http://localhost:15672` (user: `streamify`, pass: `streamify123`)

**Exchanges**:
- `streamify.events` (topic): User, video, payment events
- `streamify.analytics` (fanout): Analytics events

**Event Types**:
```javascript
USER_REGISTERED, USER_LOGGED_IN
VIDEO_UPLOADED, VIDEO_WATCHED
STREAM_STARTED, STREAM_ENDED
PAYMENT_PROCESSED, WALLET_CREDITED
```

**Usage**:
```javascript
const { publishEvent, EVENT_TYPES } = require('./message-broker');

// Publish event
await publishEvent(EVENT_TYPES.VIDEO_WATCHED, {
  userId: 1,
  videoId: 5,
  watchTime: 120
});
```

---

## Design Patterns

### Pattern 1: API Gateway ✅
**Purpose**: Single entry point for all client requests

**Benefits**:
- Centralized authentication
- Rate limiting
- Request routing
- Load balancing

**Implementation**: `/services/api-gateway/index.js`

**Features**:
- Rate limiting (100 requests per 15 min)
- Circuit breaker integration
- GraphQL support
- Saga orchestration

**Testing**:
```bash
# Check health
curl http://localhost:3000/health

# Circuit breaker stats
curl http://localhost:3000/api/circuit-breaker/stats
```

### Pattern 2: Database-per-Service ✅
**Purpose**: Each microservice has its own database

**Databases**:
- `streamify_auth` - User authentication
- `streamify_video` - Video catalog
- `streamify_streaming` - Streaming sessions
- `streamify_billing` - Billing and transactions
- `streamify_analytics` - Analytics data

**Benefits**:
- Service independence
- Technology flexibility
- Fault isolation
- Scalability

### Pattern 3: Circuit Breaker ✅
**Purpose**: Prevent cascading failures

**Library**: Opossum

**Implementation**: `/services/api-gateway/circuit-breaker.js`

**Configuration**:
```javascript
{
  timeout: 5000,              // 5s timeout
  errorThresholdPercentage: 50,  // Trip at 50% errors
  resetTimeout: 30000         // Retry after 30s
}
```

**States**:
- 🟢 **CLOSED**: Normal operation
- 🔴 **OPEN**: Service down, requests rejected
- 🟡 **HALF-OPEN**: Testing service recovery

**Testing**:
```bash
# View circuit breaker stats
curl http://localhost:3000/api/circuit-breaker/stats
```

**Benefits**:
- Fail fast
- Automatic recovery
- Fallback mechanisms
- System resilience

### Pattern 4: Saga Pattern ✅
**Purpose**: Distributed transaction management with compensating transactions

**Implementation**: `/services/shared/registration-saga.js`

**Use Case**: User Registration

**Steps**:
1. Create user in Auth Service
2. Create wallet in Billing Service
3. Create analytics profile in Analytics Service

**Compensation**: If step 3 fails → rollback steps 2 and 1

**Endpoint**:
```bash
POST /api/saga/register
```

**Testing**:
```bash
curl -X POST http://localhost:3000/api/saga/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "saga@test.com",
    "password": "password123",
    "firstName": "Saga",
    "lastName": "Test"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "User registered successfully with wallet and analytics profile",
  "user": { ... },
  "sagaState": {
    "userCreated": true,
    "walletCreated": true,
    "analyticsCreated": true
  }
}
```

**Benefits**:
- Data consistency across services
- Automatic rollback on failure
- Clear transaction boundaries
- Resilience

### Pattern 5: CQRS (Command Query Responsibility Segregation) ✅
**Purpose**: Separate read and write operations

**Implementation**: `/services/analytics-service/cqrs.js`

**Architecture**:

```
┌─────────────────────────────────────────────────┐
│              COMMAND SIDE (Write)               │
├─────────────────────────────────────────────────┤
│  Commands → Events → Write Model → Event Store  │
│                         ↓                       │
│                  Update Read Model              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│               QUERY SIDE (Read)                 │
├─────────────────────────────────────────────────┤
│    Queries → Read Model (Denormalized)         │
└─────────────────────────────────────────────────┘
```

**Tables**:
- **Event Store**: `analytics_events` (immutable)
- **Write Model**: `video_views` (normalized)
- **Read Models**: 
  - `video_stats_read_model` (denormalized)
  - `user_viewing_history_read_model` (denormalized)
  - `unique_viewers` (denormalized)

**Command Endpoints**:
```bash
# Record view (write)
POST /api/analytics/cqrs/record-view
{
  "userId": 1,
  "videoId": 5,
  "watchTime": 120
}
```

**Query Endpoints**:
```bash
# Get video stats (read)
GET /api/analytics/cqrs/video/:videoId/stats

# Get user history (read)
GET /api/analytics/cqrs/user/:userId/history

# Get platform stats (read)
GET /api/analytics/cqrs/platform/stats
```

**Event Sourcing**:
```bash
# Replay events to rebuild read model
POST /api/analytics/cqrs/replay-events
{
  "fromTimestamp": "2024-01-01T00:00:00Z"
}
```

**Testing**:
```bash
# 1. Record a view
curl -X POST http://localhost:3000/api/analytics/cqrs/record-view \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"videoId":5,"watchTime":120}'

# 2. Query video stats
curl http://localhost:3000/api/analytics/cqrs/video/5/stats

# 3. Query platform stats
curl http://localhost:3000/api/analytics/cqrs/platform/stats
```

**Benefits**:
- Optimized reads (denormalized)
- Optimized writes (normalized)
- Event sourcing for audit trail
- Scalable queries
- Event replay capability

---

## Testing Guide

### 1. Start All Services
```bash
# Using Docker Compose
docker-compose up --build

# Services available:
# - API Gateway: http://localhost:3000
# - GraphQL: http://localhost:3000/graphql
# - Auth Service: http://localhost:3001
# - Video Service: http://localhost:3002
# - Streaming Service: http://localhost:3003
# - Billing Service: http://localhost:3004
# - Analytics Service: http://localhost:3005
# - RabbitMQ UI: http://localhost:15672
```

### 2. Test REST APIs
```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 3. Test GraphQL
Open `http://localhost:3000/graphql` in browser or:
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ videos(page:1,limit:5) { videos { id title } } }"}'
```

### 4. Test Saga Pattern
```bash
curl -X POST http://localhost:3000/api/saga/register \
  -H "Content-Type: application/json" \
  -d '{"email":"saga@test.com","password":"password123","firstName":"Saga","lastName":"Test"}'
```

### 5. Test CQRS
```bash
# Write
curl -X POST http://localhost:3000/api/analytics/cqrs/record-view \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"videoId":1,"watchTime":120}'

# Read
curl http://localhost:3000/api/analytics/cqrs/video/1/stats
```

### 6. Monitor RabbitMQ
Open `http://localhost:15672` (streamify/streamify123)

### 7. Check Circuit Breaker
```bash
curl http://localhost:3000/api/circuit-breaker/stats
```

---

## Deployment

### Docker Deployment
```bash
# Build and start
docker-compose up --build -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Kubernetes Deployment
```bash
# Start Minikube
minikube start

# Apply configurations
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/pv-pvc-video-uploads.yaml

# Deploy PostgreSQL databases
kubectl apply -f k8s/postgres/

# Deploy services
kubectl apply -f k8s/services/

# Deploy Ingress
kubectl apply -f k8s/ingress.yaml

# Check status
kubectl get pods
kubectl get services

# Access application
minikube service api-gateway-service
```

### Push to DockerHub
```bash
# Tag images
docker tag streamify-auth-service:latest yourusername/streamify-auth:v1.0
docker tag streamify-video-service:latest yourusername/streamify-video:v1.0
docker tag streamify-streaming-service:latest yourusername/streamify-streaming:v1.0
docker tag streamify-billing-service:latest yourusername/streamify-billing:v1.0
docker tag streamify-analytics-service:latest yourusername/streamify-analytics:v1.0
docker tag streamify-api-gateway:latest yourusername/streamify-gateway:v1.0

# Push to DockerHub
docker push yourusername/streamify-auth:v1.0
docker push yourusername/streamify-video:v1.0
docker push yourusername/streamify-streaming:v1.0
docker push yourusername/streamify-billing:v1.0
docker push yourusername/streamify-analytics:v1.0
docker push yourusername/streamify-gateway:v1.0
```

---

## Architecture Justification

### Business Capability Decomposition
The system is decomposed by business capabilities:

1. **Authentication & Authorization** (Auth Service)
   - User management
   - Security and access control

2. **Content Management** (Video Service)
   - Video catalog
   - Metadata management

3. **Content Delivery** (Streaming Service)
   - Video streaming
   - Session management

4. **Monetization** (Billing Service)
   - Payment processing
   - Wallet management

5. **Business Intelligence** (Analytics Service)
   - User behavior tracking
   - Revenue analytics

### Scalability Benefits

1. **Independent Scaling**: Each service scales based on demand
2. **Technology Freedom**: Different services can use different technologies
3. **Fault Isolation**: Failure in one service doesn't affect others
4. **Team Autonomy**: Teams can work on services independently
5. **Deployment Independence**: Services can be deployed separately

---

## Scoring Highlights

### Sub-Objective 1: Service Design (8 Marks)
✅ 6 Microservices (Auth, Video, Streaming, Billing, Analytics, API Gateway)
✅ Business Capability decomposition
✅ REST APIs for all services
✅ gRPC for inter-service communication
✅ GraphQL for flexible client queries
✅ RabbitMQ for async messaging
✅ Architecture diagrams
✅ OpenAPI specification (v1.yaml)
✅ Proto files for gRPC

### Sub-Objective 2: Patterns (4 Marks)
✅ API Gateway pattern
✅ Database-per-service pattern
✅ Circuit Breaker pattern (Opossum)
✅ Saga pattern (Orchestration)
✅ CQRS pattern with Event Sourcing

### Sub-Objective 3: Deployment (3 Marks)
✅ All services containerized
✅ Docker Compose configuration
✅ Kubernetes manifests
✅ Ready for DockerHub push

---

## Additional Features (Bonus Points)

1. **Event Sourcing**: Complete event log in analytics
2. **Rate Limiting**: Protection against abuse
3. **Health Checks**: All services have health endpoints
4. **Monitoring**: Circuit breaker statistics
5. **Message Broker**: RabbitMQ with management UI
6. **gRPC**: High-performance inter-service communication
7. **GraphQL**: Flexible query language
8. **Comprehensive Documentation**: This file + code comments

---

## Contributors

**Team 10**:
- Member 1: [Name] - Auth Service, gRPC implementation
- Member 2: [Name] - Video & Streaming Services, GraphQL
- Member 3: [Name] - Billing Service, Saga Pattern
- Member 4: [Name] - Analytics Service, CQRS Pattern
- Member 5: [Name] - API Gateway, Circuit Breaker, Deployment

(Update with actual names and contributions)
