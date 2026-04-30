#!/bin/bash
# Production deployment script for Lovers AI on EC2

set -e

echo "🚀 Lovers AI Production Deployment"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if docker and docker-compose are installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Installing...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker installed. Please reconnect SSH session and run this script again.${NC}"
    exit 0
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Installing docker-compose...${NC}"
    sudo apt install -y docker-compose
fi

# Navigate to app directory
if [ ! -d "~/app/LoversAI-2" ]; then
    echo -e "${RED}❌ Repository not found at ~/app/LoversAI-2${NC}"
    exit 1
fi

cd ~/app/LoversAI-2

echo -e "${GREEN}✅ Repository found${NC}"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Edit .env with your production secrets:${NC}"
    echo "    nano .env"
    echo ""
    exit 1
fi

# Pull latest changes (optional)
echo -e "${YELLOW}Pulling latest code from GitHub...${NC}"
git pull origin main || echo "⚠️  Pull skipped (already up to date)"

# Build and start
echo ""
echo -e "${YELLOW}Building Docker images (this may take 2-5 minutes)...${NC}"
docker-compose build --no-cache

echo ""
echo -e "${YELLOW}Starting services...${NC}"
docker-compose up -d

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Service Status:"
docker-compose ps

echo ""
echo "Useful commands:"
echo "  View logs:      docker-compose logs -f"
echo "  Backend logs:   docker-compose logs -f backend"
echo "  Frontend logs:  docker-compose logs -f frontend"
echo "  Stop services:  docker-compose down"
echo "  Restart:        docker-compose restart"
echo ""
echo "Next steps:"
echo "  1. Configure DNS: Add A record pointing 13.235.76.70 to theloversai.co.in"
echo "  2. Set up HTTPS: Run 'sudo certbot certonly --standalone -d theloversai.co.in'"
echo "  3. Update nginx config in frontend/nginx.conf with SSL paths"
echo "  4. Check health: curl https://theloversai.co.in/api/health"
echo ""
