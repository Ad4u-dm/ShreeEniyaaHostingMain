# 🪟 Windows - Bluetooth Thermal Printing Setup

## Overview

For Windows PCs/laptops, Bluetooth thermal printing is straightforward using COM ports.

---

## ✅ Quick Setup (Windows)

### Step 1: Pair Bluetooth Printer

1. Open **Settings** → **Devices** → **Bluetooth & other devices**
2. Click **"Add Bluetooth or other device"**
3. Select **Bluetooth**
4. Find your thermal printer (e.g., "SHREYANS")
5. Click to pair
6. Enter PIN if prompted (usually `0000` or `1234`)
7. Wait for "Connected" status

### Step 2: Find COM Port

1. Open **Device Manager** (Right-click Start → Device Manager)
2. Expand **"Ports (COM & LPT)"**
3. Look for your Bluetooth printer
4. Note the COM port number (e.g., `COM3`, `COM5`)

   ![Device Manager Screenshot](https://i.imgur.com/example.png)

**Alternative method:**
```powershell
# In PowerShell
Get-WMIObject Win32_SerialPort | Select-Object Name, DeviceID
```

### Step 3: Create Windows Bridge

Create `scripts/bridge-windows.js`:

```javascript
#!/usr/bin/env node

/**
 * Windows Bluetooth Print Bridge
 * Uses SerialPort to communicate via COM ports
 */

const express = require('express');
const cors = require('cors');
const { SerialPort } = require('serialport');

const app = express();
const PORT = process.env.BRIDGE_PORT || 9000;

// Configuration
const CONFIG = {
  comPort: process.env.COM_PORT || 'COM3',  // Change to your port
  baudRate: 9600,
  retryAttempts: 3,
  retryDelay: 1000,
};

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const COMMANDS = {
  INIT: `${ESC}@`,
  ALIGN_CENTER: `${ESC}a1`,
  ALIGN_LEFT: `${ESC}a0`,
  BOLD_ON: `${ESC}E1`,
  BOLD_OFF: `${ESC}E0`,
  SIZE_NORMAL: `${GS}!0`,
  SIZE_DOUBLE: `${GS}!17`,
  CUT_PAPER: `${GS}V66\x00`,
  LINE_FEED: '\n',
};

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Logging
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

// Print to COM port
async function printToComPort(data) {
  return new Promise((resolve, reject) => {
    const port = new SerialPort({
      path: CONFIG.comPort,
      baudRate: CONFIG.baudRate,
      autoOpen: false
    });

    port.open((err) => {
      if (err) {
        return reject(new Error(`Failed to open ${CONFIG.comPort}: ${err.message}`));
      }

      log(`✅ Opened COM port: ${CONFIG.comPort}`);

      port.write(data, (err) => {
        if (err) {
          port.close();
          return reject(new Error(`Write error: ${err.message}`));
        }

        log(`✅ Wrote ${Buffer.byteLength(data)} bytes to printer`);

        // Wait for data to be sent
        port.drain((err) => {
          port.close();
          
          if (err) {
            return reject(new Error(`Drain error: ${err.message}`));
          }

          log('📴 Closed COM port');
          resolve({ success: true, bytesWritten: Buffer.byteLength(data) });
        });
      });
    });

    port.on('error', (err) => {
      log(`❌ Port error: ${err.message}`);
      port.close();
      reject(err);
    });
  });
}

// Retry wrapper
async function withRetry(fn, attempts = CONFIG.retryAttempts) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
      log(`⚠️ Attempt ${i + 1} failed, retrying in ${CONFIG.retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
    }
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Bluetooth Thermal Print Bridge (Windows)',
    version: '1.0.0-windows',
    comPort: CONFIG.comPort,
    baudRate: CONFIG.baudRate,
    platform: 'Windows',
    timestamp: new Date().toISOString()
  });
});

// List COM ports
app.get('/ports', async (req, res) => {
  try {
    const { SerialPort } = require('serialport');
    const ports = await SerialPort.list();
    
    log(`Found ${ports.length} COM port(s)`);
    
    res.json({
      success: true,
      ports: ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        pnpId: port.pnpId,
        friendlyName: port.friendlyName
      }))
    });
  } catch (error) {
    log('❌ Error listing ports:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Print endpoint
app.post('/print', async (req, res) => {
  try {
    log('📥 Received print request');

    let printData;
    
    if (typeof req.body === 'string') {
      printData = req.body;
    } else if (req.body.data) {
      printData = req.body.data;
    } else {
      printData = JSON.stringify(req.body);
    }

    if (!printData) {
      return res.status(400).json({
        success: false,
        error: 'No print data provided'
      });
    }

    log(`📄 Print data size: ${Buffer.byteLength(printData)} bytes`);

    // Add initialization and cut commands
    const fullData = COMMANDS.INIT + printData + '\n\n\n' + COMMANDS.CUT_PAPER;

    // Print with retry
    const result = await withRetry(() => printToComPort(fullData));

    log('✅ Print job completed successfully');

    res.json({
      success: true,
      message: 'Print job sent successfully',
      bytesWritten: result.bytesWritten,
      comPort: CONFIG.comPort,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log('❌ Print error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: error.message.includes('open') 
        ? `Check if ${CONFIG.comPort} is correct and not in use`
        : 'Check if printer is powered on and connected',
      timestamp: new Date().toISOString()
    });
  }
});

// Test print endpoint
app.post('/test', async (req, res) => {
  try {
    log('🧪 Test print requested');

    const testReceipt = 
      COMMANDS.INIT +
      COMMANDS.ALIGN_CENTER +
      COMMANDS.SIZE_DOUBLE +
      COMMANDS.BOLD_ON +
      'TEST RECEIPT\n' +
      COMMANDS.SIZE_NORMAL +
      COMMANDS.BOLD_OFF +
      '\n' +
      COMMANDS.ALIGN_LEFT +
      'Bridge: Windows Bluetooth\n' +
      'COM Port: ' + CONFIG.comPort + '\n' +
      'Baud Rate: ' + CONFIG.baudRate + '\n' +
      'Time: ' + new Date().toLocaleString() + '\n' +
      'Status: OK\n' +
      '\n' +
      COMMANDS.ALIGN_CENTER +
      'If you can read this,\n' +
      'the bridge is working!\n' +
      '\n' +
      '================================\n' +
      '\n\n\n' +
      COMMANDS.CUT_PAPER;

    await withRetry(() => printToComPort(testReceipt));

    log('✅ Test print completed');

    res.json({
      success: true,
      message: 'Test print sent successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    log('❌ Test print error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Make sure printer is paired and COM port is correct'
    });
  }
});

// Setup guide endpoint
app.get('/setup', (req, res) => {
  res.json({
    title: 'Windows Bluetooth Printer Setup Guide',
    steps: [
      {
        step: 1,
        title: 'Pair Printer',
        instructions: [
          'Open Settings → Devices → Bluetooth',
          'Click "Add Bluetooth or other device"',
          'Select your thermal printer',
          'Enter PIN (usually 0000 or 1234)'
        ]
      },
      {
        step: 2,
        title: 'Find COM Port',
        instructions: [
          'Open Device Manager',
          'Expand "Ports (COM & LPT)"',
          'Note the COM port number (e.g., COM3)'
        ]
      },
      {
        step: 3,
        title: 'Configure Bridge',
        command: 'set COM_PORT=COM3 && node scripts/bridge-windows.js',
        note: 'Replace COM3 with your actual port'
      },
      {
        step: 4,
        title: 'Test Connection',
        command: 'curl -X POST http://127.0.0.1:9000/test',
        note: 'Should print a test receipt'
      }
    ],
    troubleshooting: {
      'Port not found': 'Check Device Manager for correct COM port',
      'Access denied': 'Close other apps using the COM port',
      'Connection failed': 'Verify printer is paired and powered on',
      'Invalid baud rate': 'Try 9600, 19200, or 115200'
    }
  });
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log('\n' + '='.repeat(60));
  console.log('🖨️  Bluetooth Thermal Print Bridge (Windows)');
  console.log('='.repeat(60));
  console.log(`✅ Server running on http://127.0.0.1:${PORT}`);
  console.log(`📍 COM Port: ${CONFIG.comPort}`);
  console.log(`📊 Baud Rate: ${CONFIG.baudRate}`);
  console.log('\nTo change COM port:');
  console.log(`  set COM_PORT=COM5 && node scripts\\bridge-windows.js`);
  console.log('\nAvailable endpoints:');
  console.log(`  GET  /health      - Health check`);
  console.log(`  GET  /ports       - List all COM ports`);
  console.log(`  GET  /setup       - Setup instructions`);
  console.log(`  POST /print       - Print ESC/POS data`);
  console.log(`  POST /test        - Print test receipt`);
  console.log('\nPress Ctrl+C to stop');
  console.log('='.repeat(60) + '\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  log('\n👋 Shutting down print bridge...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  log('❌ Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  log('❌ Unhandled rejection:', error);
});
```

### Step 4: Install SerialPort

```powershell
# In PowerShell (as Administrator)
cd C:\path\to\invoify
npm install serialport
```

### Step 5: Configure and Start

```powershell
# Set your COM port
$env:COM_PORT="COM3"  # Change to your port

# Start the bridge
node scripts\bridge-windows.js

# Test it
curl.exe -X POST http://127.0.0.1:9000/test
```

---

## 🚀 Running as Windows Service

### Option 1: Using NSSM (Recommended)

**NSSM (Non-Sucking Service Manager)** - Makes any app a Windows service

1. **Download NSSM**:
   - https://nssm.cc/download
   - Extract to `C:\nssm\`

2. **Install Service**:
   ```powershell
   # Run as Administrator
   cd C:\nssm\win64
   
   # Install service
   .\nssm.exe install InvoifyPrintBridge "C:\Program Files\nodejs\node.exe" "C:\path\to\invoify\scripts\bridge-windows.js"
   
   # Set environment variable
   .\nssm.exe set InvoifyPrintBridge AppEnvironmentExtra COM_PORT=COM3
   
   # Start service
   .\nssm.exe start InvoifyPrintBridge
   ```

3. **Manage Service**:
   ```powershell
   # Check status
   .\nssm.exe status InvoifyPrintBridge
   
   # Stop
   .\nssm.exe stop InvoifyPrintBridge
   
   # Remove
   .\nssm.exe remove InvoifyPrintBridge confirm
   ```

### Option 2: Using PM2 (Cross-Platform)

```powershell
# Install PM2 globally
npm install -g pm2
npm install -g pm2-windows-service

# Set COM port
$env:COM_PORT="COM3"

# Start bridge
pm2 start scripts\bridge-windows.js --name print-bridge

# Install as Windows service
pm2-service-install

# Save configuration
pm2 save

# Service will now start on boot!
```

---

## 🔧 Automated Installer Script

Create `install-windows.ps1`:

```powershell
# Windows Bluetooth Print Bridge Installer
# Run as Administrator

Write-Host "=== Invoify Print Bridge Installer ===" -ForegroundColor Green

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "Please run as Administrator!" -ForegroundColor Red
    exit
}

# Install Node.js if not present
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Node.js..." -ForegroundColor Yellow
    winget install OpenJS.NodeJS.LTS
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Install PM2
Write-Host "Installing PM2..." -ForegroundColor Yellow
npm install -g pm2
npm install -g pm2-windows-service

# Get COM port from user
$comPort = Read-Host "Enter your Bluetooth printer COM port (e.g., COM3)"

# Set environment variable
[System.Environment]::SetEnvironmentVariable('COM_PORT', $comPort, [System.EnvironmentVariableTarget]::Machine)

# Start PM2 service
Write-Host "Installing print bridge service..." -ForegroundColor Yellow
pm2-service-install -n PM2

# Start bridge
pm2 start scripts\bridge-windows.js --name print-bridge
pm2 save

Write-Host "`n=== Installation Complete! ===" -ForegroundColor Green
Write-Host "Print bridge is now running on port 9000" -ForegroundColor Green
Write-Host "`nTest with: curl.exe -X POST http://127.0.0.1:9000/test" -ForegroundColor Cyan
Write-Host "`nManage service with PM2:" -ForegroundColor Cyan
Write-Host "  pm2 status" -ForegroundColor White
Write-Host "  pm2 logs print-bridge" -ForegroundColor White
Write-Host "  pm2 restart print-bridge" -ForegroundColor White
```

**Usage:**
```powershell
# Right-click PowerShell → Run as Administrator
cd C:\path\to\invoify
.\install-windows.ps1
```

---

## 📋 Quick Commands Reference

```powershell
# Find COM ports
Get-WMIObject Win32_SerialPort | Select-Object Name, DeviceID

# Set COM port
$env:COM_PORT="COM3"

# Start bridge manually
node scripts\bridge-windows.js

# Start as service (PM2)
pm2 start scripts\bridge-windows.js --name print-bridge
pm2 save

# Check service status
pm2 status
pm2 logs print-bridge

# Test print
curl.exe -X POST http://127.0.0.1:9000/test

# List available ports
curl.exe http://127.0.0.1:9000/ports

# Health check
curl.exe http://127.0.0.1:9000/health
```

---

## 🐛 Troubleshooting Windows

### "Port COM3 is not available"

**Solution:**
```powershell
# List all ports
curl.exe http://127.0.0.1:9000/ports

# Or use Device Manager to find correct port
# Then update:
$env:COM_PORT="COM5"
pm2 restart print-bridge
```

### "Access is denied"

**Causes:**
- Another app is using the COM port
- Permissions issue

**Solution:**
```powershell
# Check what's using the port
netstat -ano | findstr :9000

# Kill process if needed
taskkill /PID <process_id> /F

# Run PowerShell as Administrator
```

### "Cannot find module 'serialport'"

**Solution:**
```powershell
npm install serialport
# If that fails, install build tools:
npm install --global windows-build-tools
npm install serialport
```

### Printer doesn't print

**Solution:**
```powershell
# 1. Check if printer is paired
# Settings → Devices → Bluetooth

# 2. Verify COM port
# Device Manager → Ports (COM & LPT)

# 3. Test with echo command
echo "Test" > COM3

# 4. Try different baud rates
$env:BAUD_RATE="19200"
pm2 restart print-bridge
```

---

## 🎯 Production Deployment (Windows PCs)

### For Multiple Windows PCs:

1. **Create deployment package**:
   ```powershell
   # On your development PC
   cd invoify
   npm run build
   
   # Create installer
   npm install -g electron-builder
   npm run build:windows
   
   # This creates: dist/invoify-setup.exe
   ```

2. **Deploy to other PCs**:
   - Copy `invoify-setup.exe` to USB or network share
   - Run installer on each PC
   - Pair Bluetooth printer
   - Run `install-windows.ps1` script

3. **Centralized management** (optional):
   - Use Group Policy to deploy
   - Or use tools like PDQ Deploy, SCCM

---

## ✅ Comparison: Windows vs Linux vs Android

| Feature | Windows | Linux | Android |
|---------|---------|-------|---------|
| Setup Difficulty | ⭐⭐ Easy | ⭐⭐⭐ Medium | ⭐⭐⭐⭐ Hard |
| Bluetooth Support | ✅ Excellent | ✅ Good | ⚠️ Limited |
| Auto-start | ✅ NSSM/PM2 | ✅ systemd | ⚠️ Termux |
| Reliability | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Performance | Fast | Fast | Medium |

---

## 💡 Recommended for Your Business

**For Cash Counter PCs (Windows):**
- Use the **Windows Service** approach (PM2 or NSSM)
- Install once, runs automatically on boot
- Most reliable for business use

**For Portable/Tablet (Android):**
- Use **Print Service App** (paid)
- Or **Termux** for advanced users

**For Development (Linux):**
- Use **bridge-simple.js** with /dev/rfcomm0

---

## 📞 Support

**Check logs:**
```powershell
# PM2 logs
pm2 logs print-bridge

# Windows Event Viewer
eventvwr.msc
```

**Test connection:**
```powershell
curl.exe -X POST http://127.0.0.1:9000/test
```

