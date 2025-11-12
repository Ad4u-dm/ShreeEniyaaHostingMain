# 📱 Android Phone - Bluetooth Thermal Printing Setup

## Overview

For Android phones, you have **3 options** to enable Bluetooth thermal printing from your web app:

---

## ✅ Option 1: Termux + Node.js Bridge (RECOMMENDED)

**Best for:** Technical users who want full control

### Step 1: Install Termux
1. Download **Termux** from F-Droid (not Play Store - Play Store version is outdated)
   - Link: https://f-droid.org/en/packages/com.termux/
2. Install the app

### Step 2: Setup Termux Environment
```bash
# Update packages
pkg update && pkg upgrade

# Install Node.js
pkg install nodejs-lts

# Install Git (optional, for cloning your repo)
pkg install git

# Give Termux storage access
termux-setup-storage
```

### Step 3: Install Your App
```bash
# Clone your repository
cd ~/storage/shared
git clone <your-repo-url>
cd invoify

# Install dependencies
npm install

# Or copy files manually from PC to phone
# Files will be in: /storage/emulated/0/
```

### Step 4: Create Android-Specific Bridge

Create `scripts/bridge-android.js`:
```javascript
#!/usr/bin/env node

/**
 * Android Bluetooth Print Bridge (Termux)
 * Uses direct Bluetooth socket connection
 */

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const net = require('net');
const execAsync = promisify(exec);

const app = express();
const PORT = 9000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const COMMANDS = {
  INIT: `${ESC}@`,
  CUT_PAPER: `${GS}V66\x00`,
};

// Print using Bluetooth RFCOMM
async function printViaBluetoothSocket(data, printerMAC) {
  return new Promise((resolve, reject) => {
    // Android Termux can use bluetoothctl or direct RFCOMM
    const channel = 1; // SPP channel (usually 1)
    
    // Create RFCOMM connection
    const socket = new net.Socket();
    
    // On Android Termux, Bluetooth devices are accessible via:
    // /dev/socket/bluetooth or using bluetoothctl
    
    // Alternative: Use bluetoothctl
    const cmd = `echo "${data}" | bluetoothctl -- send ${printerMAC}`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ success: true, output: stdout });
    });
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'Android (Termux)',
    message: 'Print bridge running on Android'
  });
});

// Print endpoint
app.post('/print', async (req, res) => {
  try {
    const { data } = req.body;
    const fullData = COMMANDS.INIT + data + '\n\n\n' + COMMANDS.CUT_PAPER;
    
    const printerMAC = process.env.PRINTER_MAC || 'XX:XX:XX:XX:XX:XX';
    
    await printViaBluetoothSocket(fullData, printerMAC);
    
    res.json({ success: true, message: 'Printed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🖨️ Android Print Bridge running on port ${PORT}`);
  console.log('Access from Chrome: http://127.0.0.1:9000');
});
```

### Step 5: Start Bridge and App
```bash
# Terminal 1: Start print bridge
cd ~/storage/shared/invoify
export PRINTER_MAC=XX:XX:XX:XX:XX:XX
node scripts/bridge-android.js

# Terminal 2: Start Next.js app (in Termux)
npm run dev

# Now open Chrome on your phone:
# http://127.0.0.1:3000
```

### Step 6: Keep Running in Background
```bash
# Install PM2 for background processes
npm install -g pm2

# Start bridge in background
pm2 start scripts/bridge-android.js --name print-bridge

# Auto-start on Termux launch
pm2 startup
pm2 save
```

---

## ✅ Option 2: Use Android Print Service (Simpler)

**Best for:** Non-technical users who want simplicity

### Step 1: Install Print Service App
Use a third-party print service that creates a local HTTP endpoint:

**Recommended Apps:**
1. **PrintHand** (Paid, $5)
   - Creates HTTP print server
   - Supports ESC/POS printers
   - Link: https://play.google.com/store/apps/details?id=android.printservice.printhand

2. **Printer Share** (Free tier available)
   - Similar functionality
   - Can accept HTTP requests

### Step 2: Configure App
1. Install and open the app
2. Add your Bluetooth thermal printer
3. Enable "Print Server" mode
4. Note the local IP and port (e.g., `http://192.168.1.100:8080`)

### Step 3: Update Your Bridge URL
In your web app, change the bridge URL to match the print service:

```javascript
// In app/receipt/thermal/[id]/page.tsx
const BRIDGE_URL = 'http://192.168.1.100:8080/print'; // Your print service URL
```

---

## ✅ Option 3: PWA + Web Share API (Future-Proof)

**Best for:** Progressive Web App approach

### Step 1: Convert to PWA
Add a manifest and service worker to your Next.js app.

### Step 2: Use Android Intent
Create a share handler that triggers Android's print dialog:

```javascript
// In your print function
async function printViaPWA(receiptData) {
  if (navigator.share) {
    // Use Web Share API to share with print apps
    await navigator.share({
      title: 'Print Receipt',
      text: receiptData,
      // Some print apps can handle shared text
    });
  } else {
    // Fallback
    window.print();
  }
}
```

---

## 🔧 Comparison: Android Options

| Option | Difficulty | Cost | Offline | Control |
|--------|-----------|------|---------|---------|
| Termux + Node.js | Hard | Free | ✅ Yes | Full |
| Print Service App | Easy | $5-10 | ✅ Yes | Limited |
| PWA + Share | Medium | Free | ⚠️ Partial | Medium |

---

## 💡 Recommended Setup for Your Use Case

Since you're running a billing app on Android tablets/phones, I recommend:

### **For Business Deployment:**
Use **Option 2 (Print Service App)**
- Easy to set up for staff
- Reliable and tested
- One-time cost per device
- No technical knowledge required

### **For Personal/Development:**
Use **Option 1 (Termux)**
- Free and powerful
- Full control
- Can run your entire Next.js app on the phone

---

## 📲 Quick Start (Termux Method)

```bash
# 1. Install Termux from F-Droid
# 2. Open Termux and run:

pkg update && pkg upgrade -y
pkg install nodejs-lts git -y
termux-setup-storage

# 3. Clone your project
cd ~/storage/shared
git clone <your-repo> invoify
cd invoify
npm install

# 4. Set printer MAC
export PRINTER_MAC=XX:XX:XX:XX:XX:XX

# 5. Start everything
npm run dev:all

# 6. Open Chrome on phone
# http://127.0.0.1:3000
```

---

## 🐛 Troubleshooting Android

### Termux: "Cannot find module"
```bash
cd ~/storage/shared/invoify
npm install
```

### Termux: "Permission denied"
```bash
termux-setup-storage
# Then restart Termux
```

### Can't access from Chrome
- Make sure bridge is running: `curl http://127.0.0.1:9000/health`
- Check firewall isn't blocking port 9000
- Use `127.0.0.1` not `localhost`

### Bluetooth connection fails
```bash
# Check if printer is paired
termux-bluetooth-scan

# Connect manually
bluetoothctl connect XX:XX:XX:XX:XX:XX
```

---

## 🎯 Production Deployment (Android Tablets)

For deploying to multiple Android tablets in your business:

1. **Setup once on one tablet using Termux**
2. **Create a backup/clone**:
   ```bash
   # In Termux
   cd ~
   tar -czf invoify-setup.tar.gz .termux storage/shared/invoify
   # Copy this file to other tablets
   ```

3. **Or use MDM (Mobile Device Management)**:
   - Tools like AirWatch, MobileIron
   - Can deploy apps and configurations
   - Useful for 5+ devices

---

## 📞 Need Help?

Check logs:
```bash
# Termux
cd ~/storage/shared/invoify
cat ~/.pm2/logs/print-bridge-out.log
```

Test connection:
```bash
curl -X POST http://127.0.0.1:9000/test
```

