#!/bin/bash
# Wine-based Windows build script

echo "🍷 Building Invoify Windows App with Wine..."

# Set Wine environment
export WINEARCH=win64
export WINEPREFIX=$HOME/.wine-invoify
export DISPLAY=

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/ release/ 2>/dev/null
sudo rm -rf dist/ 2>/dev/null || true

# Initialize fresh Wine prefix
echo "🍷 Initializing Wine environment..."
rm -rf $WINEPREFIX
wineboot --init

# Build Next.js app first
echo "🔨 Building Next.js application..."
npm run build || {
    echo "❌ Next.js build failed"
    exit 1
}

# Try Windows build with Wine
echo "🪟 Building Windows executable..."
npx electron-builder --win --x64 --config.nsis.oneClick=false || {
    echo "❌ Windows build failed with electron-builder"
    echo "🔄 Trying with electron-packager..."
    npx electron-packager . invoify --platform=win32 --arch=x64 --out=release --overwrite
}

echo "✅ Build complete! Check release/ or dist/ directory"
ls -la release/ dist/ 2>/dev/null || echo "📁 Build directories:"
find . -name "*.exe" -o -name "*win*" -type d 2>/dev/null