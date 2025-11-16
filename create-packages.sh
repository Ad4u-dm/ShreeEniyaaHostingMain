#!/bin/bash
# Create a simple ZIP and installer from Wine build

echo "📦 Creating distribution packages..."

cd /media/newvolume/PP/billing_app/invoify

# Create ZIP version (portable)
echo "🗜️ Creating ZIP package..."
cd release/
zip -r "invoify-portable-windows.zip" invoify-win32-x64/ > /dev/null 2>&1
echo "✅ ZIP created: $(ls -lh invoify-portable-windows.zip | awk '{print $5}') - invoify-portable-windows.zip"

# Create basic installer script
echo "🛠️ Creating installer script..."
cd invoify-win32-x64/
cat > install.bat << 'EOF'
@echo off
echo Installing Invoify - Chit Fund Management System...
echo.

REM Create program directory
if not exist "C:\Program Files\Invoify" mkdir "C:\Program Files\Invoify"

REM Copy files
echo Copying application files...
xcopy /E /Y . "C:\Program Files\Invoify\"

REM Create desktop shortcut
echo Creating desktop shortcut...
powershell "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\Invoify.lnk'); $Shortcut.TargetPath = 'C:\Program Files\Invoify\invoify.exe'; $Shortcut.IconLocation = 'C:\Program Files\Invoify\invoify.exe'; $Shortcut.Save()"

REM Create start menu entry
echo Creating Start Menu entry...
if not exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Invoify" mkdir "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Invoify"
powershell "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\Invoify\Invoify.lnk'); $Shortcut.TargetPath = 'C:\Program Files\Invoify\invoify.exe'; $Shortcut.Save()"

echo.
echo ✅ Installation complete!
echo 📱 Invoify has been installed to: C:\Program Files\Invoify
echo 🖥️ Desktop shortcut created
echo 📋 Start Menu entry created
echo.
echo To start Invoify:
echo - Double-click desktop shortcut, OR
echo - Search "Invoify" in Start Menu, OR  
echo - Run: C:\Program Files\Invoify\invoify.exe
echo.
pause
EOF

cd ../..
echo "✅ Basic installer script created"

# Show results
echo ""
echo "📊 Distribution Options Created:"
echo "1. 📁 ZIP Package (Portable): release/invoify-portable-windows.zip"
echo "2. 🛠️ Basic Installer: release/invoify-win32-x64/install.bat"
echo ""
echo "📤 Distribution Recommendations:"
echo "🎯 For Customers: Use ZIP (easier, no admin rights needed)"
echo "🏢 For Offices: Use Installer (more professional)"