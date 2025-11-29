# Streamify - Complete Microservices Implementation
## Project Submission Document

**Course**: Microservices Architecture  
**Team**: Team 10  
**Date**: November 29, 2024  
**Institution**: BITS Pilani

---

## Executive Summary

Streamify is a **production-ready video streaming platform** built using modern microservices architecture. The system demonstrates:

- ✅ **6 Independent Microservices** with clear business boundaries
- ✅ **4 Communication Mechanisms** (REST, gRPC, GraphQL, Message Broker)
- ✅ **5+ Design Patterns** for scalability and resilience
- ✅ **Complete Containerization** and Kubernetes deployment
- ✅ **Comprehensive Testing** and documentation

---

## Sub-Objective 1: Service Design & Implementation (8 Marks)

### 1.1 Problem Domain: Video Streaming Platform

**Problem Statement**: Traditional monolithic video platforms face challenges in:
- Scaling individual components independently
- Handling failures gracefully
- Supporting rapid feature development
- Managing different resource requirements

**Solution**: Microservices-based video streaming platform with decoupled services.

### 1.2 Microservices Architecture

We implemented **6 microservices**, each with distinct responsibilities:

#### Service Inventory

| # | Service | Port | Responsibility | Technology Stack |
|---|---------|------|----------------|------------------|
| 1 | **Auth Service** | 3001, 50051 | User authentication, JWT tokens, gRPC server | Node.js, PostgreSQL, gRPC |
| 2 | **Video Service** | 3002 | Video catalog, metadata, file uploads | Node.js, PostgreSQL, Multer |
| 3 | **Streaming Service** | 3003 | Video playback, session management | Node.js, PostgreSQL |
| 4 | **Billing Service** | 3004 | Wallet management, transactions | Node.js, PostgreSQL |
| 5 | **Analytics Service** | 3005 | CQRS, event sourcing, analytics | Node.js, PostgreSQL |
| 6 | **API Gateway** | 3000 | Request routing, GraphQL, circuit breaker | Node.js, GraphQL, Opossum |

### 1.3 Communication Mechanisms ✅ (Complete)

#### ✅ 1. REST APIs
- **Implementation**: All services expose RESTful endpoints
- **Use Case**: Client-to-gateway, gateway-to-service communication
- **Example**:
  ```bash
  POST /api/auth/register
  POST /api/auth/login
  GET /api/videos
  POST /api/streaming/start
  ```

#### ✅ 2. gRPC
- **Implementation**: Auth service exposes gRPC server (port 50051)
- **Proto File**: `proto/auth.proto`
- **Services**: 
  - `VerifyToken`: Validate JWT tokens
  - `GetUserProfile`: Fetch user details
  - `HealthCheck`: Service health
- **Use Case**: High-performance inter-service authentication
- **Example**:
  ```protobuf
  service AuthService {
    rpc VerifyToken (VerifyTokenRequest) returns (VerifyTokenResponse);
    rpc GetUserProfile (GetUserProfileRequest) returns (GetUserProfileResponse);
  }
  ```

#### ✅ 3. GraphQL
- **Implementation**: API Gateway exposes GraphQL endpoint
- **Endpoint**: `http://localhost:3000/graphql`
- **Use Case**: Flexible client queries, reducing over-fetching
- **Schema**:
  ```graphql
  type Query {
    videos(page: Int, limit: Int, category: String): VideosResponse
    video(id: Int!): Video
    videoStats(videoId: Int!): ViewStats
    userBalance: UserBalance
  }
  
  type Mutation {
    addFunds(amount: Int!): UserBalance
    startStream(videoId: Int!): StreamSession
  }
  ```

#### ✅ 4. Message Broker (RabbitMQ)
- **Implementation**: RabbitMQ for asynchronous event-driven communication
- **Exchanges**: 
  - `streamify.events` (topic): User, video, payment events
  - `streamify.analytics` (fanout): Analytics events
- **Event Types**:
  - `USER_REGISTERED`, `USER_LOGGED_IN`
  - `VIDEO_UPLOADED`, `VIDEO_WATCHED`
  - `STREAM_STARTED`, `STREAM_ENDED`
  - `PAYMENT_PROCESSED`, `WALLET_CREDITED`
- **Management UI**: http://localhost:15672

### 1.4 Decomposition Strategy: Business Capability ✅

Our decomposition follows **Business Capability** pattern:

1. **Authentication & Security** (Auth Service)
   - User management
   - Access control
   - Token generation/validation

2. **Content Management** (Video Service)
   - Video catalog
   - Metadata management
   - File storage

3. **Content Delivery** (Streaming Service)
   - Video playback
   - Session tracking
   - Quality of Service

4. **Monetization** (Billing Service)
   - Payment processing
   - Wallet management
   - Transaction history

5. **Business Intelligence** (Analytics Service)
   - User behavior tracking
   - Revenue analytics
   - Platform insights

**Justification**: Each service aligns with a distinct business function, enabling:
- Independent team ownership
- Separate scaling based on load
- Technology flexibility per service
- Clear business-to-code mapping

### 1.5 API Schemas ✅

#### OpenAPI Specification
- **File**: `v1.yaml`
- **Contains**: All REST endpoints with request/response schemas
- **Tools**: Redocly for documentation

#### gRPC Proto Files
- **File**: `proto/auth.proto`, `proto/video.proto`
- **Contains**: Service definitions, message types, RPC methods

#### GraphQL Schema
- **File**: `services/api-gateway/graphql.js`
- **Contains**: Type definitions, queries, mutations, resolvers

### 1.6 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (3000)                       │
│  REST │ GraphQL │ Circuit Breaker │ Rate Limiting           │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Auth Service │◄───┤Video Service │◄───┤Streaming Svc │
│  REST+gRPC   │    │     REST     │    │     REST     │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       ▼                   ▼                   ▼
 PostgreSQL           PostgreSQL          PostgreSQL

        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│Billing Svc   │◄───┤Analytics Svc │◄───┤  RabbitMQ    │
│     REST     │    │ REST + CQRS  │    │   Message    │
└──────┬───────┘    └──────┬───────┘    │    Broker    │
       │                   │             └──────────────┘
       ▼                   ▼
 PostgreSQL           PostgreSQL
```

---

## Sub-Objective 2: Patterns & Reliability (4 Marks)

### Pattern 1: API Gateway ✅

**Implementation**: Central entry point for all client requests

**Features**:
- Request routing to appropriate microservices
- Authentication and authorization
- Rate limiting (100 req/15 min)
- Circuit breaker integration
- GraphQL endpoint
- Saga orchestration

**Benefits**:
- **Single entry point**: Simplified client interaction
- **Cross-cutting concerns**: Centralized auth, logging, monitoring
- **Protocol translation**: REST to gRPC/Message Broker
- **Load balancing**: Distribute requests across service instances

**Code**: `services/api-gateway/index.js`

### Pattern 2: Database-per-Service ✅

**Implementation**: Each microservice has its own PostgreSQL database

**Databases**:
1. `streamify_auth` - Users, credentials
2. `streamify_video` - Videos, metadata
3. `streamify_streaming` - Sessions, playback
4. `streamify_billing` - Wallets, transactions
5. `streamify_analytics` - Events, statistics

**Benefits**:
- **Service independence**: No shared database bottleneck
- **Technology flexibility**: Each service can use optimal DB
- **Fault isolation**: DB failure affects only one service
- **Scalability**: Independent DB scaling per service

### Pattern 3: Circuit Breaker ✅

**Implementation**: Opossum library in API Gateway

**Configuration**:
```javascript
{
  timeout: 5000,                    // 5s timeout
  errorThresholdPercentage: 50,    // Trip at 50% errors
  resetTimeout: 30000               // Retry after 30s
}
```

**States**:
- 🟢 **CLOSED**: Normal operation, requests flow through
- 🔴 **OPEN**: Service down, requests rejected immediately
- 🟡 **HALF-OPEN**: Testing if service recovered

**Benefits**:
- **Fail fast**: Don't wait for timeouts
- **Automatic recovery**: Self-healing system
- **Fallback mechanisms**: Graceful degradation
- **System resilience**: Prevent cascading failures

**Endpoint**: `GET /api/circuit-breaker/stats`

**Code**: `services/api-gateway/circuit-breaker.js`

### Pattern 4: Saga Pattern (Orchestration) ✅

**Implementation**: Distributed transaction for user registration

**Use Case**: Register user across multiple services

**Steps**:
1. **Create User** in Auth Service
2. **Create Wallet** in Billing Service
3. **Create Analytics Profile** in Analytics Service

**Compensation**: If any step fails, rollback previous steps

**Flow**:
```
SUCCESS: Step 1 → Step 2 → Step 3 → COMPLETE

FAILURE: Step 1 → Step 2 → Step 3 [FAIL]
         ↓
         Compensate Step 2 (Delete Wallet)
         ↓
         Compensate Step 1 (Delete User)
         ↓
         ROLLBACK COMPLETE
```

**Benefits**:
- **Data consistency**: Across distributed services
- **Automatic rollback**: No manual intervention
- **Clear boundaries**: Transaction scope well-defined
- **Resilience**: System remains consistent on failure

**Endpoint**: `POST /api/saga/register`

**Code**: `services/shared/registration-saga.js`

**Testing**:
```bash
curl -X POST http://localhost:3000/api/saga/register \
  -d '{"email":"test@example.com","password":"pass123",...}'
```

### Pattern 5: CQRS (Command Query Responsibility Segregation) ✅

**Implementation**: Analytics Service with Event Sourcing

**Architecture**:

#### Command Side (Write)
- **Normalized Storage**: `video_views` table
- **Event Store**: `analytics_events` table (immutable)
- **Process**: Command → Event → Write Model → Event Store → Update Read Model

#### Query Side (Read)
- **Denormalized Storage**: 
  - `video_stats_read_model`
  - `user_viewing_history_read_model`
  - `unique_viewers`
- **Process**: Query → Read Model (optimized for fast reads)

**Benefits**:
- **Optimized reads**: Denormalized data for fast queries
- **Optimized writes**: Normalized data for consistency
- **Event sourcing**: Complete audit trail
- **Scalability**: Read and write sides scale independently
- **Event replay**: Rebuild read models from events

**Endpoints**:

Command (Write):
```bash
POST /api/analytics/cqrs/record-view
{
  "userId": 1,
  "videoId": 5,
  "watchTime": 120
}
```

Query (Read):
```bash
GET /api/analytics/cqrs/video/:videoId/stats
GET /api/analytics/cqrs/user/:userId/history
GET /api/analytics/cqrs/platform/stats
```

Event Replay:
```bash
POST /api/analytics/cqrs/replay-events
```

**Code**: `services/analytics-service/cqrs.js`

---

## Sub-Objective 3: Deployment (3 Marks)

### 3.1 Containerization ✅

All services containerized with Dockerfile:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

**Services**:
- ✅ auth-service
- ✅ video-service
- ✅ streaming-service
- ✅ billing-service
- ✅ analytics-service
- ✅ api-gateway

**Supporting Services**:
- PostgreSQL (5 instances)
- RabbitMQ

### 3.2 Docker Compose ✅

**File**: `docker-compose.yml`

**Features**:
- 6 microservices
- 5 PostgreSQL databases
- 1 RabbitMQ message broker
- Health checks
- Volume persistence
- Network isolation

**Commands**:
```bash
docker-compose up --build -d   # Start all services
docker-compose ps              # Check status
docker-compose logs -f         # View logs
docker-compose down            # Stop all
```

### 3.3 Kubernetes Deployment ✅

**Manifests Location**: `k8s/`

**Resources**:
- ✅ **Deployments**: All 6 microservices + 5 PostgreSQL instances
- ✅ **Services**: ClusterIP and NodePort services
- ✅ **ConfigMaps**: Environment configuration
- ✅ **Secrets**: Database credentials, JWT secret
- ✅ **PersistentVolumes**: Video storage
- ✅ **Ingress**: External access (optional)

**Deployment Script**: `deploy-k8s.sh`

```bash
./deploy-k8s.sh          # Deploy to Minikube
kubectl get pods         # Check status
kubectl get services     # View services
```

**Access**:
```bash
minikube service api-gateway-service
```

### 3.4 DockerHub Deployment ✅

**Script**: `build-and-push.sh`

**Process**:
1. Build all service images
2. Tag with version
3. Push to DockerHub registry

**Images**:
- `yourusername/streamify-auth:v1.0`
- `yourusername/streamify-video:v1.0`
- `yourusername/streamify-streaming:v1.0`
- `yourusername/streamify-billing:v1.0`
- `yourusername/streamify-analytics:v1.0`
- `yourusername/streamify-gateway:v1.0`

**Commands**:
```bash
./build-and-push.sh      # Interactive build and push
```

---

## Testing & Validation

### Automated Testing

**Script**: `test-all.sh`

**Test Coverage**:
1. ✅ REST API endpoints (Register, Login, Videos)
2. ✅ GraphQL queries (Videos, Stats)
3. ✅ Saga pattern execution
4. ✅ CQRS commands and queries
5. ✅ Circuit breaker status
6. ✅ Service health checks
7. ✅ RabbitMQ connectivity

**Run Tests**:
```bash
./test-all.sh
```

### Manual Testing

1. **REST API**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -d '{"email":"test@example.com",...}'
   ```

2. **GraphQL**:
   Open http://localhost:3000/graphql

3. **RabbitMQ**:
   Open http://localhost:15672 (streamify/streamify123)

4. **Circuit Breaker**:
   ```bash
   curl http://localhost:3000/api/circuit-breaker/stats
   ```

---

## Scalability & Resilience

### How Patterns Improve Scalability

1. **API Gateway**: 
   - Single entry point reduces client complexity
   - Rate limiting prevents abuse
   - Can scale horizontally behind load balancer

2. **Database-per-Service**:
   - Each service scales independently
   - No shared database bottleneck
   - Read replicas per service

3. **Circuit Breaker**:
   - Prevents cascading failures
   - System remains responsive during partial outages
   - Automatic recovery reduces manual intervention

4. **Saga Pattern**:
   - Maintains consistency without distributed locks
   - Services remain independent
   - Graceful failure handling

5. **CQRS**:
   - Read and write sides scale independently
   - Optimized queries for analytics
   - Event sourcing provides audit trail

### Resilience Features

- ✅ **Fault Isolation**: Service failures don't cascade
- ✅ **Graceful Degradation**: Circuit breakers provide fallbacks
- ✅ **Automatic Recovery**: Self-healing with circuit breaker reset
- ✅ **Data Consistency**: Saga compensations maintain integrity
- ✅ **Health Monitoring**: All services expose health endpoints
- ✅ **Event Replay**: CQRS allows rebuilding state from events

---

## Documentation Artifacts

| Artifact | Location | Description |
|----------|----------|-------------|
| **Architecture Diagrams** | PATTERNS_IMPLEMENTATION.md | System context, containers, deployment |
| **OpenAPI Spec** | v1.yaml | REST API documentation |
| **gRPC Proto** | proto/auth.proto | gRPC service definitions |
| **GraphQL Schema** | services/api-gateway/graphql.js | GraphQL type definitions |
| **Microservices Guide** | MICROSERVICES.md | Service details |
| **Patterns Guide** | PATTERNS_IMPLEMENTATION.md | Pattern implementations |
| **Deployment Guide** | README_NEW.md | Complete deployment instructions |
| **Test Scripts** | test-all.sh | Automated testing |

---

## Team Contributions

**(Update with actual team member names and contributions)**

| Member | Contribution | Files/Services |
|--------|--------------|----------------|
| Member 1 | Auth Service, gRPC implementation | auth-service/, proto/ |
| Member 2 | Video & Streaming Services | video-service/, streaming-service/ |
| Member 3 | Billing Service, Saga Pattern | billing-service/, registration-saga.js |
| Member 4 | Analytics Service, CQRS | analytics-service/, cqrs.js |
| Member 5 | API Gateway, Deployment, Documentation | api-gateway/, k8s/, docs/ |

---

## Conclusion

Streamify demonstrates a **complete microservices implementation** with:

✅ **6 independent microservices** with clear boundaries  
✅ **4 communication mechanisms** (REST, gRPC, GraphQL, RabbitMQ)  
✅ **5+ design patterns** for scalability and resilience  
✅ **Complete containerization** and orchestration  
✅ **Comprehensive testing** and documentation  

The system is **production-ready**, **highly scalable**, and demonstrates **industry best practices** in microservices architecture.

---

## Appendix

### System Requirements
- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (for local development)
- Minikube 1.30+ (for Kubernetes)
- 8GB RAM minimum

### Quick Start Commands
```bash
# Docker Compose
docker-compose up --build -d

# Kubernetes
./deploy-k8s.sh

# Testing
./test-all.sh

# Build and Push
./build-and-push.sh
```

### Access Points
- Frontend: http://localhost:3000
- GraphQL: http://localhost:3000/graphql
- RabbitMQ UI: http://localhost:15672
- gRPC: localhost:50051

---

**End of Document**
