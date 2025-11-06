## Project Overview

**Project Name:** Streamify

### Abstract
Streamify is a complete video streaming platform built on a decoupled microservices architecture. It provides a robust backend system that handles everything from user authentication and video catalog management to pay-per-minute streaming, billing, and advanced analytics.

The product exposes a unified REST API through a central API Gateway, allowing client applications (web, mobile) to seamlessly interact with various backend capabilities. Each microservice is designed to be independently scalable and maintainable, ensuring high availability and a clean separation of concerns.

### Problem Statement

Monolithic video platforms are difficult to scale, deploy, and maintain. A single bug can bring down the entire system, and different components like video processing and user management have vastly different resource requirements. As the user base grows, updating features or scaling individual parts of the application becomes a significant engineering challenge, leading to slow development cycles and poor reliability.

### Solution Overview

Streamify implements a modern microservices architecture where the platform is broken down into a suite of independent, loosely coupled services. An API Gateway acts as the single entry point for all clients, routing requests to the appropriate internal service.

This API-centric approach allows for:
- Independent scaling of services based on demand (e.g., scaling the Streaming Service during peak hours).
- Parallel development and deployment, accelerating feature delivery.
- Fault isolation, where the failure of one service (e.g., Analytics) does not impact core functionality (e.g., video playback).
- Technology flexibility, allowing each service to use the best tools for its specific job.

### Core Functionalities

| Feature | Description |
|---|---|
| **API Gateway** | Provides a single, unified API entry point for all clients and routes requests to the correct service. |
| **Auth Service** | Handles user registration, login, profile management, and JWT-based session security. |
| **Video Service** | Manages the video catalog, including metadata, thumbnails, pricing, and file uploads. |
| **Streaming Service** | Manages live playback sessions, generates secure stream URLs, and supports byte-range requests for efficient seeking. |
| **Billing Service** | Manages user virtual wallets, processes charges for video consumption, and maintains a transaction ledger. |
| **Analytics Service**| Collects, aggregates, and reports on viewing data, user activity, and platform revenue. |

---

## Team Details

- Pinto Infant Valan: 2024SL93070
- Crispin R: 2024SL93045
- Suhas Tumati: 2024SL93003
- Shruthi S: 2024SL93031
- Shree Raksha: 2024SL93021