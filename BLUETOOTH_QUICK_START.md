# 📱 Quick Setup Guide - Print from Phone to Bluetooth Printer

## ✅ What You Need

1. **Android phone/tablet** - To run the bridge app and connect to printer
2. **Your phone** - To browse the website and print
3. **Bluetooth thermal printer** - Shreyans 80mm or similar
4. **WiFi network** - Both devices must connect to the SAME WiFi

---

## 🚀 Setup (5 Minutes)

### Step 1: Install Bridge App on Android Device
1. Download `invoify-bridge.apk` to your Android
2. Open the APK and tap "Install"
3. Allow permissions when asked

### Step 2: Pair Bluetooth Printer
1. Turn ON your thermal printer
2. On Android: Settings → Bluetooth → Turn ON
3. Pair with your printer (PIN: 0000 or 1234)

### Step 3: Start Bridge Service
1. Open **Invoify Bridge** app
2. Tap "SCAN FOR PRINTERS"
3. Select your printer
4. Tap "START SERVICE"
5. **IMPORTANT**: Note the URL shown (e.g., `http://192.168.1.100:9000`)

### Step 4: Test It Works
1. In the bridge app, tap "TEST PRINT"
2. Printer should print a test receipt
3. ✅ If it prints → You're ready!

---

## 🖨️ How to Print

### From Your Phone Browser:
1. **Connect to WiFi** (same network as bridge device)
2. Open your website in Chrome/Safari
3. Go to any invoice
4. Tap "Print" or "Thermal Receipt"
5. Look for green "✅ Bluetooth Bridge Connected"
6. Tap "Print via Bluetooth"
7. Receipt prints! 🎉

---

## ⚠️ Troubleshooting

### Problem: "Bridge Not Connected" (Orange Warning)

**Quick Fix:**
1. Open Invoify Bridge app
2. Tap "STOP SERVICE" then "START SERVICE"
3. Check both devices are on **same WiFi** (not mobile data!)
4. Refresh the browser page
5. Green checkmark should appear

### Problem: Print button doesn't work

**Check:**
- [ ] Printer is turned ON
- [ ] Bridge app shows "Service Running" (green)
- [ ] Both devices on same WiFi network
- [ ] Printer has paper loaded

**Still stuck?**
1. In bridge app, try "TEST PRINT"
2. If test works but website doesn't → Check WiFi
3. If test doesn't work → Check Bluetooth connection

---

## 💡 Important Notes

### ✅ DO:
- Keep both devices on same WiFi
- Keep bridge service running (green)
- Keep printer turned ON and Bluetooth connected

### ❌ DON'T:
- Use mobile data instead of WiFi
- Turn off bridge service while printing
- Connect devices to different WiFi networks

---

## 📞 Need More Help?

Read the detailed guide: **PHONE_BLUETOOTH_PRINTING_GUIDE.md**

Common fixes:
- Restart bridge service
- Reconnect to WiFi
- Restart printer
- Test print from app first

---

**That's it! You're now printing from your phone to Bluetooth printer! 🎉**
