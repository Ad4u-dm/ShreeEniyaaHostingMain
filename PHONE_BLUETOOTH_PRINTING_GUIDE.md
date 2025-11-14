# Phone Bluetooth Printing Setup Guide

## Overview
This guide explains how to print thermal receipts directly from your phone's web browser to a Bluetooth thermal printer using the Invoify Bridge Android app.

## How It Works

```
Phone Browser → Invoify Website → Android Bridge App → Bluetooth Printer
```

1. **Phone Browser**: Open your invoicing website in Chrome/Safari
2. **Website**: Shows invoices and receipts  
3. **Android Bridge App**: Runs in background, receives print commands
4. **Bluetooth Printer**: Prints the receipt

## ⚠️ Important Prerequisites

### 1. Same WiFi Network
**Both devices MUST be connected to the SAME WiFi network:**
- ✅ Phone connected to: "MyOfficeWiFi"
- ✅ Android device with bridge connected to: "MyOfficeWiFi"
- ❌ Phone on mobile data → **WON'T WORK**
- ❌ Devices on different WiFi networks → **WON'T WORK**

### 2. Bluetooth Printer Paired
- Bluetooth printer must be paired with the Android device running the bridge
- Printer must be turned ON
- Printer PIN is usually: 0000 or 1234

## Step-by-Step Setup

### PART 1: Setup Android Bridge (One-time setup)

#### Step 1: Install Invoify Bridge App
1. Download `invoify-bridge.apk` to your Android phone
2. Go to Settings → Security → Enable "Install from Unknown Sources"
3. Open the APK file and install
4. Allow all permissions when prompted

#### Step 2: Pair Bluetooth Printer
1. Turn ON your thermal printer (e.g., Shreyans 80mm)
2. On Android: Settings → Bluetooth → Turn ON
3. Scan for devices
4. Find your printer (name like "SHREYANS" or "TP-80")
5. Tap to pair (PIN: 0000 or 1234)
6. Wait for "Paired" status

#### Step 3: Configure Bridge App
1. Open **Invoify Bridge** app
2. Tap "SCAN FOR PRINTERS"
3. Select your printer from the dropdown (e.g., "SHREYANS (XX:XX:XX:XX:XX:XX)")
4. Tap "START SERVICE"
5. You should see:
   - ✅ Service Status: **Running** (green)
   - ✅ Printer Status: **Connected**
   - ✅ Bridge URL displayed (e.g., `http://192.168.1.100:9000`)

#### Step 4: Test Printer
1. In the bridge app, tap "TEST PRINT"
2. The printer should print a test receipt
3. If it prints → ✅ Setup successful!
4. If it doesn't print:
   - Check printer is turned ON
   - Check Bluetooth connection
   - Try re-pairing the printer

### PART 2: Printing from Phone Browser

#### Step 5: Connect Both Devices to WiFi
**CRITICAL**: Both devices must be on the same WiFi network

1. **Phone** (the one you'll browse from):
   - Settings → WiFi → Connect to your office WiFi
   
2. **Android Bridge Device** (running the bridge app):
   - Settings → WiFi → Connect to the SAME WiFi network
   
3. **Verify**: Both should show same WiFi name in status bar

#### Step 6: Open Website on Phone
1. On your phone, open Chrome or Safari browser
2. Navigate to your website:
   - If website is hosted: `https://yourdomain.com`
   - If local server: `http://192.168.1.50:3000` (replace with server IP)

#### Step 7: Print Receipt
1. Go to any invoice page
2. Tap "Thermal Receipt" or "Print"
3. The receipt page opens
4. Tap the **Bluetooth Print** button
5. Wait for status messages:
   - "Connecting to printer..."
   - "Sending to printer..."
   - ✅ "Printed successfully!"
6. The printer should print the receipt!

## Troubleshooting

### Problem: "Bridge not available" message

**Solution 1: Check WiFi Connection**
```
1. Both devices on same WiFi? → Connect them
2. Phone on mobile data? → Switch to WiFi
3. Different WiFi networks? → Connect to same one
```

**Solution 2: Restart Bridge Service**
```
1. Open Invoify Bridge app
2. Tap "STOP SERVICE"
3. Wait 3 seconds
4. Tap "START SERVICE"
5. Verify "Service Running" shows in green
6. Note the Bridge URL (e.g., http://192.168.1.100:9000)
```

**Solution 3: Check Firewall**
```
Some Android devices have firewall apps that block connections:
1. Open Security app
2. Check Firewall settings
3. Allow Invoify Bridge to accept connections
4. Disable VPN if running
```

### Problem: "Print failed" or timeout

**Solution 1: Check Printer Connection**
```
1. Is printer turned ON? → Turn it ON
2. Is Bluetooth enabled on Android? → Enable it
3. In Bridge app, check "Printer Status"
4. If disconnected, tap "SCAN" and reconnect
```

**Solution 2: Test Print First**
```
1. Open Bridge app
2. Tap "TEST PRINT"
3. If test works but website doesn't:
   - Clear browser cache
   - Close and reopen browser
   - Check WiFi connection
```

**Solution 3: Check Printer Paper**
```
1. Is there paper in the printer?
2. Is the paper roll installed correctly?
3. Is the printer cover closed properly?
```

### Problem: Printed receipt is garbled or incomplete

**Solution: Printer Compatibility**
```
1. Ensure printer is ESC/POS compatible
2. Supported brands:
   ✅ Shreyans 80mm
   ✅ TVS RP45
   ✅ Epson TM-T82
   ✅ Any ESC/POS thermal printer
   
3. If using different printer, test print first
```

### Problem: Website shows wrong IP address

**Solution: Manual Bridge URL Entry**
```
If automatic detection fails, you can manually configure:

1. In Bridge app, note the IP address shown
   (e.g., "http://192.168.1.100:9000")

2. Contact your developer to manually configure this IP
   in the website settings
```

## Network Configuration Examples

### Example 1: Office WiFi
```
✅ WORKS
- WiFi Router: "OfficeNet" (192.168.1.1)
- Phone: Connected to "OfficeNet" (192.168.1.45)
- Bridge Android: Connected to "OfficeNet" (192.168.1.100)
- Printer: Paired via Bluetooth to Bridge Android
```

### Example 2: Home Hotspot
```
✅ WORKS
- Android Phone A: Creates hotspot "MyHotspot"
- Phone B (browsing): Connected to "MyHotspot"  
- Android Phone A: Runs bridge app + Bluetooth printer paired
```

### Example 3: Mobile Data (WON'T WORK)
```
❌ DOESN'T WORK
- Phone: Using mobile data (4G/5G)
- Bridge Android: Connected to WiFi
- ❌ Can't communicate across different networks
```

## Quick Reference Card

### Before Every Printing Session:
1. ✅ Turn ON Bluetooth printer
2. ✅ Open Invoify Bridge app
3. ✅ Verify "Service Running" is green
4. ✅ Check WiFi - same network on both devices
5. ✅ Test print once to verify

### During Printing:
1. Open invoice in phone browser
2. Tap "Thermal Receipt" or "Print"
3. Tap "Bluetooth Print" button
4. Wait for success message
5. Collect receipt from printer

### If Something Goes Wrong:
1. Check printer is ON
2. Check WiFi connection
3. Restart bridge service
4. Try test print
5. Restart browser

## Advanced: Finding Device IP Address

### On Android Device Running Bridge:
1. Settings → About Phone → Status → IP Address
2. OR: Settings → WiFi → Tap connected network → IP Address
3. OR: The Bridge app shows it automatically when service is running

### On iPhone/Phone:
1. Settings → WiFi → Tap (i) icon next to connected network
2. Note the IP Address

### Both should start with same numbers:
```
✅ Bridge: 192.168.1.100
✅ Phone:  192.168.1.45
(Same: 192.168.1.x)

❌ Bridge: 192.168.1.100
❌ Phone:  192.168.0.45  
(Different subnet - WON'T WORK)
```

## Security Notes

### Port 9000
- The bridge app listens on port 9000
- This port must be accessible on your local network
- No internet exposure needed (local network only)

### Firewall
- Some Android phones have built-in firewalls
- If connection fails, check firewall settings
- Allow incoming connections on port 9000 for Invoify Bridge

## Summary Checklist

### ✅ One-Time Setup
- [ ] Install Invoify Bridge app on Android
- [ ] Pair Bluetooth printer with Android
- [ ] Configure printer in Bridge app
- [ ] Test print successful

### ✅ Every Use
- [ ] Printer turned ON
- [ ] Bridge service RUNNING (green status)
- [ ] Both devices on SAME WiFi
- [ ] WiFi not mobile data

### ✅ Printing
- [ ] Open website in phone browser
- [ ] Navigate to invoice
- [ ] Tap print button
- [ ] Wait for success message
- [ ] Collect receipt

## Support

If you continue having issues after following this guide:

1. **Check Bridge App Status**:
   - Is "Service Running" green?
   - Is bridge URL showing?
   - Can you test print successfully?

2. **Check Network**:
   - Same WiFi on both devices?
   - Not using mobile data?
   - IP addresses in same range?

3. **Check Printer**:
   - Turned ON?
   - Paper loaded?
   - Bluetooth connected?

4. **Contact Support**:
   - Provide screenshot of Bridge app status
   - Provide screenshot of error message
   - Mention printer brand/model

---

**Last Updated**: November 2025  
**Version**: 1.0  
**Compatible with**: Invoify Bridge v1.0+
