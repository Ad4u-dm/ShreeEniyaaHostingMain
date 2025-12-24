# 🪟 How to Build Windows Desktop App

## ✅ Prerequisites Check

**Your Current Setup:**
- ✅ Node.js: v25.2.1
- ✅ npm: 11.6.4
- ✅ Operating System: Linux (will build for Windows)

## 📋 Step-by-Step Guide

### **Step 1: Install Dependencies**

```bash
# Install all project dependencies
npm install

# Install backend dependencies (if deploying separately)
cd backend && npm install && cd ..
```

### **Step 2: Build Next.js App**

```bash
# Build the Next.js app in standalone mode (required for Electron)
npm run build:standalone
```

This creates an optimized production build in `.next/standalone/`

### **Step 3: Build Windows Executable**

```bash
# Build Windows .exe installer
npm run electron:build
```

**OR** for all platforms:

```bash
# Build for Windows, macOS, and Linux
npm run electron:build:all
```

**Available Build Scripts:**
- `npm run electron:build` - Windows only (.exe)
- `npm run build:windows` - Windows only (alternative)
- `npm run electron:build:all` - All platforms (Windows, Mac, Linux)
- `npm run build:app` - Current platform only

### **Step 4: Find Your Windows App**

After successful build, your Windows installer will be in:

```
dist/
├── Invoify Setup 0.1.0.exe          ← Windows installer
├── win-unpacked/                     ← Portable version (no install)
│   └── Invoify.exe
└── builder-effective-config.yaml     ← Build configuration
```

---

## 🚀 Quick Commands Reference

### **For Development (Testing)**

```bash
# Run Next.js app in browser
npm run dev

# Run Electron desktop app in development mode
npm run electron:dev

# Run both frontend and backend
npm run dev:fullstack
```

### **For Production Build**

```bash
# Complete Windows build process
npm run build:standalone && npm run electron:build
```

---

## 📦 Build Configuration

Your app is configured with:

**App Details:**
- Name: **Invoify** (Shree Eniyaa Chitfunds)
- Version: **0.1.0**
- Main File: `electron/main-simple.js`
- Icon: `public/favicon.ico`

**Windows Build Settings:**
- Target: **Windows 64-bit**
- Output: **NSIS Installer (.exe)**
- Features:
  - Auto-update support
  - Start menu integration
  - Desktop shortcut
  - One-click installation

**Included Components:**
- Next.js standalone server
- Prisma database (SQLite)
- PDF generation (Puppeteer)
- Offline-first support

---

## 🔧 Build Process Details

### What Happens During Build:

1. **Prebuild Script** (`scripts/prebuild-electron.js`):
   - ✅ Checks for Next.js standalone build
   - ✅ Generates Prisma Client for Windows
   - ✅ Copies environment files
   - ✅ Prepares database schema
   - ✅ Copies necessary assets

2. **Electron Builder**:
   - ✅ Packages Next.js app
   - ✅ Includes Node.js runtime
   - ✅ Creates Windows installer
   - ✅ Signs executable (if configured)
   - ✅ Compresses into distributable

---

## 🎯 Build Output Structure

```
dist/
├── Invoify Setup 0.1.0.exe     # 📦 Full installer (~150-200 MB)
│   └── Features:
│       ├── One-click installation
│       ├── Start menu shortcuts
│       ├── Desktop icon
│       └── Uninstaller
│
├── win-unpacked/               # 📂 Portable version
│   ├── Invoify.exe            # ⚡ Run directly (no install)
│   ├── resources/
│   │   └── app.asar          # Packaged app code
│   └── locales/
│
└── builder-effective-config.yaml
```

---

## 🐛 Troubleshooting

### **Error: "Standalone build not found"**

```bash
# Run this first:
npm run build:standalone
```

### **Error: "Prisma generate failed"**

```bash
# Generate Prisma manually:
npx prisma generate
```

### **Error: "electron-builder not found"**

```bash
# Reinstall dev dependencies:
npm install --save-dev electron-builder
```

### **Error: "Module not found" during runtime**

```bash
# Clean build and rebuild:
rm -rf .next dist node_modules
npm install
npm run build:standalone
npm run electron:build
```

### **Windows Defender blocks the .exe**

This is normal for unsigned apps. To fix:
1. Click "More info" → "Run anyway"
2. OR: Sign your app with a code signing certificate

---

## 💡 Tips for Successful Build

### **1. Clean Build (Recommended)**

```bash
# Remove old builds
rm -rf .next dist

# Fresh install and build
npm install
npm run build:standalone
npm run electron:build
```

### **2. Reduce Build Size**

The prebuild script already optimizes, but you can:
- Remove unused dependencies
- Use `electron-builder --publish=never` (already set)
- Compress with UPX (advanced)

### **3. Test Before Distribution**

```bash
# Test the portable version first:
./dist/win-unpacked/Invoify.exe

# Then test the installer:
./dist/Invoify Setup 0.1.0.exe
```

### **4. Build on Windows (If Available)**

While you can cross-compile from Linux, building on Windows gives:
- Better compatibility
- Smaller file size
- Easier testing
- Proper signing

---

## 📝 Environment Variables for Production

Before building, ensure your `.env` has:

```env
# Database
DATABASE_URL="file:./prisma/local_chitfund.db"

# App Settings
NODE_ENV=production
PORT=3000
HOSTNAME=localhost

# MongoDB (if using cloud)
MONGODB_URI=mongodb://localhost:27017/chitfund

# JWT Secret
JWT_SECRET=your-super-secret-key-here

# SMS (MSG91)
MSG91_AUTH_KEY=your-msg91-key
MSG91_SENDER_ID=SHRENIYA
MSG91_DLT_ENTITY_ID=your-entity-id
```

---

## 🎉 Final Steps

### **After Build Completes:**

1. ✅ Find installer: `dist/Invoify Setup 0.1.0.exe`
2. ✅ Test on Windows machine
3. ✅ Check all features work:
   - Login/Authentication
   - Invoice creation
   - PDF generation
   - Database operations
   - SMS sending (if configured)
4. ✅ Distribute to users

### **Distribution Options:**

- **Direct Download**: Share the .exe file
- **Network Share**: Place on company server
- **Cloud Storage**: Upload to Google Drive/Dropbox
- **USB Drive**: Copy to flash drives

---

## 🔐 Code Signing (Optional but Recommended)

To avoid Windows SmartScreen warnings:

1. Purchase code signing certificate (~$100-400/year)
2. Add to `package.json`:

```json
"win": {
  "certificateFile": "path/to/certificate.pfx",
  "certificatePassword": "your-password"
}
```

3. Rebuild: `npm run electron:build`

---

## 📊 Complete Build Command

```bash
# ONE COMMAND TO RULE THEM ALL:
npm install && npm run build:standalone && npm run electron:build
```

Expected time: **5-15 minutes** depending on your machine.

---

## ✅ Success Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Next.js built (`npm run build:standalone`)
- [ ] No errors in `.next/standalone/` directory
- [ ] Prisma client generated
- [ ] Electron build completed
- [ ] `.exe` file in `dist/` folder
- [ ] Tested installer on Windows
- [ ] All features working

---

## 🆘 Need Help?

**Common Issues:**
1. **Build fails**: Check Node.js version (v18+ required)
2. **Size too large**: Normal for first build (~150-200MB)
3. **App won't start**: Check Windows Event Viewer logs
4. **Database errors**: Ensure SQLite database is bundled

**Check Build Logs:**
```bash
# Enable verbose logging
DEBUG=electron-builder npm run electron:build
```

---

**Your app is ready to build! 🚀**

Run: `npm run build:standalone && npm run electron:build`
