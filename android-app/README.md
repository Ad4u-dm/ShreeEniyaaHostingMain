# Invoify Bridge - Android Bluetooth Printing App

## Overview

This is a native Android app that runs a background service to handle Bluetooth thermal printing for the Invoify web application.

## Features

- ✅ Background HTTP server on port 9000
- ✅ Bluetooth SPP (Serial Port Profile) printing
- ✅ ESC/POS thermal printer support
- ✅ Auto-start on device boot
- ✅ Persistent notification
- ✅ Simple printer pairing UI
- ✅ Works with Chrome browser
- ✅ Free and open-source

## Architecture

```
Web App (Chrome) → HTTP (localhost:9000) → Bridge Service → Bluetooth → Thermal Printer
```

## Project Structure

```
android-app/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/shreeiniyaa/invoifybridge/
│   │   │   │   ├── MainActivity.kt              # Settings UI
│   │   │   │   ├── PrinterService.kt            # Background service
│   │   │   │   ├── HttpServer.kt                # Port 9000 server
│   │   │   │   ├── BluetoothManager.kt          # Bluetooth SPP
│   │   │   │   ├── BootReceiver.kt              # Auto-start
│   │   │   │   └── EscPosGenerator.kt           # ESC/POS helper
│   │   │   ├── res/                             # UI layouts
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   └── build.gradle
├── gradle/
├── settings.gradle
└── README.md
```

## Building

See [BUILD_GUIDE.md](./BUILD_GUIDE.md) for detailed instructions.

Quick build:
```bash
# Open in Android Studio
# Build → Build Bundle(s) / APK(s) → Build APK(s)
# APK will be in: app/build/outputs/apk/release/
```

## Installation

1. Enable "Install from Unknown Sources" on Android device
2. Download `InvoifyBridge.apk`
3. Install the APK
4. Open app and pair your Bluetooth printer
5. Tap "Start Service"
6. Done! Service runs in background

## Usage

After installation:
1. Open Chrome browser on Android
2. Navigate to your Invoify website
3. Go to receipt print page
4. Click "Print" button
5. Receipt prints automatically via Bluetooth!

## Permissions

This app requires:
- `BLUETOOTH` - Connect to printers
- `BLUETOOTH_ADMIN` - Discover devices
- `BLUETOOTH_CONNECT` (Android 12+) - Pair with printers
- `BLUETOOTH_SCAN` (Android 12+) - Find nearby devices
- `FOREGROUND_SERVICE` - Run in background
- `RECEIVE_BOOT_COMPLETED` - Auto-start on boot
- `INTERNET` - Local HTTP server (localhost only)

## API Endpoints

The service exposes these endpoints on `http://127.0.0.1:9000`:

### Health Check
```
GET /health
Response: { "status": "ok", "printer": "connected/disconnected" }
```

### Print Receipt
```
POST /print
Body: { "data": "ESC/POS commands as string" }
Response: { "success": true } or { "success": false, "error": "..." }
```

### Get Paired Devices
```
GET /devices
Response: { "devices": [{ "name": "...", "address": "..." }] }
```

### Test Print
```
POST /test
Response: { "success": true }
```

## Compatibility

- **Minimum Android Version:** 6.0 (API 23)
- **Target Android Version:** 14 (API 34)
- **Tested on:** Android 8-14
- **Printer Protocol:** ESC/POS via Bluetooth SPP

## License

MIT License - Free for commercial use

## Support

For issues or questions:
- Check troubleshooting section in BUILD_GUIDE.md
- Review app logs in Android Studio
- Contact: support@shreeiniyaa.com

## Credits

Developed for Shree Eniyaa Chitfunds  
Built with ❤️ for seamless thermal printing
