#!/bin/bash

# Aviakul Finance ERP - Quick Setup Guide (Linux/Mac)

echo "=== Prerequisites Check ==="
echo ""

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✓ Found $NODE_VERSION"
else
    echo "✗ Not found"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✓ Found v$NPM_VERSION"
else
    echo "✗ Not found"
    exit 1
fi

# Check MongoDB
echo -n "Checking MongoDB... "
if command -v mongod &> /dev/null; then
    echo "✓ Found"
else
    echo "⚠ Not found or not in PATH"
    echo "Install MongoDB from https://www.mongodb.com/try/download/community"
fi

echo ""
echo "=== Installation ==="
echo ""

# Install dependencies
echo "Installing dependencies (this may take a few minutes)..."
echo ""

# Root dependencies
echo "[1/3] Installing root dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install root dependencies"
    exit 1
fi

# Server dependencies
echo ""
echo "[2/3] Installing server dependencies..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install server dependencies"
    cd ..
    exit 1
fi
cd ..

# Client dependencies
echo ""
echo "[3/3] Installing client dependencies..."
cd client
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install client dependencies"
    cd ..
    exit 1
fi
cd ..

echo ""
echo "✓ All dependencies installed successfully!"
echo ""

# Setup environment files
echo "=== Environment Configuration ==="
echo ""

# Server .env
if [ ! -f "server/.env" ]; then
    echo "Creating server/.env from template..."
    cp server/.env.example server/.env
    echo "✓ Created server/.env"
    echo "⚠ Please edit server/.env and set your configuration!"
else
    echo "✓ server/.env already exists"
fi

# Client .env
if [ ! -f "client/.env" ]; then
    echo "Creating client/.env from template..."
    cp client/.env.example client/.env
    echo "✓ Created client/.env"
else
    echo "✓ client/.env already exists"
fi

echo ""
echo "=== Next Steps ==="
echo ""
echo "1. Make sure MongoDB is running:"
echo "   mongod"
echo ""
echo "2. Seed the database:"
echo "   cd server"
echo "   npm run seed"
echo "   cd .."
echo ""
echo "3. Start the application:"
echo "   npm run dev"
echo ""
echo "4. Open your browser:"
echo "   http://localhost:3000"
echo ""
echo "5. Login with default credentials:"
echo "   Username: superadmin"
echo "   Password: Admin@123456"
echo ""
echo "⚠ IMPORTANT: Change the default password after first login!"
echo ""
echo "=== Setup Complete ==="
echo ""
echo "For detailed documentation, see README.md"
echo ""
