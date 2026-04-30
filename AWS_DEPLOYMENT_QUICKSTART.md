# AWS Deployment Quick Start Guide

## Overview
Deploy your full-stack Lovers AI application to AWS using EC2, Docker, and optionally ECS Fargate.

---

## OPTION 1: EC2 with Docker (Recommended for small-medium apps)

### Prerequisites
- AWS Account
- AWS CLI configured locally
- Docker & Docker Compose installed

### Step 1: Prepare Your Code

1. Create a GitHub repository and push your code:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/loversai.git
git push -u origin main
```

2. Copy `.env.example` to `.env` and fill in all values:
```bash
cp .env.example .env
```

### Step 2: Launch EC2 Instance

1. **Go to AWS Console** → **EC2** → **Launch Instances**
2. **Configuration:**
   - Name: `loversai-app`
   - AMI: **Ubuntu 24.04 LTS** (free tier eligible)
   - Instance type: `t3.medium` (1GB RAM, 2 vCPU) or `t3.small` for testing
   - Key pair: Create new `loversai-key.pem`
   - Security Group: Create new
     - Inbound: SSH (22), HTTP (80), HTTPS (443) from 0.0.0.0/0
     - Add rule: Custom TCP 5000 (for backend) from 0.0.0.0/0
   - Storage: **30GB gp3**

3. **Launch** and wait for running status

### Step 3: Connect to EC2

```bash
# Windows PowerShell
$keyPath = "C:\path\to\loversai-key.pem"
$publicIP = "YOUR_EC2_PUBLIC_IP"

# Connect via SSH
ssh -i $keyPath ubuntu@$publicIP
```

### Step 4: Install Docker & Tools

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Install Git
sudo apt install git -y

# Logout and login to apply docker permissions
exit
ssh -i $keyPath ubuntu@$publicIP
```

### Step 5: Clone Repository & Deploy

```bash
# Clone your repo
git clone https://github.com/YOUR_USERNAME/loversai.git
cd loversai

# Create .env file with your secrets
nano .env
# Paste your environment variables, then Ctrl+O, Enter, Ctrl+X

# Build and run with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Step 6: Set Up Domain

**If using Route 53:**
1. Go to **AWS Console** → **Route 53** → **Hosted Zones**
2. Create hosted zone for your domain
3. Create **A record** pointing to your EC2 **Elastic IP**
4. Update GoDaddy nameservers to Route 53 nameservers

**If using GoDaddy DNS only:**
1. In GoDaddy DNS settings
2. Add **A record**: `yourdomain.com` → `EC2_PUBLIC_IP`
3. Add **A record**: `*.yourdomain.com` → `EC2_PUBLIC_IP` (for subdomains)

### Step 7: SSL/TLS Certificate (HTTPS)

```bash
# SSH into EC2, then:
sudo apt install certbot python3-certbot-nginx -y

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates stored at: /etc/letsencrypt/live/yourdomain.com/
```

Update your nginx.conf with SSL:
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # ... rest of config
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## OPTION 2: AWS Elastic Container Service (ECS) Fargate

### Advantages
- Managed container orchestration
- Auto-scaling
- Load balancing
- No EC2 maintenance

### Step 1: Create ECR Repositories

```bash
# Backend
aws ecr create-repository --repository-name loversai-backend --region us-east-1

# Frontend
aws ecr create-repository --repository-name loversai-frontend --region us-east-1
```

### Step 2: Build & Push Docker Images

```bash
# Get ECR login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Backend
docker build -t loversai-backend ./backend
docker tag loversai-backend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/loversai-backend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/loversai-backend:latest

# Frontend
docker build -t loversai-frontend ./frontend
docker tag loversai-frontend:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/loversai-frontend:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/loversai-frontend:latest
```

### Step 3: Create ECS Cluster

1. **AWS Console** → **ECS** → **Clusters** → **Create Cluster**
2. Name: `loversai-cluster`
3. VPC: Use default
4. Infrastructure: Fargate

### Step 4: Create Task Definitions

1. **ECS** → **Task Definitions** → **Create new task definition**
2. For **Backend**:
   - Name: `loversai-backend-task`
   - Container name: `backend`
   - Image: `YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/loversai-backend:latest`
   - Port: 5000
   - Memory: 512 MB
   - Environment: Add your .env variables

3. For **Frontend**:
   - Name: `loversai-frontend-task`
   - Container name: `frontend`
   - Image: `YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/loversai-frontend:latest`
   - Port: 80
   - Memory: 256 MB

### Step 5: Create Services

1. **Cluster** → **Services** → **Create**
   - Name: `loversai-backend-service`
   - Task definition: `loversai-backend-task`
   - Desired count: 2 (for redundancy)
   - Load balancer: Application Load Balancer
   - Target group: Create new
   - Port: 5000

2. Repeat for frontend on port 80

---

## Monitoring & Maintenance

### CloudWatch Logs
```bash
# View logs
aws logs tail /ecs/loversai-backend-task --follow

# Create alarms for high CPU/memory
aws cloudwatch put-metric-alarm --alarm-name high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

### Auto-scaling
1. **ECS Cluster** → **Auto Scaling** → **Create Auto Scaling Policy**
2. Set minimum and maximum tasks
3. Target CPU: 70%

### Backups
- **MongoDB Atlas**: Enable daily backups
- **S3**: Enable versioning for static assets
- **RDS**: Enable automated backups (if using RDS instead of MongoDB Atlas)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **EC2 can't reach internet** | Check security group rules and route tables |
| **Docker containers won't start** | Check `docker-compose logs` for errors |
| **SSL certificate expired** | Set up certbot auto-renewal: `sudo systemctl enable certbot.timer` |
| **High costs** | Use t3.micro for testing, set up billing alerts in CloudWatch |
| **Domain not resolving** | Wait 24-48 hours for DNS propagation, use `nslookup` to verify |

---

## Estimated Costs (Monthly)

| Service | Free Tier | Paid |
|---------|-----------|------|
| **EC2** (t3.micro) | 750 hrs | ~$9/month |
| **EC2** (t3.medium) | None | ~$30/month |
| **S3** | 5GB | ~$0.23 per GB |
| **CloudFront** | 1TB data | ~$0.085 per GB |
| **Route 53** | 25 DNS queries | $0.50 per zone |
| **RDS** (MongoDB Atlas better) | None | ~$15-50/month |
| **Total (small app)** | ~$10-50/month | Potential: $50-150/month |

---

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Set up AWS account and IAM user
3. ✅ Launch EC2 instance
4. ✅ Deploy with Docker Compose
5. ✅ Configure domain and SSL
6. ✅ Set up monitoring and backups
7. ✅ Celebrate! 🎉
