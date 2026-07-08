@echo off
echo ==============================================================
echo Lovers AI Local Development Setup (Frontend and Backend)
echo ==============================================================

REM 1. Start Node.js Backend
echo [1/2] Starting Node.js backend (Port 5000)...
start cmd /k "cd backend && echo Installing backend dependencies... && npm install && echo Starting Express server... && npm run dev"

REM 2. Start React Frontend
echo [2/2] Start React frontend...
start cmd /k "cd frontend && echo Installing frontend dependencies... && npm install && echo Starting React development server... && npm start"

echo.
echo ==============================================================
echo Development environment initialized!
echo Two separate command windows will open to install dependencies and run the servers.
echo ==============================================================
echo.
pause
