@echo off
REM Lovers AI AWS EC2 Deployment Script for Windows PowerShell

setlocal enabledelayedexpansion

REM EC2 Details
set EC2_IP=13.235.76.70
set EC2_USER=ubuntu
set KEY_PATH=%USERPROFILE%\Downloads\theloversai-key.pem
set INSTANCE_NAME=theloversai-backend

echo.
echo =============================================================
echo Lovers AI - AWS EC2 Deployment Setup
echo =============================================================
echo.
echo EC2 Instance: !INSTANCE_NAME!
echo Public IP: !EC2_IP!
echo User: !EC2_USER!
echo Key: !KEY_PATH!
echo.

REM Check if key exists
if not exist "!KEY_PATH!" (
    echo ❌ ERROR: Key file not found at !KEY_PATH!
    echo Please download theloversai-key.pem from AWS Console
    pause
    exit /b 1
)

echo ✅ Key file found
echo.
echo Ready to deploy? This will:
echo  1. Connect to EC2 via SSH
echo  2. Install Docker and Docker Compose
echo  3. Clone your GitHub repository
echo  4. Deploy with Docker Compose
echo.
pause

echo.
echo 🚀 Connecting to EC2...
echo Command: ssh -i "!KEY_PATH!" !EC2_USER!@!EC2_IP!
echo.
echo Once connected, run:
echo.
echo ========== COPY & PASTE THIS ==========
echo.
echo curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/loversai/main/deploy.sh ^| bash
echo.
echo ========================================
echo.
pause

ssh -i "!KEY_PATH!" !EC2_USER!@!EC2_IP!
