# 🔨 Build Guide - Invoify Bridge Android App

## Prerequisites

### Required Software

1. **Android Studio** (Latest version)
   - Download: https://developer.android.com/studio
   - Size: ~1GB
   - Install time: ~10 minutes

2. **Java Development Kit (JDK)**
   - Android Studio includes JDK
   - Or install separately: JDK 17+

### System Requirements

- **OS:** Windows 10+, macOS 10.14+, or Linux (64-bit)
- **RAM:** 8GB minimum (16GB recommended)
- **Disk Space:** 10GB free space
- **Internet:** For downloading dependencies

---

## 📥 Step 1: Setup Android Studio

### First Time Installation

1. Download Android Studio from official website
2. Run installer
3. Follow setup wizard:
   - Choose "Standard" installation
   - Accept all SDK licenses
   - Wait for initial downloads (~2GB)

### Configure SDK

1. Open Android Studio
2. Go to: **Tools → SDK Manager**
3. Ensure these are installed:
   - ✅ Android SDK Platform 34
   - ✅ Android SDK Build-Tools 34.0.0
   - ✅ Android SDK Command-line Tools

---

## 📂 Step 2: Open Project

### Method 1: From Android Studio
```
1. Open Android Studio
2. Click: "Open"
3. Navigate to: /media/newvolume/PP/billing_app/invoify/android-app/
4. Click: "OK"
5. Wait for Gradle sync (2-3 minutes first time)
```

### Method 2: From Terminal
```bash
cd /media/newvolume/PP/billing_app/invoify/android-app
studio .  # If Android Studio is in PATH
```

---

## 🔧 Step 3: Gradle Sync

### Automatic Sync

When you open the project, Gradle will automatically:
1. Download dependencies (~50MB)
2. Configure build system
3. Index project files

**This takes 2-5 minutes on first build.**

### Manual Sync (if needed)

If automatic sync fails:
```
1. Click: File → Sync Project with Gradle Files
2. Or click the "Sync" icon in toolbar
```

### Troubleshooting Sync Issues

**Error: "SDK not found"**
```
Solution: Tools → SDK Manager → Install Android SDK Platform 34
```

**Error: "Gradle version mismatch"**
```
Solution: File → Project Structure → Project → Gradle Version → Use latest
```

---

## 🔨 Step 4: Build APK

### Debug Build (For Testing)

**Method 1: Via Menu**
```
1. Build → Build Bundle(s) / APK(s) → Build APK(s)
2. Wait 1-2 minutes
3. Click "locate" in notification
4. APK location: app/build/outputs/apk/debug/app-debug.apk
```

**Method 2: Via Terminal**
```bash
cd /media/newvolume/PP/billing_app/invoify/android-app
./gradlew assembleDebug

# APK will be at:
# app/build/outputs/apk/debug/app-debug.apk
```

### Release Build (For Production)

**Step 1: Generate Signing Key**
```bash
keytool -genkey -v -keystore invoify-release-key.jks \
  -alias invoify -keyalg RSA -keysize 2048 -validity 10000

# Follow prompts:
# - Enter password (remember this!)
# - Enter your details
# - Confirm
```

**Step 2: Configure Signing**

Edit `app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file("../invoify-release-key.jks")
            storePassword "YOUR_PASSWORD"
            keyAlias "invoify"
            keyPassword "YOUR_PASSWORD"
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Step 3: Build Release APK**
```bash
./gradlew assembleRelease

# APK will be at:
# app/build/outputs/apk/release/app-release.apk
```

---

## 📱 Step 5: Install on Device

### Method 1: Direct USB Installation

1. **Enable Developer Options:**
   - Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back → Developer Options

2. **Enable USB Debugging:**
   - Developer Options → USB Debugging → ON

3. **Connect Device:**
   ```bash
   # Check if device is detected
   adb devices
   
   # Install APK
   adb install app/build/outputs/apk/debug/app-debug.apk
   ```

### Method 2: Manual Installation

1. Copy APK to phone (USB, email, cloud)
2. On phone: Open file manager
3. Tap the APK file
4. Tap "Install"
5. Accept permissions

---

## 🧪 Step 6: Test the App

### Initial Setup

1. Open "Invoify Bridge" app
2. Tap "Scan for Printers"
3. Select your thermal printer
4. Tap "Connect"
5. Tap "Start Service"
6. See notification: "Invoify Bridge Active"

### Test Printing

**Method 1: From App**
```
1. In app, tap "Test Print"
2. Should print a test receipt
```

**Method 2: From Terminal**
```bash
# Test health endpoint
curl http://localhost:9000/health

# Test print endpoint
curl -X POST http://localhost:9000/test
```

**Method 3: From Website**
```
1. Open Chrome on the same Android device
2. Navigate to your Invoify website
3. Open a receipt page
4. Click "Print" button
5. Receipt should print!
```

---

## 🎨 Customization

### Change App Name

**File:** `app/src/main/res/values/strings.xml`
```xml
<resources>
    <string name="app_name">Your Custom Name</string>
</resources>
```

### Change App Icon

1. Prepare icon images (512x512 PNG)
2. Right-click `res` folder
3. New → Image Asset
4. Follow wizard
5. Replace launcher icons

### Change Package Name

1. Right-click package in Project view
2. Refactor → Rename
3. Enter new name
4. Update in `build.gradle`:
   ```gradle
   applicationId "com.yourcompany.yourapp"
   ```

### Change Colors/Theme

**File:** `app/src/main/res/values/colors.xml`
```xml
<resources>
    <color name="purple_500">#FF6200EE</color>
    <color name="purple_700">#FF3700B3</color>
    <color name="teal_200">#FF03DAC5</color>
    <color name="teal_700">#FF018786</color>
</resources>
```

---

## 📦 Distribution

### Option 1: Direct APK Distribution

1. Build release APK
2. Upload to your website: `public/download/InvoifyBridge.apk`
3. Users download and install

**Pros:**
- ✅ Quick and easy
- ✅ No app store approval needed
- ✅ Full control

**Cons:**
- ⚠️ Users must enable "Unknown Sources"
- ⚠️ No automatic updates

### Option 2: Google Play Store

1. Create Google Play Developer account ($25 one-time fee)
2. Build signed release APK or AAB
3. Create store listing
4. Submit for review
5. Wait 1-3 days for approval

**Pros:**
- ✅ Professional distribution
- ✅ Automatic updates
- ✅ User trust

**Cons:**
- ⚠️ $25 fee
- ⚠️ Review process
- ⚠️ Must follow Play Store policies

---

## 🐛 Troubleshooting

### Build Errors

**Error: "Could not find com.android.tools.build:gradle:X.X.X"**
```
Solution: Update gradle version in build.gradle
```

**Error: "Invoke-customs are only supported starting with Android O (--min-api 26)"**
```
Solution: In app/build.gradle, add:
android {
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}
```

### Runtime Errors

**Error: "Permission denied: BLUETOOTH_CONNECT"**
```
Solution: Request permissions in MainActivity (already implemented)
```

**Error: "Port 9000 already in use"**
```
Solution: Kill existing process:
adb shell
netstat -tuln | grep 9000
kill <PID>
```

**Error: "Printer not found"**
```
Solutions:
1. Check if printer is paired in Android Bluetooth settings
2. Turn printer off and on
3. Clear app data and re-pair
```

---

## 📊 APK Size Optimization

Current APK size: ~3-5MB

### Further Reduce Size

**1. Enable ProGuard (already enabled in release)**
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
    }
}
```

**2. Use APK Splits**
```gradle
android {
    splits {
        abi {
            enable true
            reset()
            include 'armeabi-v7a', 'arm64-v8a'
        }
    }
}
```

**3. Remove Unused Resources**
```gradle
android {
    buildTypes {
        release {
            shrinkResources true
        }
    }
}
```

---

## ✅ Final Checklist

Before distributing:

- [ ] App builds without errors
- [ ] App installs on test device
- [ ] Bluetooth pairing works
- [ ] Service starts successfully
- [ ] HTTP server responds on port 9000
- [ ] Test print works
- [ ] Website can connect and print
- [ ] Auto-start on boot works
- [ ] Notification shows correctly
- [ ] App icon and name are correct
- [ ] No crashes in basic usage

---

## 🚀 Quick Start Summary

```bash
# 1. Install Android Studio
# Download from: https://developer.android.com/studio

# 2. Open project
cd /media/newvolume/PP/billing_app/invoify/android-app
# Open in Android Studio

# 3. Build APK
./gradlew assembleDebug

# 4. Install on device
adb install app/build/outputs/apk/debug/app-debug.apk

# 5. Test
# Open app → Pair printer → Start service → Test from website
```

**Total time: ~30 minutes** ⏱️

---

## 📞 Support

Need help?
- Check error messages carefully
- Search Android Studio documentation
- Review app logs: `adb logcat | grep Invoify`
- Contact developer support

---

**Happy Building! 🎉**
