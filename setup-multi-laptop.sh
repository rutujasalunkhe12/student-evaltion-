#!/bin/bash

# Multi-Laptop Setup Script for Student Evaluation System
# This script helps you set up the system for local network access

echo "======================================"
echo "Student Evaluation System Setup"
echo "======================================"
echo ""

# Get local IP address
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
else
    # Linux
    IP=$(hostname -I | awk '{print $1}')
fi

if [ -z "$IP" ]; then
    echo "Could not auto-detect IP. Please enter your laptop's IP address:"
    read -p "IP Address: " IP
fi

echo "Your Server IP: $IP"
echo ""
echo "Access from other laptops at:"
echo "  Frontend: http://$IP:3000"
echo "  API: http://$IP:3001"
echo ""

# Create .env file
cat > .env << EOF
## Frontend
# Public URL of the API server for network access
VITE_API_BASE_URL=http://$IP:3001

## API
# Postgres connection string (for production)
DATABASE_URL=postgresql://postgres:password@localhost:5432/eval_portal
# Port the API listens on
PORT=3001

## Optional
SESSION_SECRET=change-me
EOF

echo ".env configured for network access ✓"
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "pnpm not found. Installing with npm..."
    npm install -g pnpm
fi

echo "Starting API Server..."
echo "Open a new terminal window and run:"
echo "  cd Student-Evaluation-System"
echo "  pnpm --filter @workspace/api-server dev"
echo ""

echo "Starting Frontend Server..."
pnpm --filter @workspace/eval-portal dev

echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Access from other laptops:"
echo "  http://$IP:3000"
echo ""
echo "Login:"
echo "  Guide: guide1 / password123"
echo "  Student: CS2021001 / password123"
