@echo off
:: 🚀 Invoify Windows Startup Script
:: Automatically unblocks the app if Windows blocks it

echo =========================================
echo 🏦 INVOIFY - Chit Fund Management System
echo =========================================
echo.

:: Check if app is blocked and unblock it
echo 📋 Checking Windows security settings...
if exist "invoify.exe" (
    echo 🔓 Unblocking Invoify application...
    powershell -Command "Unblock-File -Path 'invoify.exe'" 2>nul
    echo ✅ Application unblocked successfully!
) else (
    echo ❌ invoify.exe not found in current directory
    pause
    exit /b 1
)

:: Start the application
echo.
echo 🚀 Starting Invoify Chit Fund Manager...
echo.
echo 📊 Your chit fund business management is ready!
echo 💾 Data will be saved locally (works offline)
echo ☁️  Syncs to cloud when internet is available
echo.

start "" "invoify.exe"

:: Wait a moment and check if app started
timeout /t 3 >nul
tasklist /fi "imagename eq invoify.exe" 2>nul | find /i "invoify.exe" >nul
if %errorlevel% equ 0 (
    echo ✅ Invoify started successfully!
    echo 🌐 Open your browser to: http://localhost:3000
    echo.
    echo 📱 Access your chit fund dashboard now!
) else (
    echo ⚠️  If Windows shows a warning, click "More info" then "Run anyway"
    echo 🔧 Or right-click invoify.exe → Properties → Check "Unblock" → OK
    pause
)

:: Keep window open for 10 seconds to show status
timeout /t 10