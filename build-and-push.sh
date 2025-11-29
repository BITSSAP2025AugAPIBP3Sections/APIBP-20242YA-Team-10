#!/bin/bash

# Docker Build and Push Script for Streamify Microservices
# This script builds all Docker images and optionally pushes them to DockerHub

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCKER_USERNAME="${DOCKER_USERNAME:-yourusername}"
VERSION="${VERSION:-v1.0}"
PUSH_TO_DOCKERHUB="${PUSH_TO_DOCKERHUB:-false}"

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Streamify Docker Build Script${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Ask for DockerHub username if not set
if [ "$DOCKER_USERNAME" = "yourusername" ]; then
    echo -e "${YELLOW}Enter your DockerHub username:${NC}"
    read -r DOCKER_USERNAME
fi

# Ask if user wants to push to DockerHub
echo -e "${YELLOW}Do you want to push images to DockerHub? (y/n):${NC}"
read -r PUSH_CHOICE

if [ "$PUSH_CHOICE" = "y" ] || [ "$PUSH_CHOICE" = "Y" ]; then
    PUSH_TO_DOCKERHUB=true
    echo -e "${YELLOW}Logging into DockerHub...${NC}"
    docker login
fi

echo ""
echo -e "${GREEN}Building Docker images...${NC}"
echo ""

# Array of services
declare -a services=(
    "auth-service"
    "video-service"
    "streaming-service"
    "billing-service"
    "analytics-service"
    "api-gateway"
)

# Build each service
for service in "${services[@]}"; do
    echo -e "${GREEN}Building $service...${NC}"
    
    # Build the image
    docker build -t "streamify-$service:latest" \
                 -t "streamify-$service:$VERSION" \
                 -t "$DOCKER_USERNAME/streamify-$service:latest" \
                 -t "$DOCKER_USERNAME/streamify-$service:$VERSION" \
                 "./services/$service"
    
    echo -e "${GREEN}✓ Built $service${NC}"
    echo ""
done

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}All images built successfully!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

# List built images
echo -e "${YELLOW}Built images:${NC}"
docker images | grep streamify

# Push to DockerHub if requested
if [ "$PUSH_TO_DOCKERHUB" = true ]; then
    echo ""
    echo -e "${GREEN}=====================================${NC}"
    echo -e "${GREEN}Pushing images to DockerHub...${NC}"
    echo -e "${GREEN}=====================================${NC}"
    echo ""
    
    for service in "${services[@]}"; do
        echo -e "${GREEN}Pushing $service...${NC}"
        
        docker push "$DOCKER_USERNAME/streamify-$service:latest"
        docker push "$DOCKER_USERNAME/streamify-$service:$VERSION"
        
        echo -e "${GREEN}✓ Pushed $service${NC}"
        echo ""
    done
    
    echo -e "${GREEN}=====================================${NC}"
    echo -e "${GREEN}All images pushed successfully!${NC}"
    echo -e "${GREEN}=====================================${NC}"
    echo ""
    echo -e "${YELLOW}Images available at:${NC}"
    for service in "${services[@]}"; do
        echo "  - $DOCKER_USERNAME/streamify-$service:$VERSION"
    done
else
    echo ""
    echo -e "${YELLOW}Images not pushed to DockerHub.${NC}"
    echo -e "${YELLOW}To push later, run:${NC}"
    echo ""
    for service in "${services[@]}"; do
        echo "  docker push $DOCKER_USERNAME/streamify-$service:$VERSION"
    done
fi

echo ""
echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}Done!${NC}"
echo -e "${GREEN}=====================================${NC}"
