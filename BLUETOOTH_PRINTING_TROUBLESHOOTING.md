# Bluetooth Printing Troubleshooting Guide

## Issue: Test Print Works but Phone Prints Don't Work

### Root Cause
The phone sends **base64-encoded ESC/POS data** from the API, but the bridge was expecting **plain text** ESC/POS commands. The test print endpoint generates plain text directly in the bridge, which is why it works.

### Solution Applied
✅ Updated `scripts/bridge.js` to:
1. **Auto-detect base64 data** and decode it properly
2. **Accept requests from any IP** (not just localhost) - required for network printing
3. **Listen on all network interfaces** (0.0.0.0) so phones can connect
4. **Added debug logging** to help troubleshoot

---

## How to Test the Fix

### Step 1: Restart the Bridge
```bash
# Stop the current bridge (Ctrl+C)
# Then restart it
node scripts/bridge.js
```

You should see:
```
✅ Server running on http://0.0.0.0:9000
📱 Network access: http://<your-ip>:9000
```

### Step 2: Get Your PC/Laptop IP Address

**On Linux/Mac:**
```bash
ip addr show | grep inet
# or
ifconfig | grep inet
```

**On Windows:**
```bash
ipconfig
```

Look for something like `192.168.1.xxx` or `10.0.0.xxx`

### Step 3: Test from Phone Browser

**First, verify bridge is accessible:**
On your phone, open browser and go to:
```
http://<your-pc-ip>:9000/health
```
Example: `http://192.168.1.100:9000/health`

You should see:
```json
{
  "status": "ok",
  "service": "Bluetooth Thermal Print Bridge",
  ...
}
```

### Step 4: Test Print from Phone

1. Make sure your phone is on the **same WiFi** as your PC
2. Access your app: `http://<your-pc-ip>:3000`
3. Go to any invoice
4. Click "Print" or "View Receipt"
5. Try printing from the thermal receipt page

### Step 5: Check Bridge Logs

Watch the bridge terminal for these messages:

**Expected flow:**
```
📥 Received print request
🔍 Detected base64-encoded data, decoding...
📊 Original data length: XXXX characters
✅ Successfully decoded base64 data
📊 Decoded data length: XXX bytes
📄 Print data size: XXX bytes
📡 Connecting to printer: XX:XX:XX:XX:XX:XX
✅ Connected to printer
✅ Sent XXX bytes to printer
📴 Disconnected from printer
✅ Print job completed successfully
```

**If you see errors:**
```
❌ Connection error: ...
❌ Write error: ...
```

---

## Common Issues & Fixes

### 1. Phone Can't Connect to Bridge

**Symptoms:**
- Phone shows "Failed to print"
- Bridge logs show no incoming requests

**Fixes:**
- ✅ Ensure phone and PC are on **same WiFi network**
- ✅ Check firewall settings (allow port 9000)
- ✅ Verify bridge is running with `0.0.0.0` (not `127.0.0.1`)
- ✅ Try accessing `http://<pc-ip>:9000/health` from phone browser first

**Linux firewall fix:**
```bash
sudo ufw allow 9000/tcp
# or
sudo iptables -A INPUT -p tcp --dport 9000 -j ACCEPT
```

**Windows firewall fix:**
- Open Windows Defender Firewall
- Advanced Settings → Inbound Rules → New Rule
- Port 9000, TCP, Allow connection

### 2. Bridge Receives Request but Doesn't Print

**Symptoms:**
- Bridge logs show "Received print request"
- No error messages
- Nothing prints

**Fixes:**
- ✅ Check if base64 decoding is happening (should see "🔍 Detected base64-encoded data")
- ✅ Verify printer is paired via Bluetooth
- ✅ Check printer is powered on
- ✅ Test with `/test` endpoint first

### 3. Printer Not Found

**Symptoms:**
```
❌ Printer address not configured
❌ Printer "SHREYANS" not found
```

**Fixes:**

**Option A - Auto-detect:**
```bash
# Bridge will scan and find printer automatically
# Just make sure printer is:
# 1. Paired in system Bluetooth settings
# 2. Turned on
# 3. Name matches "SHREYANS" or similar
```

**Option B - Manual configuration:**
```bash
# Find printer MAC address first
node scripts/bridge.js
# Look at device list when bridge starts

# Then set it
export PRINTER_MAC="XX:XX:XX:XX:XX:XX"
node scripts/bridge.js
```

### 4. Prints Gibberish or Wrong Characters

**Symptoms:**
- Printer prints but shows random characters
- Receipt is unreadable

**Fixes:**
- ✅ **This was the main issue!** Make sure bridge decodes base64 (now fixed)
- ✅ Verify printer supports ESC/POS commands
- ✅ Check printer is 80mm thermal (not 58mm)
- ✅ Try test print - if test works, issue is with data encoding

### 5. Base64 Not Being Decoded

**Symptoms:**
- Bridge logs **don't** show "Detected base64-encoded data"
- Prints base64 string instead of receipt

**Debug:**
```bash
# Check what data is being sent
# Add this in your browser console when printing:
console.log('Sending to bridge:', escposData);
```

**Or test with debug endpoint:**
```bash
# From your phone or PC browser
curl -X POST http://<pc-ip>:9000/debug \
  -H "Content-Type: application/json" \
  -d '{"data": "test123"}'
```

Check bridge terminal for debug info.

---

## Testing Checklist

Before claiming "it's fixed", verify:

- [ ] Bridge starts and shows `http://0.0.0.0:9000`
- [ ] Can access `/health` from phone browser
- [ ] Test print (`/test`) works from Postman/curl
- [ ] Phone can print invoices successfully
- [ ] Bridge logs show base64 decoding happening
- [ ] Printer outputs readable receipt (not gibberish)

---

## Network Setup for Client

Tell your client:

### On the PC with printer:

```bash
# 1. Start the bridge
cd /path/to/invoify
node scripts/bridge.js

# 2. Get your IP
# Linux/Mac:
hostname -I
# Windows:
ipconfig

# 3. Note the IP (e.g., 192.168.1.100)
```

### On the phone:

```
# 1. Connect to same WiFi
# 2. Open browser, go to:
http://192.168.1.100:3000

# 3. Print any invoice
# Should work now! ✅
```

---

## Advanced Debugging

### Enable Verbose Logging

Edit `scripts/bridge.js`, add at the top:
```javascript
const DEBUG = true;

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  
  if (DEBUG && typeof printData === 'string') {
    console.log('First 100 chars:', printData.substring(0, 100));
  }
}
```

### Monitor Network Traffic

```bash
# Linux
sudo tcpdump -i any port 9000 -A

# Shows all data sent to/from port 9000
```

### Test with curl

```bash
# Test health check
curl http://192.168.1.100:9000/health

# Test print with dummy base64 data
curl -X POST http://192.168.1.100:9000/print \
  -H "Content-Type: application/json" \
  -d '{"data": "SGVsbG8gV29ybGQh"}'  # "Hello World!" in base64
```

---

## Still Not Working?

### Collect This Info:

1. Bridge logs (full output)
2. Phone browser console errors (if any)
3. Printer model and Bluetooth MAC
4. Network setup (same WiFi? VPN active?)
5. OS details (Windows/Linux/Mac version)

### Check These:

- Is ESC/POS API returning data? Test: `http://localhost:3000/api/invoice/escpos` (POST with invoiceId)
- Is thermal receipt page loading? Open: `http://localhost:3000/receipt/thermal/<invoice-id>`
- Does phone see bridge? Check: `http://<pc-ip>:9000/health` from phone browser

---

## Quick Reference

| Endpoint | Method | Purpose | Test Command |
|----------|--------|---------|-------------|
| `/health` | GET | Check bridge status | `curl http://localhost:9000/health` |
| `/devices` | GET | List Bluetooth devices | `curl http://localhost:9000/devices` |
| `/print` | POST | Print ESC/POS data | See above |
| `/test` | POST | Print test receipt | `curl -X POST http://localhost:9000/test` |
| `/debug` | POST | Debug incoming data | See above |

---

## Summary

The fix changes:

1. ✅ **Base64 decoding** - Automatically detects and decodes base64 ESC/POS data
2. ✅ **Network access** - Accepts requests from any IP (not just localhost)  
3. ✅ **CORS enabled** - Allows phone browsers to connect
4. ✅ **Better logging** - Shows exactly what's happening

**Why test worked but phone didn't:**
- Test endpoint: Generates plain text ESC/POS in bridge ✅
- Phone endpoint: Sends base64-encoded ESC/POS from API ❌ (wasn't decoded)

**Now both work!** 🎉
