# Streamify - Video Streaming Platform API

**Complete Working Implementation with Microservices Architecture**

##  Quick Start

### Prerequisites
- Docker and Docker Compose installed
- At least 4GB RAM available
- Ports 3000-3005 available

### Installation & Setup (Docker - Recommended)
```bash
# Clone the repository
git clone <repository-url>
cd APIBP-20242YA-Team-10

# Start all microservices with Docker
docker-compose up --build -d

# Application will be running at http://localhost:3000
```

### Alternative: Local Development Setup
```bash
# Install dependencies for each service
cd services/auth-service && npm install
cd ../video-service && npm install
cd ../streaming-service && npm install
cd ../billing-service && npm install
cd ../analytics-service && npm install
cd ../api-gateway && npm install

# Start each service individually (requires PostgreSQL databases)
# See MICROSERVICES.md for detailed instructions
```

### Access the Application
- **Web Interface**: http://localhost:3000
- **API Gateway Health**: http://localhost:3000/health
- **API Base URL**: http://localhost:3000/api
- **Individual Services**: Ports 3001-3005 (see Architecture section)

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

- **Architecture**: Microservices with API Gateway
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL (separate database per service)
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer for video file handling
- **Security**: bcryptjs for password hashing
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Containerization**: Docker & Docker Compose
- **API Gateway**: http-proxy-middleware with rate limiting
- **API Documentation**: OpenAPI/Swagger specification

##  Project Structure

```
APIBP-20242YA-Team-10/
├── docker-compose.yml         # Docker orchestration for all services
├── MICROSERVICES.md          # Comprehensive microservices documentation
├── ARCHITECTURE_DIAGRAMS.md  # System Context, Container & Deployment diagrams
├── QUICKSTART.md             # 5-minute setup guide
├── v1.yaml                   # OpenAPI specification
├── redocly.yaml              # API documentation config
├── public/                   # Frontend web application
│   ├── index.html            # Auto-redirect entry point
│   ├── login.html            # Authentication page
│   ├── dashboard.html        # Main dashboard
│   ├── videos.html           # Video management page
│   ├── streaming.html        # Video streaming page
│   ├── billing.html          # Billing & balance page
│   ├── analytics.html        # Analytics & reports page
│   ├── profile.html          # User profile page
│   ├── styles.css            # Shared styles
│   ├── auth.js               # Authentication utilities
│   └── utils.js              # Shared JavaScript utilities
├── services/                 # Microservices directory
│   ├── api-gateway/          # API Gateway (Port 3000)
│   │   ├── index.js
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   ├── auth-service/         # Authentication Service (Port 3001)
│   │   ├── index.js
│   │   ├── db.js            # PostgreSQL connection & schema
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   ├── video-service/        # Video Management Service (Port 3002)
│   │   ├── index.js
│   │   ├── db.js
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   ├── streaming-service/    # Video Streaming Service (Port 3003)
│   │   ├── index.js
│   │   ├── db.js
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   ├── billing-service/      # Billing & Payments Service (Port 3004)
│   │   ├── index.js
│   │   ├── db.js
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   └── analytics-service/    # Analytics & Reporting Service (Port 3005)
│       ├── index.js
│       ├── db.js
│       ├── package.json
│       ├── Dockerfile
│       └── .env.example
└── server.js                 # Legacy monolithic server (deprecated)
```

##  Available Scripts

### Docker Commands (Recommended)
```bash
# Start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove all data
docker-compose down -v

# Restart specific service
docker-compose restart auth-service
```

### API Documentation
```bash
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
3. You'll be automatically redirected to the login page
4. **Register a new account** or login with existing credentials
5. Explore all microservices through separate dedicated pages:
   - **Dashboard** - Overview of all services and quick stats
   - **Videos** - Browse, upload, edit, and delete videos
   - **Streaming** - Watch videos with pay-per-minute billing
   - **Billing** - Manage your account balance and deposits
   - **Analytics** - View platform-wide and personal statistics
   - **Profile** - Manage your account information

### Key Features:
- **Authentication Required**: You must login to access protected services
- **Automatic Redirects**: Unauthorized access redirects to login page
- **Real-time Updates**: Balance and statistics update in real-time
- **Error Handling**: Comprehensive error messages guide you through any issues
- **Session Management**: Secure JWT-based authentication with localStorage

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

###  Authentication & Authorization
- **Separate Auth Pages**: Dedicated login/register page with form validation
- **Profile Management**: Edit user details on profile page
- **Session Security**: JWT tokens with automatic refresh
- **Protected Routes**: Unauthorized access redirects to login
- **Logout Functionality**: Clear session and return to login

###  User Management
- Complete user registration and authentication system
- JWT-based security with token verification
- Profile management capabilities with update functionality

###  Video Management (Dedicated Page)
- **Separate Videos Page**: Full video management interface
- File upload with preview and metadata
- Video categorization and filtering
- Search functionality across video catalog
- Complete CRUD operations (Create, Read, Update, Delete)
- Authentication required for upload/edit/delete operations

###  Streaming System (Dedicated Page)
- **Separate Streaming Page**: Full video player interface
- Session-based streaming with security
- Play/pause controls with real-time timer
- Cost calculation displayed during playback
- Byte-range request support for efficient streaming
- Watch time tracking and automatic billing integration
- Heartbeat mechanism for session management
- Insufficient funds detection with redirect to billing

###  Billing System (Dedicated Page)
- **Separate Billing Page**: Complete balance management interface
- Virtual wallet with real-time balance display
- Quick deposit buttons ($5, $10, $20, $50)
- Custom deposit amount input
- Pay-per-minute billing model
- Transaction tracking and balance management
- Pricing information and examples
- Automatic balance updates during streaming

###  Analytics & Reporting (Dedicated Page)
- **Separate Analytics Page**: Comprehensive analytics dashboard
- Platform-wide metrics (users, views, revenue, watch time)
- Personal activity reports with session history
- Top performing videos analysis
- Revenue reports (daily, weekly, monthly)
- Period-based reports with filtering
- Real-time data visualization
- User activity tracking with detailed history

###  Security Features
- Password hashing with bcrypt
- JWT token authentication with automatic validation
- Authorization checks for all protected endpoints
- Automatic redirect to login on 401/403 errors
- Token expiration handling
- Secure session management with localStorage
- CORS configuration for API security

## 🏗️ Microservices Architecture

### Overview
Streamify implements a true microservices architecture with:
- **6 Independent Services**: Each service has its own codebase and database
- **5 PostgreSQL Databases**: Database per service pattern
- **Docker Deployment**: Complete containerization with docker-compose
- **API Gateway**: Single entry point with request routing and rate limiting
- **Service Communication**: HTTP REST APIs between services

### Architecture Diagrams
See **ARCHITECTURE_DIAGRAMS.md** for detailed diagrams:
1. **System Context Diagram** - High-level system overview
2. **Container Diagram** - Microservices and databases
3. **Deployment Diagram** - Docker deployment configuration

### Microservices

| Service | Port | Database | Responsibilities |
|---------|------|----------|------------------|
| **API Gateway** | 3000 | - | Request routing, rate limiting, static files |
| **Auth Service** | 3001 | streamify_auth | User authentication, JWT, profiles |
| **Video Service** | 3002 | streamify_video | Video catalog, uploads, metadata |
| **Streaming Service** | 3003 | streamify_streaming | Playback sessions, video delivery |
| **Billing Service** | 3004 | streamify_billing | Balance management, transactions |
| **Analytics Service** | 3005 | streamify_analytics | Data aggregation, reporting |

### Key Features
- ✅ **Service Isolation**: Each service runs independently
- ✅ **Database per Service**: Data isolation and independent scaling
- ✅ **PostgreSQL Backend**: Production-ready persistent storage
- ✅ **Docker Deployment**: One command to start everything
- ✅ **Service Communication**: HTTP REST APIs
- ✅ **Health Monitoring**: All services expose `/health` endpoints
- ✅ **Rate Limiting**: Built into API Gateway
- ✅ **Horizontal Scaling**: Scale services independently

##  Deployment Ready

The application is production-ready with:
- ✅ Complete Docker containerization
- ✅ PostgreSQL databases for all services
- ✅ Environment variable configuration
- ✅ Error handling middleware
- ✅ CORS configuration
- ✅ File upload security
- ✅ Input validation
- ✅ Health check endpoints
- ✅ Database connection pooling
- ✅ Service-to-service authentication

## 🔄 Future Enhancements

- Message queue integration (RabbitMQ/Kafka)
- Service mesh implementation (Istio/Linkerd)
- Monitoring stack (Prometheus + Grafana)
- Centralized logging (ELK Stack)
- Video transcoding and compression
- CDN integration for video delivery
- WebSocket support for real-time features
- Kubernetes deployment
- CI/CD pipeline
- Load balancer configuration

## 👥 Team Details

- Pinto Infant Valan: 2024SL93070
- Crispin R: 2024SL93045
- Suhas Tumati: 2024SL93003
- Shruthi S: 2024SL93031
- Shree Raksha: 2024SL93021

## 📄 License

ISC License - See LICENSE file for details.

## 🎨 Frontend Architecture

### Page-by-Page Breakdown

#### 1. **index.html** - Entry Point
- Auto-detects if user is logged in
- Redirects to dashboard if authenticated
- Redirects to login if not authenticated

#### 2. **login.html** - Authentication Service UI
- User registration with validation
- Login with error handling
- JWT token management
- Redirects to dashboard on success

#### 3. **dashboard.html** - Main Hub
- Overview of all microservices
- Quick statistics display
- Service navigation cards
- Recent activity feed
- Links to all other pages

#### 4. **videos.html** - Video Service UI
- Browse video catalog with grid layout
- Upload videos with metadata (auth required)
- Edit video information (auth required)
- Delete videos (auth required)
- Search and filter by category
- Video card previews

#### 5. **streaming.html** - Streaming Service UI
- Video player interface
- Play/pause controls
- Real-time cost tracking
- Session management
- Browse videos to stream
- Insufficient funds handling

#### 6. **billing.html** - Billing Service UI
- Current balance display
- Quick deposit options
- Custom deposit form
- Pricing information
- Transaction history
- Balance refresh

#### 7. **analytics.html** - Analytics Service UI
- Platform dashboard metrics
- Personal activity reports
- Top videos analytics
- Revenue reports
- Period-based reports (daily/weekly/monthly)
- Data visualization

#### 8. **profile.html** - User Profile UI (Auth Service)
- View user information
- Edit profile details
- Account statistics
- Integrated data from multiple services

### Shared Components

#### **styles.css** - Unified Design System
- Consistent color scheme and branding
- Responsive grid layouts
- Card-based design patterns
- Modal dialogs
- Form styling
- Button variants
- Loading states
- Message notifications (success, error, warning, info)

#### **auth.js** - Authentication Utilities
- Login/logout functions
- Token management
- Session validation
- Automatic redirects

#### **utils.js** - Shared JavaScript Functions
- API request wrapper with error handling
- Date/time formatting
- Currency formatting
- Duration formatting
- Loading state management
- Message notifications
- Navigation updates

### Error Handling & User Experience

 **Comprehensive Error Messages**: All API errors display user-friendly messages
 **Automatic Redirects**: Unauthorized access redirects to login automatically
 **Loading States**: Visual feedback during API calls
 **Form Validation**: Client-side validation before API calls
 **Success Notifications**: Confirmation messages for successful operations
 **Network Error Handling**: Graceful handling of connection issues
 **Insufficient Funds Detection**: Automatic redirect to billing with prompt

---

** The Streamify platform is fully functional and ready to use!**

**Start the server and explore all microservices through dedicated web pages:**
1. Run `npm start`
2. Open http://localhost:3000
3. Register/Login to access all services
4. Each microservice has its own dedicated, fully-functional webpage!
