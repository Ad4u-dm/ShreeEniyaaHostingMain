# Arduino Testing Guide - Complete Phone-to-Arduino Print Flow

This guide shows how to test the complete printing system using just an Arduino (no Bluetooth module needed).

## 🎯 What This Tests

Your **Android app** → **Computer bridge** → **Arduino USB emulator** → **Serial Monitor display**

This simulates the exact flow that will happen with a real Bluetooth printer, but using USB instead.

## 📋 Prerequisites

- Arduino board (Uno, Nano, Mega, etc.)
- USB cable
- Computer with Node.js installed
- Android phone with Invoify Bridge app installed
- Phone and computer on same WiFi network

## 🔧 Setup Steps

### Step 1: Upload Arduino Sketch

1. Open Arduino IDE
2. Open `arduino/thermal-printer-emulator/thermal-printer-emulator.ino`
3. Select your Arduino board and port: **Tools → Board** and **Tools → Port**
4. Click **Upload** (→ button)
5. Wait for "Done uploading" message

### Step 2: Find Arduino Port

**On Linux:**
```bash
ls /dev/ttyACM* /dev/ttyUSB*
# Usually shows: /dev/ttyACM0 or /dev/ttyUSB0
```

**On macOS:**
```bash
ls /dev/cu.usb*
# Shows: /dev/cu.usbserial-XXXX or /dev/cu.usbmodemXXXX
```

**On Windows:**
```bash
# Check Device Manager → Ports (COM & LPT)
# Usually: COM3, COM4, etc.
```

### Step 3: Set Permissions (Linux only)

```bash
sudo chmod 666 /dev/ttyACM0
# Replace /dev/ttyACM0 with your actual port
```

### Step 4: Edit Bridge Script

Open `scripts/bridge-arduino.js` and update the port:

```javascript
const ARDUINO_PORT = '/dev/ttyACM0'; // Change to your port
```

### Step 5: Install Dependencies

```bash
npm install serialport
```

### Step 6: Start Bridge Server

```bash
node scripts/bridge-arduino.js
```

You should see:
```
╔════════════════════════════════════════════════════╗
║     ARDUINO USB SERIAL BRIDGE - RUNNING            ║
╚════════════════════════════════════════════════════╝

📡 HTTP Server: http://0.0.0.0:9000
🔌 Arduino Port: /dev/ttyACM0
📱 Connection Status: ✅ Connected

🌐 Access from phone using one of these IPs:
   http://192.168.1.100:9000/health
```

**Important:** Note your computer's IP address from this output!

### Step 7: Open Serial Monitor

1. In Arduino IDE: **Tools → Serial Monitor**
2. Set baud rate to **115200** (bottom right)
3. You should see:
```
╔════════════════════════════════════════════════════╗
║  THERMAL PRINTER EMULATOR - READY                  ║
║  Waiting for print data...                         ║
╚════════════════════════════════════════════════════╝
```

## 📱 Testing from Android App

### Test 1: Bridge Connection Test

1. Open **Chrome** on your Android phone
2. Navigate to: `http://<computer-ip>:9000/health`
   - Replace `<computer-ip>` with the IP shown in Step 6
   - Example: `http://192.168.1.100:9000/health`
3. You should see:
```json
{
  "status": "ok",
  "connected": true,
  "port": "/dev/ttyACM0",
  "message": "Arduino connected"
}
```

✅ **Success:** Bridge is working and Arduino is connected!

### Test 2: Test Print from Browser

1. In Chrome on your phone, navigate to:
   `http://<computer-ip>:9000/test`
2. You should see JSON response:
```json
{
  "success": true,
  "message": "Test print sent"
}
```

3. **Check Serial Monitor** - you should see:
```
🧪 Sending test print...
──────────────────────────────────────────────────

[INIT PRINTER]
[ALIGN CENTER]
TEST PRINT
Arduino Emulator
────────────────────────────────
[ALIGN LEFT]
Date: 11/11/2025, 9:02:00 PM

═══════════════ [PAPER CUT] ═══════════════
```

✅ **Success:** Computer bridge → Arduino communication working!

### Test 3: Print from Android App (Test Print Button)

**Note:** The Android app doesn't auto-detect WiFi bridges. We need to modify the app to connect to your computer instead of Bluetooth.

#### Option A: Manual Test via App's Test Print

Since your app is configured for Bluetooth, we'll test using the website instead (see Test 4).

#### Option B: Test Using curl (Advanced)

From your computer's terminal:

```bash
curl -X POST http://localhost:9000/test
```

Check Serial Monitor for output.

### Test 4: Print from Invoify Website

This is the **complete end-to-end test**:

1. **Start the bridge** (should already be running from Step 6)

2. **Open Invoify website** in Chrome on your Android phone:
   - Navigate to your Invoify website
   - Go to any receipt page

3. **Check bridge status** on the receipt page:
   - Since you're using USB (not Bluetooth), the website won't auto-detect
   - We need to modify the website code to point to your computer

4. **Alternative: Test API directly**

   Open Chrome on your phone and use the console:
   
   a. Go to your receipt page
   b. Open Chrome DevTools: `chrome://inspect`
   c. Run this in console:

   ```javascript
   fetch('http://192.168.1.100:9000/test', { method: 'POST' })
     .then(r => r.json())
     .then(console.log);
   ```

5. **Check Serial Monitor** - should show the test print output

## 🔧 Troubleshooting

### Arduino Not Connecting

**Problem:** `❌ Failed to open serial port`

**Solutions:**
- Check Arduino is connected via USB
- Verify port: `ls /dev/tty*` (Linux/Mac) or Device Manager (Windows)
- Update `ARDUINO_PORT` in `bridge-arduino.js`
- Fix permissions: `sudo chmod 666 /dev/ttyACM0`
- Close Arduino IDE Serial Monitor (can't share port)

### Bridge Not Accessible from Phone

**Problem:** Can't reach `http://<ip>:9000/health` from phone

**Solutions:**
- Ensure phone and computer on **same WiFi network**
- Check firewall allows port 9000:
  ```bash
  sudo ufw allow 9000/tcp  # Ubuntu/Debian
  sudo firewall-cmd --add-port=9000/tcp  # CentOS/Fedora
  ```
- Verify correct IP address: `ip addr show` (Linux) or `ifconfig` (Mac)
- Test from computer first: `curl http://localhost:9000/health`

### No Output in Serial Monitor

**Problem:** Bridge sends data but nothing appears in Serial Monitor

**Solutions:**
- Verify baud rate is **115200** in Serial Monitor
- Check you uploaded the correct Arduino sketch
- Try closing and reopening Serial Monitor
- Check Arduino's RX LED blinks when sending data

### Permission Denied Error

**Problem:** `Error: Permission denied, cannot open /dev/ttyACM0`

**Solution:**
```bash
# Temporary fix
sudo chmod 666 /dev/ttyACM0

# Permanent fix (add user to dialout group)
sudo usermod -a -G dialout $USER
# Then logout and login again
```

## 📊 Expected Output Examples

### Test Print Output:
```
[INIT PRINTER]
[ALIGN CENTER]
TEST PRINT
Arduino Emulator
────────────────────────────────
[ALIGN LEFT]
Date: 11/11/2025, 9:02:00 PM


═══════════════ [PAPER CUT] ═══════════════
```

### Actual Invoice Print Output:
```
[INIT PRINTER]
[ALIGN CENTER]
[BOLD ON] SHREE INIYAA FINANCE
[BOLD OFF] 
123 Main Street
City, State 12345
Phone: +91 98765 43210

[ALIGN LEFT]
================================
[BOLD ON] PAYMENT RECEIPT
[BOLD OFF] ================================

Receipt #: RCP-001234
Date: November 11, 2025
Customer: John Doe

--------------------------------
Description          Amount
--------------------------------
Monthly Payment      ₹5,000.00

--------------------------------
[ALIGN RIGHT]
[BOLD ON] Total: ₹5,000.00
[BOLD OFF] 
[ALIGN CENTER]

Thank you for your payment!



═══════════════ [PAPER CUT] ═══════════════
```

## 🎯 What This Proves

When you see output in Serial Monitor:

✅ **ESC/POS generation** - Website correctly generates printer commands  
✅ **HTTP communication** - Phone → Computer bridge working  
✅ **Serial transmission** - Computer → Arduino USB working  
✅ **Command parsing** - Arduino correctly interprets ESC/POS  

**This is exactly what will happen with the real Bluetooth printer**, just with Bluetooth instead of USB!

## 🚀 Next Steps

Once this works perfectly:

1. **With Client's Bluetooth Printer:**
   - Same ESC/POS commands will be sent
   - Android app will use Bluetooth SPP instead of WiFi
   - Printer will receive same data Arduino is receiving
   - Physical receipt will print

2. **Migration Path:**
   - Arduino test proves the ESC/POS commands are correct
   - No code changes needed for Bluetooth printer
   - Just pair printer in Android app and test

## 💡 Pro Tips

1. **Keep Serial Monitor Open** - You'll see exactly what the printer receives
2. **Save Test Outputs** - Screenshot Serial Monitor for comparison with actual printer
3. **Test Different Receipts** - Try various invoice formats to verify all layouts work
4. **Network Stability** - Ensure WiFi connection is stable during testing
5. **Debug Tool** - If real printer acts weird, compare its output with Arduino logs

## 🔄 Complete Test Workflow

```
📱 Android Phone (Chrome Browser)
    ↓
    HTTP Request to computer IP
    ↓
💻 Computer (bridge-arduino.js)
    ↓
    USB Serial Port
    ↓
🔌 Arduino (thermal-printer-emulator.ino)
    ↓
    ESC/POS Parser
    ↓
📺 Serial Monitor (readable output)
```

## 📝 Testing Checklist

- [ ] Arduino sketch uploaded successfully
- [ ] Serial Monitor shows "READY" message at 115200 baud
- [ ] Bridge script starts without errors
- [ ] Computer's IP address noted
- [ ] Phone can access `/health` endpoint
- [ ] `/test` endpoint prints to Serial Monitor
- [ ] ESC/POS commands appear correctly formatted
- [ ] Alignment commands work (LEFT/CENTER/RIGHT)
- [ ] Bold formatting detected
- [ ] Paper cut command appears at end
- [ ] Can print multiple times without errors

---

**You're now testing the complete print pipeline without needing the actual thermal printer!** 🎉

Once this works, switching to the real Bluetooth printer is just changing the transport layer (USB → Bluetooth). The ESC/POS commands remain identical.
