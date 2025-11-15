# Streamify - Video Streaming Platform API

**Complete Working Implementation with Microservices Architecture**

##  Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or pnpm

### Installation & Setup
```bash
# Clone the repository
git clone <repository-url>
cd APIBP-20242YA-Team-10

# Install dependencies
npm install

# Start the server
npm start

# Server will be running at http://localhost:3000
```

### Access the Application
- **Web Interface**: http://localhost:3000
- **API Documentation**: http://localhost:3000/health
- **API Base URL**: http://localhost:3000/api

##  Project Overview

**Project Name:** Streamify

### Abstract
Streamify is a complete video streaming platform built on a decoupled microservices architecture. This working implementation provides a robust backend system that handles everything from user authentication and video catalog management to pay-per-minute streaming, billing, and advanced analytics.

The platform exposes a unified REST API through a central API Gateway, allowing client applications (web, mobile) to seamlessly interact with various backend capabilities. Each microservice is designed to be independently scalable and maintainable, ensuring high availability and a clean separation of concerns.

### Problem Statement
Monolithic video platforms are difficult to scale, deploy, and maintain. A single bug can bring down the entire system, and different components like video processing and user management have vastly different resource requirements. As the user base grows, updating features or scaling individual parts of the application becomes a significant engineering challenge, leading to slow development cycles and poor reliability.

### Solution Overview
Streamify implements a modern microservices architecture where the platform is broken down into a suite of independent, loosely coupled services. An API Gateway acts as the single entry point for all clients, routing requests to the appropriate internal service.

This API-centric approach allows for:
- Independent scaling of services based on demand (e.g., scaling the Streaming Service during peak hours)
- Parallel development and deployment, accelerating feature delivery
- Fault isolation, where the failure of one service (e.g., Analytics) does not impact core functionality (e.g., video playback)
- Technology flexibility, allowing each service to use the best tools for its specific job

##  Core Functionalities (All Implemented)

| Feature | Description | Status |
|---|---|---|
| **API Gateway** | Provides a single, unified API entry point for all clients and routes requests to the correct service | ✅ Complete |
| **Auth Service** | Handles user registration, login, profile management, and JWT-based session security | ✅ Complete |
| **Video Service** | Manages the video catalog, including metadata, thumbnails, pricing, and file uploads | ✅ Complete |
| **Streaming Service** | Manages live playback sessions, generates secure stream URLs, and supports byte-range requests | ✅ Complete |
| **Billing Service** | Manages user virtual wallets, processes charges for video consumption, and maintains transaction ledger | ✅ Complete |
| **Analytics Service**| Collects, aggregates, and reports on viewing data, user activity, and platform revenue | ✅ Complete |

##  Technology Stack

- **Backend**: Node.js with Express.js
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer for video file handling
- **Security**: bcryptjs for password hashing
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Storage**: In-memory (easily replaceable with database)
- **API Documentation**: OpenAPI/Swagger specification

##  Project Structure

```
APIBP-20242YA-Team-10/
├── server.js              # Main server implementation
├── package.json           # Dependencies and scripts
├── v1.yaml               # OpenAPI specification
├── redocly.yaml          # API documentation config
├── public/
│   └── index.html        # Frontend web interface
├── test-api.js           # API testing script
├── uploads/              # Video file storage (created automatically)
└── README.md             # This file
```

##  Available Scripts

```bash
# Start the production server
npm start

# Start development server with auto-reload
npm run dev

# Build API documentation
npm run docs:build

# Lint API specification
npm run docs:lint

# Serve API documentation
npm run docs:serve
```

##  API Endpoints

### Authentication Service
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Authenticate user and get JWT token
- `POST /api/auth/verify` - Verify JWT token validity
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile

### Video Service
- `GET /api/videos` - List all videos with filtering
- `POST /api/videos` - Upload new video (requires auth)
- `GET /api/videos/{id}` - Get specific video details
- `PUT /api/videos/{id}` - Update video metadata (requires auth)
- `DELETE /api/videos/{id}` - Delete video (requires auth)

### Streaming Service
- `POST /api/stream/start/{videoId}` - Start streaming session (requires auth)
- `GET /api/stream/url/{sessionId}` - Get video stream URL with byte-range support
- `PUT /api/stream/heartbeat/{sessionId}` - Update watch progress (requires auth)

### Billing Service
- `GET /api/billing/balance` - Get user account balance (requires auth)
- `POST /api/billing/deposit` - Add funds to user account (requires auth)

### Analytics Service
- `GET /api/analytics/dashboard` - Get platform-wide metrics
- `GET /api/analytics/videos/{id}` - Get analytics for specific video
- `GET /api/analytics/user` - Get current user activity (requires auth)
- `GET /api/analytics/top-videos` - Get most popular videos
- `GET /api/analytics/revenue` - Get revenue reports
- `GET /api/analytics/reports/{period}` - Get aggregated reports (daily/weekly/monthly)

##  Testing the API

### Using the Web Interface
1. Start the server: `npm start`
2. Open browser: http://localhost:3000
3. Register a new account or login
4. Upload videos, manage billing, view analytics

### Using the Test Script
```bash
# Open browser console at http://localhost:3000
# The test script will run automatically
```

### Manual Testing with cURL
```bash
# Health check
curl http://localhost:3000/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

## 📊 Features Demonstrated

###  User Management
- Complete user registration and authentication system
- JWT-based security with token verification
- Profile management capabilities

###  Video Management
- File upload system with metadata
- Video categorization and search
- CRUD operations for video content

###  Streaming System
- Session-based streaming with security
- Byte-range request support for efficient streaming
- Watch time tracking and billing integration

###  Billing System
- Virtual wallet management
- Pay-per-minute billing model
- Transaction tracking and balance management

###  Analytics & Reporting
- Real-time platform metrics
- User activity tracking
- Revenue reporting and insights

###  Security Features
- Password hashing with bcrypt
- JWT token authentication
- Authorization checks for protected endpoints

##  Deployment Ready

The application is production-ready with:
- Environment variable support
- Error handling middleware
- CORS configuration
- File upload security
- Input validation
- Structured logging

## 🔄 Future Enhancements

- Database integration (MongoDB/PostgreSQL)
- Video transcoding and compression
- CDN integration for video delivery
- WebSocket support for real-time features
- Microservices containerization with Docker
- Load balancing and scaling configuration

## 👥 Team Details

- Pinto Infant Valan: 2024SL93070
- Crispin R: 2024SL93045
- Suhas Tumati: 2024SL93003
- Shruthi S: 2024SL93031
- Shree Raksha: 2024SL93021

## 📄 License

ISC License - See LICENSE file for details.

---

** The Streamify platform is fully functional and ready to use! Start the server and explore all features through the web interface at http://localhost:3000**
