# Invoify Windows Desktop App - Build & Installation Guide

## Overview
This guide explains how to build and install the Invoify Windows desktop application with thermal printing support and data synchronization.

## Features
- ✅ **Standalone Desktop App** - No internet required for basic operations
- ✅ **Thermal Printer Support** - Direct printing to USB/Bluetooth thermal printers
- ✅ **Data Sync** - Automatic daily sync with online server
- ✅ **Offline Mode** - Works without internet, syncs when connected
- ✅ **Windows Installer** - Easy NSIS installer with desktop shortcuts

## Prerequisites

### For Building
- Node.js 18+ (https://nodejs.org/)
- npm or yarn
- Windows 10/11 (64-bit)

### For Running
- Windows 10/11 (64-bit)
- Thermal Printer (USB or Bluetooth)
- Optional: Internet connection for data sync

## Build Instructions

### Step 1: Install Dependencies
```bash
cd /media/newvolume/PP/billing_app/invoify
npm install
```

### Step 2: Build Next.js App
```bash
npm run build
```

### Step 3: Build Windows Installer
```bash
npm run build:windows
```

This will create:
- `dist/Invoify Setup x.x.x.exe` - Windows installer
- `dist/win-unpacked/` - Unpacked application files

### Alternative: Build Portable Version
```bash
npm run build:windows:portable
```

## Installation

### For End Users
1. Download `Invoify Setup.exe` from the dist folder
2. Run the installer
3. Follow the installation wizard
4. Choose installation directory (default: `C:\Users\<Username>\AppData\Local\Programs\Invoify`)
5. Create desktop shortcut (recommended)
6. Launch Invoify

### First-Time Setup
1. Launch Invoify
2. Go to Settings → Thermal Printer
3. Select your printer from the list
4. Test print to verify
5. Configure data sync (optional)

## Thermal Printing Setup

### Supported Printers
- USB thermal printers (58mm, 80mm)
- Bluetooth thermal printers (paired via Windows)
- ESC/POS compatible printers

### Configuration Steps
1. **USB Printers:**
   - Connect printer via USB
   - Install manufacturer drivers (if required)
   - Printer will appear in Windows Devices and Printers
   - Select in Invoify settings

2. **Bluetooth Printers:**
   - Pair printer with Windows:
     - Settings → Devices → Bluetooth
     - Add Bluetooth device
     - Select your printer
     - Enter PIN (usually 0000 or 1234)
   - Printer will appear as COM port
   - Select in Invoify settings

### No Bridge Required! 
Unlike the web version, the Windows desktop app **does NOT need** the Bluetooth bridge. It connects directly to printers via Windows drivers.

### Testing
1. Open Invoify
2. Create/open an invoice
3. Click "Print" button
4. Receipt should print immediately

## Data Sync

### How It Works
- **Daily Auto-Sync**: Automatically syncs data every 24 hours
- **Manual Sync**: Click "Sync Now" in settings
- **Offline Storage**: All data stored locally in:
  - `C:\Users\<Username>\AppData\Roaming\Invoify\data\`

### Sync Features
- Invoices
- Customers
- Payments
- Plans
- Settings

### Sync Status
Check sync status in the app:
- Last sync time displayed in dashboard
- Green icon: Synced
- Yellow icon: Pending sync
- Red icon: Sync error

## Troubleshooting

### App Won't Start
1. Check Windows Event Viewer for errors
2. Delete `%APPDATA%\Invoify` folder
3. Reinstall the application
4. Check antivirus isn't blocking

### Printer Not Found
1. Verify printer is installed in Windows
2. Check: Control Panel → Devices and Printers
3. Test print from Notepad
4. Restart Invoify
5. Select printer in settings again

### Sync Errors
1. Check internet connection
2. Verify server is accessible
3. Check firewall settings
4. Try manual sync
5. Check app logs in `%APPDATA%\Invoify\logs\`

### Performance Issues
1. Close other applications
2. Check available RAM (minimum 4GB recommended)
3. Disable antivirus temporarily
4. Clear app cache: Settings → Advanced → Clear Cache

## File Locations

### Installation
- Default: `C:\Users\<Username>\AppData\Local\Programs\Invoify\`
- Portable: Wherever you extract the ZIP

### User Data
- `C:\Users\<Username>\AppData\Roaming\Invoify\data\` - Database and sync files
- `C:\Users\<Username>\AppData\Roaming\Invoify\logs\` - Application logs
- `C:\Users\<Username>\AppData\Roaming\Invoify\settings.json` - App settings

### Backup
To backup your data:
1. Close Invoify
2. Copy `%APPDATA%\Invoify\data` folder
3. Store in safe location
4. Restore by replacing folder

## Development

### Run in Development Mode
```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start Electron in dev mode
npm run electron:dev
```

### Debug Mode
1. Press F12 in the app to open DevTools
2. Check Console for errors
3. Check Network tab for API calls

## Uninstallation

### Standard Uninstall
1. Windows Settings → Apps & Features
2. Find "Invoify"
3. Click Uninstall
4. Follow prompts

### Complete Uninstall (with data)
1. Uninstall via Windows Settings
2. Delete `%APPDATA%\Invoify` folder
3. Delete `%LOCALAPPDATA%\Programs\Invoify` folder
4. Delete desktop shortcut

## Support

### Logs Location
Check logs for errors:
- `%APPDATA%\Invoify\logs\main.log`
- `%APPDATA%\Invoify\logs\renderer.log`

### Contact Support
- Email: shreeniyaachitfunds@gmail.com
- Phone: 96266 66527 / 90035 62126

## Version History

### v1.0.0 (Current)
- Initial Windows desktop release
- Thermal printing support
- Data sync functionality
- Offline mode
- NSIS installer

## License
Copyright © 2025 Shree Eniyaa Chitfunds (P) Ltd.
All rights reserved.
