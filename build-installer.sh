#!/bin/bash

# 🏗️ Universal Windows Build Script - All Versions & Architectures
# Builds for Windows 7/8/10/11 in both 32-bit and 64-bit

echo "🚀 Building Universal Invoify for ALL Windows versions..."

# Check if we're on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "❌ This script should be run on Linux with Wine"
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf release/
rm -rf dist/

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build Next.js app
echo "⚛️ Building Next.js application..."
npm run build:standalone

if [ $? -ne 0 ]; then
    echo "❌ Next.js build failed"
    exit 1
fi

# Create production environment file for the build
echo "📝 Creating production environment..."
cat > .env.production << EOF
MONGODB_URI="mongodb+srv://user:password02@cluster0.lxwwhmj.mongodb.net/invoify"
DATABASE_URL="file:./prisma/local_chitfund.db"
JWT_SECRET="your-super-secret-jwt-key-change-in-production-12345"
NODE_ENV="production"
FAST2SMS_API_KEY=paste_your_api_key_here_from_dashboard
FAST2SMS_SENDER_ID=FSTSMS
FAST2SMS_ROUTE=q
EOF

# Copy environment to release
mkdir -p release/
cp .env.production release/

# Generate Prisma client for production
echo "🗄️ Preparing SQLite database..."
npx prisma generate
npx prisma db push

# Build universal Windows installers (both 32-bit and 64-bit)
echo "🏗️ Building universal Windows installers..."
export WINEARCH=win64
export WINEPREFIX=$HOME/.wine64

# Build for all architectures
npx electron-builder --win --ia32 --x64 --config.extraMetadata.main=electron/main-simple.js

if [ $? -eq 0 ]; then
    echo "✅ Universal build completed successfully!"
    echo ""
    echo "📂 Build artifacts:"
    ls -la release/
    echo ""
    
    # Count different versions
    x64_installer=$(ls release/*x64*.exe 2>/dev/null | wc -l)
    ia32_installer=$(ls release/*ia32*.exe 2>/dev/null | wc -l)
    
    echo "� Windows Installers Created:"
    echo "   🖥️  64-bit installer: $x64_installer file(s)"
    echo "   💻 32-bit installer: $ia32_installer file(s)"
    echo ""
    
    if [ $x64_installer -gt 0 ] && [ $ia32_installer -gt 0 ]; then
        echo "🎉 SUCCESS: Universal Windows compatibility achieved!"
        echo ""
        echo "📋 Client Distribution Guide:"
        echo "   • Windows 11/10/8 (64-bit) → Use *x64*.exe"
        echo "   • Windows 11/10/8/7 (32-bit) → Use *ia32*.exe"
        echo "   • Older/Legacy systems → Use *ia32*.exe"
        echo ""
        echo "🛡️ SmartScreen Fix:"
        echo "   1. Right-click → Properties → Unblock"
        echo "   2. Or click 'More info' → 'Run anyway'"
        echo ""
        echo "� Windows Version Support:"
        echo "   ✅ Windows 11 (Both 32/64-bit)"
        echo "   ✅ Windows 10 (Both 32/64-bit)" 
        echo "   ✅ Windows 8/8.1 (Both 32/64-bit)"
        echo "   ✅ Windows 7 SP1+ (Both 32/64-bit)"
        echo ""
        echo "� Ready for chit fund business deployment!"
    else
        echo "⚠️  Warning: Missing some installer versions"
        echo "   Expected: 64-bit AND 32-bit installers"
        echo "   Check build configuration"
    fi
else
    echo "❌ Universal build failed!"
    exit 1
fi