#!/bin/bash

# Function to clean up background processes on exit
cleanup() {
  echo ""
  echo "🛑 Stopping Lovers AI backend (PID: $BACKEND_PID)..."
  kill $BACKEND_PID 2>/dev/null
  exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM to ensure clean termination of both processes
trap cleanup SIGINT SIGTERM

echo "🚀 Starting Lovers AI Local Development (Frontend & Backend)..."

# 1. Start Backend in the background
echo "📦 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Give backend a moment to initialize
sleep 2

# 2. Start Frontend in the foreground
echo "💻 Starting frontend server..."
cd frontend
npm start
