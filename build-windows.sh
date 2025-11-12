#!/bin/bash

# Invoify Windows Build Script
# This script builds the Windows desktop application

set -e  # Exit on error

echo "════════════════════════════════════════════════════════"
echo "  Invoify Windows Desktop App - Build Script"
echo "════════════════════════════════════════════════════════"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Step 1: Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf .next/
echo "✅ Clean complete"
echo ""

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Step 3: Build Next.js app
echo "🔨 Building Next.js application..."
npm run build
echo "✅ Next.js build complete"
echo ""

# Step 4: Build Electron app for Windows
echo "🪟 Building Windows executable..."
npm run build:windows
echo "✅ Windows build complete"
echo ""

# Display results
echo "════════════════════════════════════════════════════════"
echo "  Build Complete! 🎉"
echo "════════════════════════════════════════════════════════"
echo ""
echo "Output files:"
echo "  📁 dist/Invoify Setup *.exe    - Windows Installer"
echo "  📁 dist/win-unpacked/           - Unpacked application"
echo ""
echo "Next steps:"
echo "  1. Test the installer: ./dist/Invoify Setup *.exe"
echo "  2. Distribute to users"
echo "  3. See WINDOWS_BUILD_GUIDE.md for details"
echo ""
echo "════════════════════════════════════════════════════════"
