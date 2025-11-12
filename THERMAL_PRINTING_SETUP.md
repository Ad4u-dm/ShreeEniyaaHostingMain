# 🖨️ Bluetooth Thermal Printing Setup Guide

## Overview

This guide explains how to enable **direct Bluetooth thermal printing** from your Invoify web application to a Shreyans 80mm ESC/POS thermal printer (or any Bluetooth SPP-compatible thermal printer).

### Architecture

```
┌─────────────────┐      HTTP       ┌──────────────────┐      Bluetooth      ┌─────────────┐
│   Web Browser   │ ─────────────>  │  Print Bridge    │  ─────────────────> │  Thermal    │
│  (Your Phone)   │   Port 9000     │  (Node.js)       │   SPP Protocol      │  Printer    │
└─────────────────┘                 └──────────────────┘                      └─────────────┘
```

**Key Components:**
1. **Frontend (Next.js)**: Invoice pages with "Print via Bluetooth" button
2. **Print Bridge (Node.js)**: Local server that communicates with Bluetooth printer
3. **ESC/POS API**: Generates thermal receipt commands

---

## 📋 Prerequisites

- **Printer**: Shreyans 80mm Bluetooth Thermal Printer (or any ESC/POS compatible)
- **Device**: Android phone, tablet, or PC with Bluetooth
- **Node.js**: v16 or higher
- **Bluetooth**: Printer must be paired with your device

---

## 🔧 Installation

### Step 1: Install Dependencies

Navigate to your project root and install the required packages:

```bash
npm install express cors bluetooth-serial-port
```

**Package Details:**
- `express`: HTTP server framework
- `cors`: Enable cross-origin requests from your web app
- `bluetooth-serial-port`: Bluetooth SPP communication library

### Step 2: Pair Your Printer

#### On Android:
1. Go to **Settings** → **Bluetooth**
2. Turn on Bluetooth
3. Search for devices
4. Find **"SHREYANS"** (or your printer name)
5. Tap to pair
6. Enter PIN: `0000` or `1234` (default for most thermal printers)
7. Wait for "Connected" status

#### On Windows/Linux/macOS:
1. Open Bluetooth settings
2. Add new device
3. Select your thermal printer
4. Enter pairing code if prompted
5. Verify connection

**Note:** Make sure the printer is powered on and within Bluetooth range (10 meters).

---

## 🚀 Starting the Print Bridge

### Option 1: Manual Start

From your project root:

```bash
node scripts/bridge.js
```

You should see:

```
============================================================
🖨️  Bluetooth Thermal Print Bridge
============================================================
✅ Server running on http://127.0.0.1:9000
🔍 Looking for printer: "SHREYANS"

Available endpoints:
  GET  /health      - Health check
  GET  /devices     - List Bluetooth devices
  POST /print       - Print ESC/POS data
  POST /test        - Print test receipt

Press Ctrl+C to stop
============================================================
```

### Option 2: Using npm Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "bridge": "node scripts/bridge.js",
    "bridge:dev": "nodemon scripts/bridge.js"
  }
}
```

Then run:

```bash
npm run bridge
```

---

## 🧪 Testing the Connection

### Method 1: Web Test Page

1. Open `test-thermal-print.html` in your browser:
   ```bash
   # If you have a local server running:
   open http://localhost:3000/test-thermal-print.html
   
   # Or open directly:
   open test-thermal-print.html
   ```

2. Click **"Send Test Receipt"**
3. If successful, your printer should print a test receipt

### Method 2: Command Line Test

Use `curl` to test the bridge:

```bash
# Check if bridge is running
curl http://127.0.0.1:9000/health

# Print test receipt
curl -X POST http://127.0.0.1:9000/test

# List Bluetooth devices
curl http://127.0.0.1:9000/devices
```

### Method 3: From Your Web App

1. Start your Next.js app: `npm run dev`
2. Navigate to any invoice page
3. Click **"Print via Bluetooth"**
4. The receipt should print automatically

---

## ⚙️ Configuration

### Environment Variables

You can configure the bridge using environment variables:

```bash
# Set custom printer name
export PRINTER_NAME="SHREYANS"

# Set printer MAC address (optional, auto-detect if not set)
export PRINTER_MAC="XX:XX:XX:XX:XX:XX"

# Start bridge
node scripts/bridge.js
```

### Finding Your Printer's MAC Address

#### On Android (using ADB):
```bash
adb shell dumpsys bluetooth_manager | grep -A 10 "Bonded devices"
```

#### Using the Bridge:
```bash
# Start the bridge and check the logs
node scripts/bridge.js

# In another terminal:
curl http://127.0.0.1:9000/devices
```

The response will show all paired Bluetooth devices with their MAC addresses.

---

## 📱 Using from Your Web App

### Frontend Usage

The thermal receipt page (`/receipt/thermal/[id]`) already has Bluetooth printing integrated:

1. **Auto-Detection**: Page checks if bridge is available on load
2. **Smart Button**: 
   - Shows "Print via Bluetooth" if bridge is online
   - Shows "Print to Thermal Printer" (browser dialog) if bridge is offline
3. **Status Indicator**: Green badge when bridge is connected
4. **Fallback**: Automatically falls back to browser print if Bluetooth fails

### Manual Integration

If you want to add Bluetooth printing to other pages:

```typescript
async function printReceipt(invoiceId: string) {
  try {
    // 1. Get ESC/POS data from API
    const response = await fetch('/api/invoice/escpos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId })
    });
    
    const { data } = await response.json();
    
    // 2. Send to bridge
    const printResponse = await fetch('http://127.0.0.1:9000/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
    
    const result = await printResponse.json();
    
    if (result.success) {
      alert('Printed successfully!');
    }
  } catch (error) {
    console.error('Print failed:', error);
    // Fallback to browser print
    window.print();
  }
}
```

---

## 🔍 Troubleshooting

### Problem: Bridge says "Printer not found"

**Solution:**
1. Ensure printer is paired via Bluetooth settings
2. Verify printer is powered on
3. Check printer name matches (default: "SHREYANS")
4. Try listing devices: `curl http://127.0.0.1:9000/devices`
5. Set MAC address manually:
   ```bash
   export PRINTER_MAC="XX:XX:XX:XX:XX:XX"
   node scripts/bridge.js
   ```

### Problem: "Connection refused" or bridge offline

**Solution:**
1. Check if bridge is running: `curl http://127.0.0.1:9000/health`
2. Start the bridge: `node scripts/bridge.js`
3. Check port 9000 is not in use: `lsof -i :9000` (macOS/Linux)
4. Verify firewall isn't blocking port 9000

### Problem: Printer prints garbage characters

**Solution:**
1. Ensure printer supports ESC/POS commands
2. Check printer encoding settings
3. Verify Bluetooth connection is stable
4. Try test print: `curl -X POST http://127.0.0.1:9000/test`

### Problem: Prints but doesn't cut paper

**Solution:**
1. Verify printer has auto-cutter feature
2. Check cutter is enabled in printer settings
3. The bridge automatically sends cut command (`GS V66`)
4. Some printers require different cut commands - check manual

### Problem: Bluetooth connection drops frequently

**Solution:**
1. Move device closer to printer (< 5 meters)
2. Remove obstacles between device and printer
3. Restart both device and printer
4. Re-pair the Bluetooth connection
5. Disable Bluetooth power saving (Android: Developer Options)

### Problem: "Permission denied" on Linux

**Solution:**
```bash
# Add user to dialout/bluetooth group
sudo usermod -a -G dialout $USER
sudo usermod -a -G bluetooth $USER

# Restart session
logout
# or reboot
```

---

## 📊 API Reference

### Bridge Endpoints

#### GET `/health`
Check if bridge is running

**Response:**
```json
{
  "status": "ok",
  "service": "Bluetooth Thermal Print Bridge",
  "version": "1.0.0",
  "printer": "SHREYANS",
  "timestamp": "2025-11-11T10:30:00.000Z"
}
```

#### GET `/devices`
List all paired Bluetooth devices

**Response:**
```json
{
  "success": true,
  "devices": [
    {
      "address": "XX:XX:XX:XX:XX:XX",
      "name": "SHREYANS"
    }
  ]
}
```

#### POST `/print`
Print ESC/POS data

**Request:**
```json
{
  "data": "ESC/POS command string"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Print job sent successfully",
  "bytesWritten": 256,
  "timestamp": "2025-11-11T10:30:00.000Z"
}
```

#### POST `/test`
Print a test receipt

**Response:**
```json
{
  "success": true,
  "message": "Test print sent successfully",
  "timestamp": "2025-11-11T10:30:00.000Z"
}
```

---

## 🔐 Security Considerations

### CORS Protection
The bridge only accepts requests from:
- `http://localhost:3000`
- `http://127.0.0.1:3000`

To add more origins, edit `scripts/bridge.js`:

```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.1.100:3000'],
  credentials: true
}));
```

### Network Access
- Bridge listens on `127.0.0.1` (localhost only)
- Not accessible from external network
- Safe for local development and production use

### Authentication (Optional)
For production, add token-based auth:

```javascript
// In bridge.js
const AUTH_TOKEN = process.env.BRIDGE_TOKEN || 'your-secret-token';

app.use((req, res, next) => {
  const token = req.headers['authorization'];
  if (token !== `Bearer ${AUTH_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

---

## 📦 Packaging as Executable (Optional)

To create a standalone executable:

### Install `pkg`:
```bash
npm install -g pkg
```

### Create executable:
```bash
# For current platform
pkg scripts/bridge.js

# For specific platforms
pkg scripts/bridge.js --targets node16-linux-x64,node16-win-x64,node16-macos-x64
```

### Distribute:
1. Copy the executable to user's device
2. User just runs: `./bridge` (no Node.js required!)
3. Add to startup (optional):
   - **Windows**: Add to `shell:startup`
   - **Linux**: Add to `~/.config/autostart/`
   - **macOS**: Add to Login Items

---

## 🎯 Best Practices

### For Development:
1. Always start bridge before testing: `npm run bridge`
2. Keep bridge terminal open to see logs
3. Use test page for quick validation
4. Check bridge health endpoint regularly

### For Production:
1. Use `pm2` or similar process manager:
   ```bash
   npm install -g pm2
   pm2 start scripts/bridge.js --name "print-bridge"
   pm2 save
   pm2 startup
   ```

2. Monitor bridge logs:
   ```bash
   pm2 logs print-bridge
   ```

3. Auto-restart on crash:
   ```bash
   pm2 restart print-bridge --max-restarts 10
   ```

### For Users:
1. Provide simple installer script
2. Include printer pairing instructions
3. Add desktop shortcut to start bridge
4. Create troubleshooting guide

---

## 📝 Example ESC/POS Commands

### Basic Formatting:
```javascript
const ESC = '\x1B';
const GS = '\x1D';

// Bold text
const boldOn = ESC + 'E1';
const boldOff = ESC + 'E0';

// Center align
const alignCenter = ESC + 'a1';

// Double size
const doubleSize = GS + '!17';

// Cut paper
const cutPaper = GS + 'V66\x00';

// Example receipt
const receipt = 
  alignCenter +
  doubleSize + boldOn +
  'MY STORE\n' +
  boldOff +
  'Thank you!\n' +
  cutPaper;
```

---

## 🆘 Support

### Logs Location:
- Bridge logs: Console output (or PM2 logs if using PM2)
- Web app logs: Browser console (F12 → Console)

### Getting Help:
1. Check bridge status: `curl http://127.0.0.1:9000/health`
2. Review logs for error messages
3. Test with `test-thermal-print.html`
4. Verify printer works with other apps (RawBT, etc.)

### Common Issues:
- ❌ **Bridge offline**: Start with `node scripts/bridge.js`
- ❌ **Printer not found**: Check pairing and printer name
- ❌ **No print output**: Test with `/test` endpoint first
- ❌ **Partial prints**: Check Bluetooth signal strength

---

## ✅ Quick Start Checklist

- [ ] Node.js installed
- [ ] Dependencies installed (`npm install`)
- [ ] Printer paired via Bluetooth
- [ ] Bridge started (`node scripts/bridge.js`)
- [ ] Bridge health check passed (`curl http://127.0.0.1:9000/health`)
- [ ] Test print successful (`curl -X POST http://127.0.0.1:9000/test`)
- [ ] Web app can connect to bridge
- [ ] Invoice prints correctly

---

## 🎉 Success!

Once everything is set up:
1. Your users can print invoices with one click
2. No third-party apps needed (RawBT, etc.)
3. Works on any device with Bluetooth
4. Completely web-based solution

**Happy Printing! 🖨️✨**
