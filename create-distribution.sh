#!/bin/bash

# 📦 Create Client Distribution Package
# Creates a professional package for chit fund clients with both architectures

echo "📦 Creating client distribution package..."

# Check if builds exist
if [ ! -d "release" ]; then
    echo "❌ No builds found! Run './build-installer.sh' first"
    exit 1
fi

# Create distribution folder
DIST_DIR="Invoify-ChitFund-Distribution"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

echo "🏗️ Packaging client files..."

# Copy installers
if ls release/*x64*.exe 1> /dev/null 2>&1; then
    cp release/*x64*.exe "$DIST_DIR/Invoify-64bit-Installer.exe"
    echo "✅ 64-bit installer: Invoify-64bit-Installer.exe"
fi

if ls release/*ia32*.exe 1> /dev/null 2>&1; then
    cp release/*ia32*.exe "$DIST_DIR/Invoify-32bit-Installer.exe"
    echo "✅ 32-bit installer: Invoify-32bit-Installer.exe"
fi

# Copy portable versions if they exist
if [ -d "release/win-unpacked-x64" ]; then
    cp -r "release/win-unpacked-x64" "$DIST_DIR/Invoify-64bit-Portable"
    echo "✅ 64-bit portable: Invoify-64bit-Portable/"
fi

if [ -d "release/win-unpacked-ia32" ]; then
    cp -r "release/win-unpacked-ia32" "$DIST_DIR/Invoify-32bit-Portable"
    echo "✅ 32-bit portable: Invoify-32bit-Portable/"
fi

# Create client instruction file
cat > "$DIST_DIR/INSTALLATION_GUIDE.txt" << 'EOF'
🏦 INVOIFY - CHIT FUND MANAGEMENT SYSTEM
📋 Installation Guide for Windows

══════════════════════════════════════════════════════════════════

🎯 STEP 1: CHECK YOUR WINDOWS VERSION
   
   Method 1: Right-click "This PC" → Properties
   Method 2: Press Windows + R → type "msinfo32" → Enter
   
   Look for "System Type":
   📱 "x64-based PC" = 64-bit system
   💻 "x86-based PC" = 32-bit system

══════════════════════════════════════════════════════════════════

🚀 STEP 2: CHOOSE THE RIGHT INSTALLER

   📱 64-bit Windows (Most modern PCs):
      → Run: Invoify-64bit-Installer.exe
      
   💻 32-bit Windows (Older PCs):
      → Run: Invoify-32bit-Installer.exe
      
   ❓ Not sure? Try 64-bit first, if it fails use 32-bit

══════════════════════════════════════════════════════════════════

🛡️ STEP 3: BYPASS WINDOWS SECURITY (IF NEEDED)

   If Windows shows "Can't run this app" or SmartScreen warning:
   
   🔧 Method 1 (Easiest):
      1. Right-click the installer
      2. Select "Properties"
      3. Check "Unblock" at the bottom
      4. Click "OK" 
      5. Run installer normally
      
   🔧 Method 2 (If warning appears):
      1. Click "More info" 
      2. Click "Run anyway"
      
   🔧 Method 3 (Windows Defender):
      1. Open Windows Security
      2. Virus & threat protection
      3. Exclusions → Add folder
      4. Add the Invoify installation folder

══════════════════════════════════════════════════════════════════

✅ STEP 4: INSTALLATION PROCESS

   📦 Installer Version:
      1. Run the installer as Administrator (right-click → "Run as administrator")
      2. Follow installation wizard
      3. Desktop shortcut will be created
      4. App starts automatically after install
      
   📁 Portable Version (No installation needed):
      1. Copy the Invoify-XXbit-Portable folder to your PC
      2. Double-click "invoify.exe" inside the folder
      3. App starts immediately

══════════════════════════════════════════════════════════════════

🌐 STEP 5: ACCESS THE APPLICATION

   After installation/startup:
   
   🔗 The app will open in your default web browser automatically
   📍 URL: http://localhost:3000
   
   📊 Dashboard Features:
      ✅ Manage chit fund plans
      ✅ Track member payments  
      ✅ Generate receipts
      ✅ Print thermal receipts
      ✅ Works offline (no internet needed for daily use)
      ✅ Auto-syncs when internet available

══════════════════════════════════════════════════════════════════

🔧 TROUBLESHOOTING

   ❌ "This app can't run on your PC"
      → Try the other architecture (32-bit vs 64-bit)
      → Follow Step 3 security bypass steps
      
   ❌ App won't start
      → Check Windows version (needs Windows 7 SP1 or newer)
      → Install Visual C++ Redistributables from Microsoft
      
   ❌ Browser doesn't open
      → Manually open: http://localhost:3000
      
   ❌ Database errors
      → Run as Administrator once
      → Check antivirus is not blocking the app

══════════════════════════════════════════════════════════════════

📞 SUPPORT INFORMATION

   🏢 Company: Shree Eniyaa Chitfunds Private Limited
   📧 Email: [Your support email]
   📱 Phone: [Your support number]
   🌐 Website: [Your website]
   
   💡 For technical assistance:
      - Send screenshot of any error messages
      - Mention your Windows version
      - Specify which installer you used

══════════════════════════════════════════════════════════════════

🎉 ENJOY YOUR CHIT FUND MANAGEMENT SYSTEM!

   After successful installation, you can:
   ✅ Create and manage chit fund plans
   ✅ Enroll members and track payments
   ✅ Generate professional receipts
   ✅ Print receipts on thermal printers
   ✅ Send SMS notifications (with DLT setup)
   ✅ Export data to Excel
   ✅ Work completely offline
   
   The system is designed for reliable daily chit fund operations.

══════════════════════════════════════════════════════════════════
EOF

# Create a simple batch file for auto-detection
cat > "$DIST_DIR/AutoInstall.bat" << 'EOF'
@echo off
title Invoify Auto Installer
echo ========================================
echo  INVOIFY - CHIT FUND MANAGEMENT SYSTEM
echo ========================================
echo.
echo 🔍 Detecting your Windows architecture...

REM Check if we're on 64-bit Windows
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" goto INSTALL64
if "%PROCESSOR_ARCHITEW6432%"=="AMD64" goto INSTALL64

REM Default to 32-bit
echo 💻 32-bit Windows detected
echo 🚀 Starting 32-bit installer...
if exist "Invoify-32bit-Installer.exe" (
    start "" "Invoify-32bit-Installer.exe"
) else (
    echo ❌ 32-bit installer not found!
    pause
)
goto END

:INSTALL64
echo 📱 64-bit Windows detected  
echo 🚀 Starting 64-bit installer...
if exist "Invoify-64bit-Installer.exe" (
    start "" "Invoify-64bit-Installer.exe"
) else (
    echo ❌ 64-bit installer not found!
    echo 💡 Trying 32-bit installer as fallback...
    if exist "Invoify-32bit-Installer.exe" (
        start "" "Invoify-32bit-Installer.exe"
    ) else (
        echo ❌ No installers found!
        pause
    )
)

:END
echo.
echo ✅ Installation started!
echo 📖 Check INSTALLATION_GUIDE.txt for help
timeout /t 5
EOF

# Copy the startup batch file
cp "START_INVOIFY.bat" "$DIST_DIR/" 2>/dev/null || echo "⚠️  START_INVOIFY.bat not found, creating basic version..."

if [ ! -f "$DIST_DIR/START_INVOIFY.bat" ]; then
    cat > "$DIST_DIR/START_INVOIFY.bat" << 'EOF'
@echo off
echo 🏦 Starting Invoify Chit Fund Management System...
echo.
echo 🔍 Looking for Invoify application...

if exist "C:\Program Files\Invoify\invoify.exe" (
    start "" "C:\Program Files\Invoify\invoify.exe"
    echo ✅ Invoify started from Program Files
) else if exist "C:\Program Files (x86)\Invoify\invoify.exe" (
    start "" "C:\Program Files (x86)\Invoify\invoify.exe"  
    echo ✅ Invoify started from Program Files (x86)
) else (
    echo ❌ Invoify not found in standard locations
    echo 💡 Please run the installer first or use portable version
    pause
)

echo.
echo 🌐 Open your browser to: http://localhost:3000
timeout /t 10
EOF
fi

# Create zip archive
if command -v zip &> /dev/null; then
    echo "📦 Creating ZIP archive..."
    zip -r "${DIST_DIR}.zip" "$DIST_DIR"
    echo "✅ Created: ${DIST_DIR}.zip"
fi

echo ""
echo "🎉 Client distribution package ready!"
echo ""
echo "📁 Distribution folder: $DIST_DIR/"
echo "📦 ZIP package: ${DIST_DIR}.zip"
echo ""
echo "📋 Package contents:"
ls -la "$DIST_DIR/"
echo ""
echo "🚚 Ready to distribute to chit fund clients!"
echo ""
echo "📞 Give clients the complete folder or ZIP file"
echo "📖 They should start with INSTALLATION_GUIDE.txt"
echo "🚀 Or use AutoInstall.bat for automatic detection"