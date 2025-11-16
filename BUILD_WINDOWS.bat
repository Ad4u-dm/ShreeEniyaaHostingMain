@echo off
:: 🏗️ Windows Build Script for Invoify Chit Fund Management
:: Run this script on Windows to build the desktop application

echo =========================================
echo 🏦 INVOIFY - WINDOWS BUILD SCRIPT
echo =========================================
echo.

:: Check if Node.js is installed
echo 📋 Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found!
    echo 📦 Please install Node.js from: https://nodejs.org/
    echo 💡 Download the LTS version and try again
    pause
    exit /b 1
) else (
    echo ✅ Node.js found!
    node --version
)

echo.
echo 📦 Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ⚛️ Building Next.js application...
call npm run build:standalone
if errorlevel 1 (
    echo ❌ Failed to build Next.js app
    pause
    exit /b 1
)

echo.
echo 🖥️ Building Windows executable...
call npx electron-builder --win --x64 --publish=never
if errorlevel 1 (
    echo ❌ Failed to build Windows app
    echo 💡 Try running as Administrator or check antivirus
    pause
    exit /b 1
)

echo.
echo ✅ BUILD COMPLETED SUCCESSFULLY!
echo.
echo 📁 Your Windows app is ready in the 'release' folder:
dir release\*.exe 2>nul

echo.
echo 🎉 Installation Files Created:
echo    📦 Installer: release\*.exe
echo    📁 Portable: release\win-unpacked\

echo.
echo 🚀 Next Steps:
echo    1. Double-click the .exe installer to install
echo    2. Or copy the portable version to any Windows PC
echo    3. Run the app and start managing your chit fund business!

echo.
echo 💡 If Windows shows security warning:
echo    - Right-click .exe → Properties → Unblock
echo    - Or click "More info" → "Run anyway"

echo.
pause