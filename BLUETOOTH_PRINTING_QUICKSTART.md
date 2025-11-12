# 🖨️ Bluetooth Thermal Printing - Quick Start

## For Developers

### 1. Install Dependencies
```bash
npm install
```

This will install:
- `bluetooth-serial-port` - For Bluetooth SPP communication
- `cors` - For cross-origin requests
- `express` - For the print bridge server

### 2. Pair Your Printer
- Go to Bluetooth settings
- Pair with your thermal printer (e.g., "SHREYANS")
- PIN: Usually `0000` or `1234`

### 3. Start the Print Bridge
```bash
npm run bridge
```

You should see:
```
✅ Server running on http://127.0.0.1:9000
🔍 Looking for printer: "SHREYANS"
```

### 4. Start Your App
In a separate terminal:
```bash
npm run dev
```

Or start both together:
```bash
npm run dev:all
```

### 5. Test Printing
Open the test page in your browser:
```
http://localhost:3000/test-thermal-print.html
```

Click "Send Test Receipt" - your printer should print!

---

## For End Users

### One-Time Setup

1. **Pair Printer** (Android/PC)
   - Settings → Bluetooth
   - Find "SHREYANS" or your printer name
   - Pair with PIN: 0000

2. **Install Node.js** (if not installed)
   - Download from: https://nodejs.org
   - Version 16 or higher

3. **Install App Dependencies**
   ```bash
   cd invoify
   npm install
   ```

### Daily Usage

#### Option 1: Manual Start
```bash
# Terminal 1: Start print bridge
npm run bridge

# Terminal 2: Start web app
npm run dev
```

#### Option 2: Start Both Together
```bash
npm run dev:all
```

#### Option 3: Background Service (Advanced)
```bash
# Install PM2
npm install -g pm2

# Start bridge as service
pm2 start scripts/bridge.js --name print-bridge

# Start on system boot
pm2 startup
pm2 save

# Now only start the web app
npm run dev
```

### Printing Invoices

1. Open any invoice in your app
2. Click the thermal receipt button
3. You'll see "Print via Bluetooth" button
4. Click it - receipt prints automatically!

---

## Troubleshooting

### Bridge won't start
```bash
# Check if port 9000 is in use
lsof -i :9000  # macOS/Linux
netstat -ano | findstr :9000  # Windows

# Kill process using port 9000 if needed
kill -9 <PID>
```

### Printer not found
```bash
# List all Bluetooth devices
curl http://127.0.0.1:9000/devices

# Set printer MAC manually
export PRINTER_MAC="XX:XX:XX:XX:XX:XX"
npm run bridge
```

### Print fails
```bash
# Test bridge connection
curl http://127.0.0.1:9000/health

# Test print
curl -X POST http://127.0.0.1:9000/test
```

---

## File Structure

```
invoify/
├── scripts/
│   └── bridge.js                    # Bluetooth print bridge server
├── app/
│   ├── api/
│   │   └── invoice/
│   │       ├── thermal/route.ts     # HTML receipt (browser print)
│   │       └── escpos/route.ts      # ESC/POS commands (Bluetooth)
│   └── receipt/
│       └── thermal/[id]/page.tsx    # Print page with Bluetooth support
├── test-thermal-print.html          # Test page for bridge
├── THERMAL_PRINTING_SETUP.md        # Detailed setup guide
└── package.json                     # Updated with bridge scripts
```

---

## Environment Variables (Optional)

Create `.env.local`:
```bash
# Printer configuration
PRINTER_NAME=SHREYANS
PRINTER_MAC=XX:XX:XX:XX:XX:XX

# Bridge configuration
BRIDGE_PORT=9000
BRIDGE_TOKEN=your-secret-token  # For auth (optional)
```

---

## Production Deployment

### As a Service (Linux)
```bash
# Create systemd service
sudo nano /etc/systemd/system/print-bridge.service
```

Add:
```ini
[Unit]
Description=Bluetooth Print Bridge
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/invoify
ExecStart=/usr/bin/node scripts/bridge.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable print-bridge
sudo systemctl start print-bridge
```

### As Windows Service
```bash
# Install node-windows
npm install -g node-windows

# Create install script
node install-windows-service.js
```

---

## Next Steps

- ✅ Read [THERMAL_PRINTING_SETUP.md](./THERMAL_PRINTING_SETUP.md) for detailed docs
- ✅ Test with `test-thermal-print.html`
- ✅ Configure auto-start on boot
- ✅ Customize receipt format in `app/api/invoice/escpos/route.ts`

**Need help?** Check the [troubleshooting section](./THERMAL_PRINTING_SETUP.md#troubleshooting) in the full guide.
