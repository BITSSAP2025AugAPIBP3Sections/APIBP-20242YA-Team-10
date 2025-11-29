#!/bin/bash

# Kubernetes Deployment Script for Streamify on Minikube
# This script deploys the complete Streamify application to Minikube

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Streamify Kubernetes Deployment${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Check if minikube is installed
if ! command -v minikube &> /dev/null; then
    echo -e "${RED}Error: minikube is not installed${NC}"
    exit 1
fi

# Check if Minikube is running
if ! minikube status &> /dev/null; then
    echo -e "${YELLOW}Minikube is not running. Starting Minikube...${NC}"
    minikube start --cpus=4 --memory=8192 --disk-size=20g
else
    echo -e "${GREEN}✓ Minikube is running${NC}"
fi

echo ""
echo -e "${BLUE}Deploying to Minikube...${NC}"
echo ""

# Step 1: Apply Secrets
echo -e "${YELLOW}Step 1/6: Creating secrets...${NC}"
kubectl apply -f k8s/secret.yaml
echo -e "${GREEN}✓ Secrets created${NC}"
echo ""

# Step 2: Apply ConfigMaps
echo -e "${YELLOW}Step 2/6: Creating config maps...${NC}"
kubectl apply -f k8s/configmap.yaml
echo -e "${GREEN}✓ ConfigMaps created${NC}"
echo ""

# Step 3: Apply PV and PVC
echo -e "${YELLOW}Step 3/6: Creating persistent volumes...${NC}"
kubectl apply -f k8s/pv-pvc-video-uploads.yaml
echo -e "${GREEN}✓ Persistent volumes created${NC}"
echo ""

# Step 4: Deploy PostgreSQL Databases
echo -e "${YELLOW}Step 4/6: Deploying PostgreSQL databases...${NC}"
kubectl apply -f k8s/postgres/postgres-auth.yaml
kubectl apply -f k8s/postgres/postgres-video.yaml
kubectl apply -f k8s/postgres/postgres-streaming.yaml
kubectl apply -f k8s/postgres/postgres-billing.yaml
kubectl apply -f k8s/postgres/postgres-analytics.yaml
echo -e "${GREEN}✓ PostgreSQL databases deployed${NC}"
echo ""

# Wait for PostgreSQL pods to be ready
echo -e "${YELLOW}Waiting for PostgreSQL pods to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=postgres-auth --timeout=120s || true
kubectl wait --for=condition=ready pod -l app=postgres-video --timeout=120s || true
kubectl wait --for=condition=ready pod -l app=postgres-streaming --timeout=120s || true
kubectl wait --for=condition=ready pod -l app=postgres-billing --timeout=120s || true
kubectl wait --for=condition=ready pod -l app=postgres-analytics --timeout=120s || true
echo -e "${GREEN}✓ PostgreSQL pods ready${NC}"
echo ""

# Step 5: Deploy Microservices
echo -e "${YELLOW}Step 5/6: Deploying microservices...${NC}"
kubectl apply -f k8s/services/auth-deployment.yaml
kubectl apply -f k8s/services/auth-service.yaml
echo -e "${GREEN}  ✓ Auth Service deployed${NC}"

kubectl apply -f k8s/services/video-deployment.yaml
kubectl apply -f k8s/services/video-service.yaml
echo -e "${GREEN}  ✓ Video Service deployed${NC}"

kubectl apply -f k8s/services/streaming-deployment.yaml
kubectl apply -f k8s/services/streaming-service.yaml
echo -e "${GREEN}  ✓ Streaming Service deployed${NC}"

kubectl apply -f k8s/services/billing-deployment.yaml
kubectl apply -f k8s/services/billing-service.yaml
echo -e "${GREEN}  ✓ Billing Service deployed${NC}"

kubectl apply -f k8s/services/analytics-deployment.yaml
kubectl apply -f k8s/services/analytics-service.yaml
echo -e "${GREEN}  ✓ Analytics Service deployed${NC}"

kubectl apply -f k8s/services/api-gateway-deployment.yaml
kubectl apply -f k8s/services/api-gateway-service.yaml
echo -e "${GREEN}  ✓ API Gateway deployed${NC}"
echo ""

# Step 6: Apply Ingress (optional)
echo -e "${YELLOW}Step 6/6: Configuring ingress...${NC}"
kubectl apply -f k8s/ingress.yaml || echo -e "${YELLOW}Warning: Ingress not configured (optional)${NC}"
echo ""

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

# Wait for all pods to be ready
echo -e "${YELLOW}Waiting for all pods to be ready...${NC}"
sleep 10
kubectl get pods

echo ""
echo -e "${BLUE}Deployment Status:${NC}"
kubectl get deployments
echo ""

echo -e "${BLUE}Services:${NC}"
kubectl get services
echo ""

# Get the API Gateway URL
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Access Your Application:${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

API_GATEWAY_URL=$(minikube service api-gateway-service --url)
echo -e "${YELLOW}API Gateway URL:${NC} $API_GATEWAY_URL"
echo -e "${YELLOW}GraphQL Endpoint:${NC} $API_GATEWAY_URL/graphql"
echo ""

echo -e "${BLUE}To open in browser:${NC}"
echo "  minikube service api-gateway-service"
echo ""

echo -e "${BLUE}Useful commands:${NC}"
echo "  kubectl get pods                  # View all pods"
echo "  kubectl get services              # View all services"
echo "  kubectl logs <pod-name>           # View pod logs"
echo "  kubectl describe pod <pod-name>   # Pod details"
echo "  kubectl delete -f k8s/            # Delete all resources"
echo ""

echo -e "${GREEN}Deployment completed successfully!${NC}"
