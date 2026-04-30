# Complete AWS Deployment Guide with GoDaddy Domain

## Overview
This guide covers deploying your full-stack application (Node.js Backend + React Frontend) on AWS with a GoDaddy domain.

**What you'll set up:**
- EC2 instance for Backend (Node.js)
- S3 + CloudFront for Frontend (React)
- Route 53 for DNS or use GoDaddy DNS
- SSL/TLS certificate with ACM
- RDS for MongoDB (optional alternative)

---

## PHASE 1: AWS ACCOUNT & PREREQUISITES

### Step 1: Create AWS Account
1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click "Create an AWS Account"
3. Enter email and create password
4. Choose "Personal" account type
5. Add payment method
6. Verify phone number
7. Complete AWS account creation

### Step 2: Create IAM User (Best Practice)
1. Go to **IAM Console** → **Users**
2. Click **Create user** → Name: `lovers-ai-deployer`
3. Check **Provide user access to AWS Management Console**
4. Set password, click **Next**
5. Click **Attach policies directly** → Search and select:
   - `EC2FullAccess`
   - `S3FullAccess`
   - `CloudFrontFullAccess`
   - `AWSCertificateManagerFullAccess`
   - `Route53FullAccess`
6. Click **Create user**
7. Save the login credentials

### Step 3: Create Access Keys
1. Go to **IAM** → Select your user
2. Go to **Security credentials** tab
3. Click **Create access key**
4. Select **Command Line Interface (CLI)**
5. Click **Create access key**
6. Download `.csv` file (save it securely)

### Step 4: Install AWS CLI Locally
```bash
# Windows - using Chocolatey or download from:
# https://aws.amazon.com/cli/

# Verify installation
aws --version

# Configure AWS CLI
aws configure
# Enter:
# - Access Key ID: [from Step 3]
# - Secret Access Key: [from Step 3]
# - Default region: us-east-1
# - Default output format: json
```

---

## PHASE 2: DOMAIN SETUP (GoDaddy → AWS Route 53)

### Option A: Using Route 53 (Recommended)
#### Step 1: Create Hosted Zone in Route 53
1. Go to **AWS Console** → **Route 53** → **Hosted zones**
2. Click **Create hosted zone**
3. Domain name: `yourdomain.com` (e.g., `loversai.com`)
4. Click **Create hosted zone**
5. Note the **4 Name Servers** provided

#### Step 2: Update GoDaddy DNS
1. Go to [godaddy.com](https://godaddy.com) → **My Products** → Select domain
2. Click **Manage DNS** (or **DNS settings**)
3. Find **Nameservers** section
4. Click **Change Nameservers**
5. Select **Use custom nameservers**
6. Enter the 4 nameservers from Route 53:
   - Example: `ns-123.awsdns-45.com`
7. Click **Save** (wait 24-48 hours for propagation)

#### Step 3: Verify DNS Propagation
```bash
# Check DNS propagation
nslookup yourdomain.com
# Should show AWS nameservers
```

### Option B: Keep GoDaddy DNS (Alternative)
1. Skip Route 53 hosted zone creation
2. In GoDaddy DNS settings, manually add A records pointing to your AWS resources
3. This requires more manual configuration

---

## PHASE 3: SSL CERTIFICATE (AWS Certificate Manager)

### Step 1: Request Certificate
1. Go to **AWS Console** → **Certificate Manager**
2. Click **Request a certificate**
3. Choose **Request a public certificate** → **Next**
4. Domain names:
   - `yourdomain.com`
   - `*.yourdomain.com` (wildcard for subdomains)
5. Select **DNS validation** (easier with Route 53)
6. Click **Request**

### Step 2: Validate Certificate (if using Route 53)
1. Go back to pending certificate
2. Click **Create records in Route 53** button
3. Confirms validation automatically
4. Wait for **Issued** status (usually 5-15 minutes)

### Step 3: Validate Certificate (if using GoDaddy DNS)
1. Note the validation records provided
2. Go to GoDaddy DNS settings
3. Add CNAME records as specified
4. Wait for validation

---

## PHASE 4: BACKEND DEPLOYMENT (EC2)

### Step 1: Launch EC2 Instance
1. Go to **AWS Console** → **EC2** → **Instances**
2. Click **Launch instances**
3. **Name**: `lovers-ai-backend`
4. **AMI**: Amazon Linux 2 (or Ubuntu 22.04)
5. **Instance type**: `t3.micro` (free tier) or `t3.small`
6. **Key pair**: Click **Create new key pair**
   - Name: `lovers-ai-key`
   - Type: RSA
   - Format: `.pem`
   - Download it securely
7. **Network settings** → Click **Edit**
   - Select default VPC
   - Enable auto-assign public IP
   - Create security group: `lovers-ai-backend-sg`
8. **Inbound rules** for security group:
   - SSH (22) from your IP
   - HTTP (80) from 0.0.0.0/0
   - HTTPS (443) from 0.0.0.0/0
   - Custom TCP (5000) from 0.0.0.0/0
9. **Storage**: 30GB gp3
10. Click **Launch instance**

### Step 2: Connect to EC2 Instance
```bash
# Windows PowerShell/CMD
# Move to folder with lovers-ai-key.pem
cd C:\path\to\key

# Connect
ssh -i "lovers-ai-key.pem" ec2-user@PUBLIC_IP_ADDRESS

# For Ubuntu AMI, use 'ubuntu' instead of 'ec2-user'
ssh -i "lovers-ai-key.pem" ubuntu@PUBLIC_IP_ADDRESS
```

### Step 3: Update System & Install Node.js
```bash
# Update system
sudo yum update -y  # For Amazon Linux 2
# OR
sudo apt update && sudo apt upgrade -y  # For Ubuntu

# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -  # Amazon Linux
# OR
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -  # Ubuntu

sudo yum install -y nodejs  # Amazon Linux
# OR
sudo apt install -y nodejs  # Ubuntu

# Verify
node --version
npm --version
```

### Step 4: Install Git
```bash
sudo yum install git -y  # Amazon Linux
# OR
sudo apt install git -y  # Ubuntu
```

### Step 5: Clone Your Backend Repository
```bash
# Create app directory
mkdir -p ~/app
cd ~/app

# Clone your backend repo (you need to upload to GitHub first)
git clone https://github.com/YOUR_USERNAME/loversai-backend.git
cd loversai-backend

# Or upload via SCP
scp -i "lovers-ai-key.pem" -r backend/* ec2-user@PUBLIC_IP:/home/ec2-user/app/
```

### Step 6: Setup Environment Variables
```bash
# Create .env file
nano .env

# Add content:
PORT=5000
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
LEMON_SQUEEZY_API_KEY=your_lemon_squeezy_key
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
FRONTEND_URL=https://yourdomain.com

# Press Ctrl+X, Y, Enter to save
```

### Step 7: Install Dependencies
```bash
cd ~/app/loversai-backend
npm install
```

### Step 8: Test Run
```bash
npm run dev
# OR for production
npm start
```

### Step 9: Setup PM2 (Process Manager)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Create ecosystem config
pm2 init

# Or create manually:
nano ecosystem.config.js
```

**ecosystem.config.js content:**
```javascript
module.exports = {
  apps: [
    {
      name: 'loversai-backend',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

### Step 10: Start Backend with PM2
```bash
# Create logs directory
mkdir -p ~/app/loversai-backend/logs

# Start the app
pm2 start ecosystem.config.js

# Setup auto-restart on reboot
pm2 startup
pm2 save

# View logs
pm2 logs
```

### Step 11: Install & Setup Nginx (Reverse Proxy)
```bash
sudo yum install nginx -y  # Amazon Linux
# OR
sudo apt install nginx -y  # Ubuntu

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/default
# OR
sudo nano /etc/nginx/conf.d/default.conf
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 12: Test Nginx
```bash
sudo nginx -t

# If OK, restart
sudo systemctl restart nginx
```

### Step 13: Setup SSL with Certbot
```bash
# Install certbot
sudo yum install certbot python-certbot-nginx -y  # Amazon Linux
# OR
sudo apt install certbot python3-certbot-nginx -y  # Ubuntu

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Update Nginx config to use HTTPS
sudo nano /etc/nginx/conf.d/default.conf
```

**Updated Nginx config with SSL:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Restart Nginx
sudo systemctl restart nginx

# Auto-renew certificates
sudo systemctl enable certbot-renew.timer
```

### Step 14: Get Elastic IP (Optional but Recommended)
1. Go to **EC2** → **Elastic IPs**
2. Click **Allocate Elastic IP address**
3. Select your instance
4. This prevents IP changes if instance stops/starts

---

## PHASE 5: FRONTEND DEPLOYMENT (S3 + CloudFront)

### Step 1: Update API URL in Frontend
Edit [frontend/src/api/api.js](frontend/src/api/api.js):
```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://yourdomain.com';
// Or specific backend URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.yourdomain.com';
```

Update [frontend/.env](frontend/.env) (create if doesn't exist):
```
REACT_APP_API_URL=https://yourdomain.com
REACT_APP_FIREBASE_API_KEY=your_firebase_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_firebase_domain
REACT_APP_FIREBASE_PROJECT_ID=your_firebase_project_id
```

### Step 2: Build React App Locally
```bash
cd frontend
npm run build

# This creates a 'build' folder with production files
```

### Step 3: Create S3 Bucket
1. Go to **AWS Console** → **S3**
2. Click **Create bucket**
3. **Bucket name**: `yourdomain.com` (must be unique globally)
4. **Region**: Same as your other resources (us-east-1)
5. **Block Public Access**: Uncheck all boxes
6. Click **Create bucket**

### Step 4: Upload Frontend Files
```bash
# Using AWS CLI
aws s3 cp frontend/build s3://yourdomain.com --recursive --region us-east-1

# Or from AWS Console:
# - Go to your bucket
# - Click Upload
# - Drag and drop the 'build' folder contents
```

### Step 5: Enable Static Website Hosting
1. Go to S3 bucket → **Properties** tab
2. Find **Static website hosting** → Click **Edit**
3. Check **Enable**
4. Index document: `index.html`
5. Error document: `index.html` (for React routing)
6. Click **Save**

### Step 6: Create Bucket Policy (Make Public)
1. Go to **Permissions** tab
2. Click **Bucket policy** → **Edit**

**Add this policy:**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::yourdomain.com/*"
        }
    ]
}
```

### Step 7: Create CloudFront Distribution
1. Go to **AWS Console** → **CloudFront** → **Distributions**
2. Click **Create distribution**
3. **Origin domain**: Select your S3 bucket
4. **Name**: `yourdomain.com-distribution`
5. **Viewer protocol policy**: Redirect HTTP to HTTPS
6. **Allowed HTTP methods**: GET, HEAD, OPTIONS
7. **Cache policy**: Choose `Managed-CachingOptimized`
8. **Origin request policy**: `CORS-S3Origin`
9. **Compress objects automatically**: Yes
10. **Alternate domain names (CNAME)**: 
    - `yourdomain.com`
    - `www.yourdomain.com`
11. **Custom SSL certificate**: Select your certificate from ACM
12. **Default root object**: `index.html`
13. Click **Create distribution** (wait 5-10 minutes)

### Step 8: Add CloudFront Domain to Route 53
1. Go to **Route 53** → **Hosted zones**
2. Create two A records:
   - **Name**: `yourdomain.com`
   - **Type**: A
   - **Alias**: Yes
   - **Route traffic to**: CloudFront distribution (`d123.cloudfront.net`)
   - **Evaluate target health**: No

3. Create another for `www.yourdomain.com` pointing to same CloudFront

### Step 9: Create Origin Access Control (OAC)
1. In CloudFront distribution → **Origins** → Edit your S3 origin
2. **Origin access**: Select **Origin access control settings**
3. Click **Create control setting** → Name: `yourdomain-oac`
4. Update S3 bucket policy with OAC policy

---

## PHASE 6: CONNECT BACKEND & FRONTEND

### Step 1: Update Backend CORS
Edit [backend/server.js](backend/server.js):
```javascript
const corsOptions = {
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

### Step 2: Update Frontend API Endpoints
Review all API calls in frontend/src and ensure they use `process.env.REACT_APP_API_URL`

### Step 3: Test Connection
```bash
# From your local machine
curl https://yourdomain.com/api/health
# Should get backend response
```

---

## PHASE 7: MONITORING & SECURITY

### Step 1: Setup CloudWatch
1. Go to **AWS Console** → **CloudWatch**
2. **Dashboards** → Create dashboard
3. Add widgets for:
   - EC2 CPU utilization
   - EC2 network traffic
   - S3 requests
   - CloudFront requests

### Step 2: Setup Alarms
1. **CloudWatch** → **Alarms** → **Create alarm**
2. EC2 instance CPU > 80% → Send SNS notification
3. Backend error rate

### Step 3: Security Groups Review
1. Verify Security group allows only necessary ports
2. Restrict SSH (22) to your IP only
3. Keep HTTP (80) and HTTPS (443) open to all

### Step 4: Backup Strategy
```bash
# Backup MongoDB from EC2
# Or use MongoDB Atlas for managed backups
```

### Step 5: Enable VPC Flow Logs
1. Go to **VPC** → **Your VPC**
2. **Flow Logs** → Create flow log
3. Send to CloudWatch for monitoring

---

## PHASE 8: DOMAIN SETUP COMPLETE (Optional Custom DNS on AWS)

If you migrated DNS to Route 53, verify everything works:

```bash
# Check DNS resolution
nslookup yourdomain.com
nslookup www.yourdomain.com
nslookup api.yourdomain.com

# Should all resolve to your AWS resources
```

---

## TROUBLESHOOTING

### Frontend Not Loading
- [ ] Check CloudFront cache (invalidate all: `/` or `/*`)
- [ ] Verify S3 bucket policy is correct
- [ ] Check CloudFront origin domain

### Backend Not Responding
- [ ] SSH into EC2 and check: `pm2 status`
- [ ] Check security group allows traffic
- [ ] Verify environment variables: `cat .env`
- [ ] Check logs: `pm2 logs`

### SSL Certificate Issues
- [ ] Verify DNS propagation completed
- [ ] Check certificate status in ACM
- [ ] Verify all domain names in certificate

### API Calls Failing
- [ ] Check CORS configuration in backend
- [ ] Verify frontend API URL matches backend domain
- [ ] Check backend logs for errors

### DNS Issues
- [ ] Wait 24-48 hours after changing nameservers
- [ ] Use `nslookup` or `dig` to verify propagation
- [ ] Clear browser cache

---

## COST ESTIMATION (Monthly)

| Service | Free Tier | Usage | Est. Cost |
|---------|-----------|-------|-----------|
| EC2 (t3.micro) | 750 hrs | Running 24/7 | $0-10 |
| S3 | 5GB | 1GB files | $0-1 |
| CloudFront | 1TB data | 10GB/month | $0.85 |
| Route 53 | 0 | $0.50 per zone | $0.50 |
| Data transfer | 15GB out | 5GB/month | $0 |
| **Total** | | | **$1.35-11.35** |

---

## NEXT STEPS

1. [ ] Create AWS account and IAM user
2. [ ] Create SSL certificate
3. [ ] Deploy backend to EC2
4. [ ] Deploy frontend to S3 + CloudFront
5. [ ] Update GoDaddy DNS to Route 53
6. [ ] Test all connections
7. [ ] Setup monitoring
8. [ ] Enable auto-scaling (optional)

---

## USEFUL COMMANDS

```bash
# SSH into EC2
ssh -i "lovers-ai-key.pem" ec2-user@PUBLIC_IP

# Check backend status
pm2 status

# View backend logs
pm2 logs

# Restart backend
pm2 restart all

# Stop backend
pm2 stop all

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"

# Update S3 files
aws s3 sync frontend/build s3://yourdomain.com --delete

# Check DNS
nslookup yourdomain.com
```

---

## SUPPORT RESOURCES

- AWS Documentation: https://docs.aws.amazon.com
- GoDaddy Support: https://www.godaddy.com/help
- Node.js Guide: https://nodejs.org/docs
- React Deployment: https://create-react-app.dev/deployment
- Let's Encrypt: https://certbot.eff.org
