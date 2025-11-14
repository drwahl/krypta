#!/bin/bash
# Krypta Docker Build and Push Script

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="krypta"
VERSION="1.0.0"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Krypta Docker Build & Push Script   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Ask for Docker Hub username
echo -e "${YELLOW}📝 Enter your Docker Hub username:${NC}"
read -p "> " DOCKERHUB_USERNAME

if [ -z "$DOCKERHUB_USERNAME" ]; then
    echo -e "${RED}❌ Docker Hub username is required${NC}"
    exit 1
fi

FULL_IMAGE_NAME="$DOCKERHUB_USERNAME/$IMAGE_NAME"

echo ""
echo -e "${GREEN}✓ Docker Hub username: $DOCKERHUB_USERNAME${NC}"
echo -e "${GREEN}✓ Image name: $FULL_IMAGE_NAME${NC}"
echo ""

# Ask what to do
echo -e "${YELLOW}What would you like to do?${NC}"
echo "1) Build only (test locally)"
echo "2) Build and push to Docker Hub"
echo "3) Build multi-architecture and push (amd64 + arm64)"
echo "4) Build and run locally"
read -p "> " choice

case $choice in
    1)
        echo -e "${BLUE}🔨 Building Docker image...${NC}"
        docker build -t $IMAGE_NAME:latest -t $IMAGE_NAME:$VERSION .
        echo -e "${GREEN}✅ Build complete!${NC}"
        echo ""
        echo -e "Run locally with:"
        echo -e "${BLUE}docker run -d -p 8080:80 --name krypta $IMAGE_NAME:latest${NC}"
        ;;
    2)
        echo -e "${BLUE}🔨 Building Docker image...${NC}"
        docker build -t $IMAGE_NAME:latest -t $IMAGE_NAME:$VERSION .
        echo -e "${GREEN}✅ Build complete!${NC}"
        echo ""
        
        echo -e "${BLUE}🏷️  Tagging images...${NC}"
        docker tag $IMAGE_NAME:latest $FULL_IMAGE_NAME:latest
        docker tag $IMAGE_NAME:$VERSION $FULL_IMAGE_NAME:$VERSION
        echo -e "${GREEN}✅ Tagged!${NC}"
        echo ""
        
        echo -e "${BLUE}🔐 Logging in to Docker Hub...${NC}"
        docker login
        echo ""
        
        echo -e "${BLUE}⬆️  Pushing to Docker Hub...${NC}"
        docker push $FULL_IMAGE_NAME:latest
        docker push $FULL_IMAGE_NAME:$VERSION
        echo ""
        echo -e "${GREEN}🎉 Successfully pushed to Docker Hub!${NC}"
        echo ""
        echo -e "View at: ${BLUE}https://hub.docker.com/r/$FULL_IMAGE_NAME${NC}"
        echo ""
        echo -e "Pull with:"
        echo -e "${BLUE}docker pull $FULL_IMAGE_NAME:latest${NC}"
        ;;
    3)
        echo -e "${BLUE}🔨 Building multi-architecture image...${NC}"
        echo -e "${YELLOW}⚠️  This requires docker buildx and may take longer${NC}"
        
        # Create builder if it doesn't exist
        docker buildx create --use --name krypta-builder 2>/dev/null || docker buildx use krypta-builder
        
        echo ""
        echo -e "${BLUE}🔐 Logging in to Docker Hub...${NC}"
        docker login
        echo ""
        
        echo -e "${BLUE}⬆️  Building and pushing multi-arch image...${NC}"
        docker buildx build \
            --platform linux/amd64,linux/arm64 \
            -t $FULL_IMAGE_NAME:latest \
            -t $FULL_IMAGE_NAME:$VERSION \
            --push .
        
        echo ""
        echo -e "${GREEN}🎉 Successfully built and pushed multi-architecture image!${NC}"
        echo -e "${GREEN}✓ Architectures: amd64, arm64${NC}"
        echo ""
        echo -e "View at: ${BLUE}https://hub.docker.com/r/$FULL_IMAGE_NAME${NC}"
        ;;
    4)
        echo -e "${BLUE}🔨 Building Docker image...${NC}"
        docker build -t $IMAGE_NAME:latest .
        echo -e "${GREEN}✅ Build complete!${NC}"
        echo ""
        
        echo -e "${BLUE}🚀 Starting container...${NC}"
        docker run -d -p 8080:80 --name krypta $IMAGE_NAME:latest
        echo ""
        echo -e "${GREEN}✅ Container started!${NC}"
        echo ""
        echo -e "🌐 Access Krypta at: ${BLUE}http://localhost:8080${NC}"
        echo ""
        echo -e "Useful commands:"
        echo -e "  View logs:    ${BLUE}docker logs -f krypta${NC}"
        echo -e "  Stop:         ${BLUE}docker stop krypta${NC}"
        echo -e "  Start:        ${BLUE}docker start krypta${NC}"
        echo -e "  Remove:       ${BLUE}docker rm -f krypta${NC}"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✨ Done!${NC}"

