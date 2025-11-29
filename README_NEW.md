# 🎥 Streamify - Complete Microservices Video Streaming Platform

[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-blue)](https://kubernetes.io/)
[![Microservices](https://img.shields.io/badge/Architecture-Microservices-green)](https://microservices.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Complete implementation of microservices architecture with REST, gRPC, GraphQL, Message Broker, and advanced design patterns**

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Communication Mechanisms](#-communication-mechanisms)
- [Design Patterns](#-design-patterns)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Documentation](#-documentation)

---

## 🎯 Overview

Streamify is a production-ready video streaming platform built with **microservices architecture**, demonstrating industry-standard patterns and practices. This project implements:

✅ **6 Microservices** (Auth, Video, Streaming, Billing, Analytics, API Gateway)
✅ **4 Communication Mechanisms** (REST, gRPC, GraphQL, Message Broker)
✅ **5+ Design Patterns** (API Gateway, Circuit Breaker, Saga, CQRS, Database-per-Service)
✅ **Complete Deployment** (Docker, Kubernetes, Minikube)
✅ **Comprehensive Documentation** (OpenAPI, Proto files, Architecture diagrams)

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Minikube (for Kubernetes deployment)
- 8GB RAM recommended

### Option 1: Docker Compose (Recommended)
```bash
# Clone repository
git clone <repository-url>
cd APIBP-20242YA-Team-10

# Start all services
docker-compose up --build -d

# Access application
open http://localhost:3000
```

### Option 2: Kubernetes (Minikube)
```bash
# Deploy to Minikube
./deploy-k8s.sh

# Access application
minikube service api-gateway-service
```

### Application Endpoints
| Service | Endpoint | Description |
|---------|----------|-------------|
| **Frontend** | http://localhost:3000 | Web UI |
| **REST API** | http://localhost:3000/api | REST endpoints |
| **GraphQL** | http://localhost:3000/graphql | GraphQL playground |
| **RabbitMQ UI** | http://localhost:15672 | Message broker (streamify/streamify123) |

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Client Applications                   │
│              (Web, Mobile, Third-party APIs)            │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    API Gateway (3000)                    │
│  • REST APIs          • Circuit Breaker                 │
│  • GraphQL            • Rate Limiting                   │
│  • Load Balancing     • Saga Orchestration              │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Auth Service │  │Video Service │  │Streaming Svc │
│   (3001)     │  │   (3002)     │  │   (3003)     │
│              │  │              │  │              │
│ • REST API   │  │ • REST API   │  │ • REST API   │
│ • gRPC Server│  │ • gRPC Client│  │ • Events     │
│ • JWT Auth   │  │ • File Upload│  │ • Sessions   │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼
  PostgreSQL        PostgreSQL        PostgreSQL
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Billing Svc   │  │Analytics Svc │  │  RabbitMQ    │
│   (3004)     │  │   (3005)     │  │   (5672)     │
│              │  │              │  │              │
│ • REST API   │  │ • CQRS       │  │ • Events     │
│ • Wallets    │  │ • Event Store│  │ • Async Msg  │
│ • Saga       │  │ • Read Models│  │ • Fanout     │
└──────┬───────┘  └──────┬───────┘  └──────────────┘
       │                 │
       ▼                 ▼
  PostgreSQL        PostgreSQL
```

### Microservices

| Service | Port | Responsibility | Database |
|---------|------|----------------|----------|
| **Auth Service** | 3001, 50051 (gRPC) | User authentication, JWT, gRPC server | streamify_auth |
| **Video Service** | 3002 | Video catalog, file management, metadata | streamify_video |
| **Streaming Service** | 3003 | Video playback, sessions, byte-range | streamify_streaming |
| **Billing Service** | 3004 | Wallets, payments, transactions | streamify_billing |
| **Analytics Service** | 3005 | CQRS, event sourcing, analytics | streamify_analytics |
| **API Gateway** | 3000 | Routing, auth, GraphQL, circuit breaker | N/A |

---

## 🔌 Communication Mechanisms

### 1. REST APIs ✅
**All services** expose REST endpoints for synchronous communication.

```bash
# Example: User registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123","firstName":"John","lastName":"Doe"}'
```

### 2. gRPC ✅
**Auth Service** exposes gRPC for high-performance inter-service communication.

**Proto**: `proto/auth.proto`
**Port**: 50051
**Services**: VerifyToken, GetUserProfile, HealthCheck

```bash
# Test with grpcurl
grpcurl -plaintext localhost:50051 auth.AuthService/HealthCheck
```

### 3. GraphQL ✅
**API Gateway** provides GraphQL for flexible client queries.

**Endpoint**: http://localhost:3000/graphql

```graphql
# Query videos
{
  videos(page: 1, limit: 10) {
    videos {
      id
      title
      category
    }
    total
  }
}
```

### 4. Message Broker (RabbitMQ) ✅
**Asynchronous** event-driven communication between services.

**Management UI**: http://localhost:15672 (streamify/streamify123)

**Event Types**: VIDEO_UPLOADED, USER_REGISTERED, STREAM_STARTED, PAYMENT_PROCESSED

---

## 🎨 Design Patterns

### Pattern 1: API Gateway ✅
**Single entry point** for all client requests with routing, authentication, and rate limiting.

- **Rate Limiting**: 100 requests per 15 minutes
- **Circuit Breaker**: Fault tolerance for service calls
- **Request Routing**: Intelligent routing to microservices

### Pattern 2: Database-per-Service ✅
**Each microservice** owns its database ensuring independence and scalability.

- 5 separate PostgreSQL databases
- No shared databases
- Service-specific schemas

### Pattern 3: Circuit Breaker ✅
**Prevent cascading failures** with automatic recovery using Opossum library.

```bash
# Check circuit breaker status
curl http://localhost:3000/api/circuit-breaker/stats
```

**States**: CLOSED → OPEN → HALF-OPEN → CLOSED

### Pattern 4: Saga Pattern ✅
**Distributed transactions** with compensating actions.

**Use Case**: User registration across Auth, Billing, and Analytics services

```bash
# Execute saga
curl -X POST http://localhost:3000/api/saga/register \
  -H "Content-Type: application/json" \
  -d '{"email":"saga@test.com","password":"pass123","firstName":"Saga","lastName":"Test"}'
```

**Flow**: Create User → Create Wallet → Create Analytics Profile
**Compensation**: Rollback on failure

### Pattern 5: CQRS with Event Sourcing ✅
**Separate read and write models** in Analytics Service.

- **Command Side**: Write to event store + normalized DB
- **Query Side**: Read from denormalized read models
- **Event Replay**: Rebuild read models from events

```bash
# Command (write)
curl -X POST http://localhost:3000/api/analytics/cqrs/record-view \
  -d '{"userId":1,"videoId":1,"watchTime":120}'

# Query (read)
curl http://localhost:3000/api/analytics/cqrs/video/1/stats
```

---

## 🚢 Deployment

### Docker Compose
```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Kubernetes (Minikube)
```bash
# Deploy to Minikube
./deploy-k8s.sh

# Check status
kubectl get pods
kubectl get services

# Access application
minikube service api-gateway-service
```

### DockerHub
```bash
# Build and push images
./build-and-push.sh

# Images will be pushed to:
# - yourusername/streamify-auth:v1.0
# - yourusername/streamify-video:v1.0
# - yourusername/streamify-streaming:v1.0
# - yourusername/streamify-billing:v1.0
# - yourusername/streamify-analytics:v1.0
# - yourusername/streamify-gateway:v1.0
```

---

## 🧪 Testing

### Automated Test Suite
```bash
# Run comprehensive tests
./test-all.sh
```

**Tests**:
- ✅ REST API endpoints
- ✅ GraphQL queries
- ✅ Saga pattern execution
- ✅ CQRS commands and queries
- ✅ Circuit breaker status
- ✅ Service health checks
- ✅ Message broker connectivity

### Manual Testing
```bash
# 1. Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# 3. Test GraphQL
open http://localhost:3000/graphql

# 4. Check RabbitMQ
open http://localhost:15672
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[PATTERNS_IMPLEMENTATION.md](PATTERNS_IMPLEMENTATION.md)** | Complete guide to all patterns |
| **[MICROSERVICES.md](MICROSERVICES.md)** | Service architecture details |
| **[v1.yaml](v1.yaml)** | OpenAPI specification |
| **[proto/auth.proto](proto/auth.proto)** | gRPC service definitions |
| **[docker-compose.yml](docker-compose.yml)** | Docker orchestration |
| **[k8s/](k8s/)** | Kubernetes manifests |

---

## 🎓 Academic Alignment

### Sub-Objective 1: Service Design (8 Marks)
✅ **6 Microservices** with clear boundaries
✅ **Business Capability** decomposition
✅ **4 Communication Mechanisms** (REST, gRPC, GraphQL, RabbitMQ)
✅ **Complete API Schemas** (OpenAPI, Proto files)
✅ **Architecture Diagrams** included

### Sub-Objective 2: Patterns & Reliability (4 Marks)
✅ **API Gateway** - Single entry point
✅ **Database-per-Service** - Service independence
✅ **Circuit Breaker** - Fault tolerance
✅ **Saga Pattern** - Distributed transactions
✅ **CQRS** - Command-query separation

### Sub-Objective 3: Deployment (3 Marks)
✅ **All services containerized** (Dockerfile for each)
✅ **Kubernetes manifests** (Deployments, Services, ConfigMaps)
✅ **DockerHub ready** (build-and-push.sh script)
✅ **Minikube deployment** tested

---

## 🏆 Key Features

- ✅ **Production-ready** microservices architecture
- ✅ **Multiple communication** protocols (REST, gRPC, GraphQL, AMQP)
- ✅ **Advanced patterns** (Saga, CQRS, Circuit Breaker)
- ✅ **Event sourcing** for auditability
- ✅ **Fault tolerance** with circuit breakers
- ✅ **Scalable design** with independent services
- ✅ **Complete documentation** and testing scripts
- ✅ **Container orchestration** (Docker, Kubernetes)

---

## 📞 Support

For questions or issues:
1. Check [PATTERNS_IMPLEMENTATION.md](PATTERNS_IMPLEMENTATION.md)
2. Review [MICROSERVICES.md](MICROSERVICES.md)
3. Run `./test-all.sh` for diagnostics

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file

---

## 👥 Contributors

**Team 10 - BITS Pilani**
- [List team members and their contributions]

---

**Built with ❤️ using Node.js, Express, PostgreSQL, Docker, Kubernetes, gRPC, GraphQL, and RabbitMQ**
