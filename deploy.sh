#!/bin/bash
# Lovers AI AWS EC2 Deployment Script

set -e  # Exit on any error

echo "🚀 Starting Lovers AI Deployment to EC2..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
echo "🐳 Installing Docker Compose..."
sudo apt install docker-compose -y

# Install Git
echo "📥 Installing Git..."
sudo apt install git -y

# Create app directory
echo "📁 Creating app directory..."
mkdir -p ~/app
cd ~/app

# Clone repository
echo "📥 Cloning repository..."
git clone https://github.com/YOUR_USERNAME/loversai.git
cd loversai

# Create .env file (user needs to add values)
echo "⚙️  Creating .env file..."
cp .env.example .env
echo "⚠️  IMPORTANT: Edit .env file with your actual credentials"
nano .env

# Build and start services
echo "🏗️  Building Docker images..."
docker-compose build

echo "▶️  Starting services..."
docker-compose up -d

# Check status
echo "✅ Deployment complete!"
docker-compose ps

echo ""
echo "📋 Next steps:"
echo "1. Add A record in Route 53/GoDaddy pointing to: 13.235.76.70"
echo "2. Set up SSL with Let's Encrypt"
echo "3. Check logs: docker-compose logs -f"
