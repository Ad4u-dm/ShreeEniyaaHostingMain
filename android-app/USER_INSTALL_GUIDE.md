# 📱 User Installation Guide - Invoify Bridge App

## For Android Device Users

This guide will help you install and setup the Invoify Bridge app for automatic Bluetooth thermal printing.

---

## ⏱️ Quick Setup (5 Minutes)

### What You Need:
- ✅ Android phone or tablet (Android 6.0+)
- ✅ Bluetooth thermal printer (ESC/POS compatible)
- ✅ The `InvoifyBridge.apk` file

---

## 📥 Step 1: Download the App

### Method 1: From Website
1. Open Chrome browser on your Android device
2. Visit your company website
3. Look for "Download Invoify Bridge" button
4. Tap to download `InvoifyBridge.apk`

### Method 2: From Email/WhatsApp
1. Receive the APK file from your administrator
2. Tap to open the file

---

## 🔧 Step 2: Enable Installation from Unknown Sources

**For Android 8.0+:**
1. When you try to install, Android will ask: "Install unknown apps?"
2. Tap "Settings"
3. Enable "Allow from this source"
4. Tap back button

**For Android 7.0 and below:**
1. Go to: Settings → Security
2. Enable "Unknown sources"
3. Tap "OK" when warned

---

## 📲 Step 3: Install the App

1. Tap the downloaded APK file
2. Tap "Install"
3. Wait 5-10 seconds
4. Tap "Open"

---

## 🖨️ Step 4: Setup Bluetooth Printer

### 4.1: Pair Your Printer (First Time Only)

1. Turn on your Bluetooth thermal printer
2. On your Android device:
   - Go to Settings → Bluetooth
   - Turn on Bluetooth
   - Wait for printer to appear in "Available devices"
   - Tap your printer name (e.g., "Shreyans-80mm")
   - Enter PIN if asked (usually `0000` or `1234`)
   - Wait for "Connected" or "Paired" status

### 4.2: Configure in Invoify Bridge App

1. Open "Invoify Bridge" app
2. Tap "SCAN FOR PRINTERS" button
3. Select your printer from the dropdown
4. Tap "START SERVICE"
5. You should see: "Service is running" (in green)

**That's it! Your printer is ready!** ✅

---

## 🌐 Step 5: Test Printing from Website

1. Keep the Invoify Bridge app running (you can minimize it)
2. Open Chrome browser
3. Go to your Invoify website
4. Navigate to any receipt page
5. Click "Print" button
6. Receipt should print automatically! 🎉

---

## ✅ Success Indicators

You'll know everything is working when:

**In the App:**
- ✅ Status shows: "Service is running" (green text)
- ✅ Printer shows: "Connected to: [Your Printer]"
- ✅ Notification shows: "Invoify Bridge Active"

**On Website:**
- ✅ Shows: "✅ Bluetooth Bridge Connected"
- ✅ Print button works instantly
- ✅ No Android print dialog appears

---

## 🧪 Testing

### Test from App:
1. Open Invoify Bridge app
2. Tap "TEST PRINT"
3. Should print a test receipt

### Test from Website:
1. Open any receipt page
2. Click "Print"
3. Should print immediately

---

## 🔄 Daily Usage

After initial setup, daily usage is simple:

1. Turn on printer
2. Your phone auto-starts the bridge service (runs in background)
3. Open website in Chrome
4. Print normally - it just works!

**You don't need to open the app again!**

---

## ⚙️ Advanced Settings

### Auto-Start on Boot

By default, the service starts automatically when your phone boots.

**To disable auto-start:**
Currently always enabled (future update will add toggle)

### Change Printer

1. Open Invoify Bridge app
2. Tap "SCAN FOR PRINTERS"
3. Select different printer
4. Tap "STOP SERVICE" then "START SERVICE"

---

## 🐛 Troubleshooting

### Problem: Can't install APK

**Solution:**
- Make sure "Unknown sources" is enabled
- Check if you have enough storage space (need ~10MB)
- Try redownloading the APK file

### Problem: Printer not showing in list

**Solution:**
1. Make sure printer is turned on
2. Go to Android Settings → Bluetooth
3. Pair the printer manually first
4. Come back to app and tap "SCAN FOR PRINTERS"

### Problem: "Service is stopped" (red text)

**Solution:**
1. Select a printer from dropdown
2. Tap "START SERVICE"
3. Grant any permissions if asked

### Problem: Print button on website doesn't work

**Solution:**
1. Check if "Service is running" in app
2. Refresh the website page
3. Check if you see "✅ Bluetooth Bridge Connected" on website
4. Try test print from app first

### Problem: Prints garbage characters

**Solution:**
- Your printer might not be ESC/POS compatible
- Check printer model and manual
- Contact support with printer model info

### Problem: Service stops after some time

**Solution:**
1. Go to Android Settings → Battery
2. Find "Invoify Bridge" app
3. Disable battery optimization for this app
4. This prevents Android from killing the service

### Problem: Website shows "Bridge offline"

**Solution:**
1. Open Invoify Bridge app
2. Check if service is running
3. If not, tap "START SERVICE"
4. Refresh website

---

## 🔋 Battery Usage

The Invoify Bridge app is optimized for low battery usage:
- Uses ~1-2% battery per day when idle
- Only active when printing
- You can safely keep it running 24/7

---

## 📞 Getting Help

### Before Contacting Support:

1. Check the app shows "Service is running"
2. Try "TEST PRINT" from the app
3. Make sure Bluetooth is enabled
4. Make sure printer is turned on and paired

### Contact Information:

**Email:** support@shreeiniyaa.com  
**Phone:** 04364-221200

**Please provide:**
- Your Android version (Settings → About Phone)
- Your printer model
- Screenshot of the app
- What error message you see

---

## 📱 App Permissions Explained

The app needs these permissions:

| Permission | Why | When Used |
|------------|-----|-----------|
| Bluetooth | Connect to printer | When printing |
| Location | Required by Android for Bluetooth | Only for Bluetooth scanning |
| Run in background | Keep service active | Always (for instant printing) |
| Start on boot | Auto-start service | When phone restarts |

**Note:** The app does NOT collect or send any personal data. All printing happens locally on your device.

---

## ✨ Tips for Best Experience

1. **Keep printer on:** For instant printing
2. **Don't force-close app:** Let it run in background
3. **Charge printer:** Check battery before shift starts
4. **Test daily:** Do a test print at start of day
5. **Update app:** Install updates when available

---

## 🎉 You're All Set!

Enjoy seamless thermal printing from your website!

**Happy Printing!** 🖨️✨

---

**Version:** 1.0  
**Last Updated:** November 2025  
**App Size:** ~3MB  
**Compatibility:** Android 6.0+
