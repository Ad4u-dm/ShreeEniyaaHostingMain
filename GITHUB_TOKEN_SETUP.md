# 🔑 GitHub Personal Access Token Setup Guide

## Overview
Your Windows build pipeline requires a GitHub Personal Access Token (GH_TOKEN) for signing and releasing the built executables. This guide walks you through the complete setup process.

## 🚨 **URGENT: Required for Windows Builds**
Without this token, your GitHub Actions will fail with:
```
⨯ GitHub Personal Access Token is not set, neither programmatically, nor using env "GH_TOKEN"
```

---

## 🔧 **Step 1: Generate GitHub Personal Access Token**

### **1.1 Go to GitHub Settings**
1. Click your **profile picture** (top right)
2. Select **"Settings"**
3. Scroll down to **"Developer settings"** (left sidebar)
4. Click **"Personal access tokens"**
5. Select **"Tokens (classic)"**

### **1.2 Create New Token**
1. Click **"Generate new token"** → **"Generate new token (classic)"**
2. Enter token description: `Invoify Windows Build Token`
3. Set expiration: **"No expiration"** (or 1 year for security)

### **1.3 Select Required Scopes**
Check these permissions:

✅ **Essential Scopes:**
- `repo` - Full control of private repositories
  - `repo:status` - Access commit status
  - `repo_deployment` - Access deployment status
  - `public_repo` - Access public repositories
- `workflow` - Update GitHub Action workflows
- `write:packages` - Upload packages to GitHub Package Registry

✅ **Optional (recommended):**
- `read:org` - Read organization membership
- `read:public_key` - Read public keys
- `read:repo_hook` - Read repository hooks

### **1.4 Generate Token**
1. Click **"Generate token"**
2. **⚠️ IMPORTANT: Copy the token immediately!**
3. Store it securely (you won't see it again)

**Your token will look like:**
```
ghp_abcd1234567890efghijklmnopqrstuvwxyz1234
```

---

## 🔐 **Step 2: Add Token to Repository Secrets**

### **2.1 Navigate to Repository Settings**
1. Go to your repository: `https://github.com/NishantDakua/shri_iniya_chit_funds`
2. Click **"Settings"** tab
3. Click **"Secrets and variables"** → **"Actions"** (left sidebar)

### **2.2 Create Repository Secret**
1. Click **"New repository secret"**
2. **Name:** `GH_TOKEN` (exactly this name)
3. **Secret:** Paste your generated token
4. Click **"Add secret"**

### **2.3 Verify Secret Added**
You should see `GH_TOKEN` listed in your repository secrets (value hidden for security).

---

## ✅ **Step 3: Verify Workflow Configuration**

The workflow has been updated to use the token:

```yaml
# Build Windows executable for x64 architecture
- name: 🏗️ Build Windows Executable (x64)
  run: |
    echo "Building Windows executable for x64..."
    npx electron-builder --win --x64 --config.extraMetadata.main=electron/main-simple.js
    echo "Windows build completed for x64!"
  env:
    GH_TOKEN: ${{ secrets.GH_TOKEN }}
```

This tells GitHub Actions to use your secret token during the build process.

---

## 🚀 **Step 4: Test the Fix**

After setting up the token:

1. **Commit workflow changes:**
   ```bash
   git add .github/workflows/build-windows.yml
   git commit -m "Fix: Add GH_TOKEN to Windows build step"
   git push origin main
   ```

2. **Monitor the build:**
   - Go to **"Actions"** tab in your repository
   - Watch the "Build Windows Executable" workflow
   - It should now complete successfully!

3. **Expected success output:**
   ```
   ✅ Building Windows executable for x64...
   ✅ Windows build completed for x64!
   ```

---

## 🔍 **Troubleshooting**

### **Token Not Working?**
- ✅ Verify token has `repo` and `workflow` scopes
- ✅ Check token hasn't expired
- ✅ Ensure secret name is exactly `GH_TOKEN`
- ✅ Try regenerating token with all required scopes

### **Still Getting Auth Errors?**
- ✅ Wait 5-10 minutes after adding secret (GitHub propagation)
- ✅ Check repository is not a fork (tokens work differently)
- ✅ Verify you have admin access to the repository

### **Build Success but No Artifacts?**
- ✅ Check if electron-builder needs `publish` configuration
- ✅ Verify Windows build step completed without errors
- ✅ Look for artifacts in "Summary" section of workflow run

---

## 📋 **Security Best Practices**

### **Token Security:**
- ✅ Never commit tokens to code
- ✅ Use repository secrets only
- ✅ Set reasonable expiration dates
- ✅ Rotate tokens periodically

### **Scope Limitation:**
- ✅ Only grant minimum required permissions
- ✅ Use `repo` scope for private repositories
- ✅ Consider using `public_repo` for public repos only

### **Monitoring:**
- ✅ Check token usage in GitHub Settings
- ✅ Monitor failed authentication attempts
- ✅ Revoke unused tokens

---

## 🎯 **Quick Setup Checklist**

- [ ] Generate GitHub Personal Access Token with `repo` + `workflow` scopes
- [ ] Copy token securely (you won't see it again!)
- [ ] Add token to repository secrets as `GH_TOKEN`
- [ ] Verify workflow file includes `env: GH_TOKEN: ${{ secrets.GH_TOKEN }}`
- [ ] Commit and push changes
- [ ] Monitor Actions tab for successful build
- [ ] Download Windows executable from artifacts

**Expected Build Time: 5-10 minutes** ⏱️

---

## 🆘 **Need Help?**

If you're still having issues:

1. **Check the Actions logs** for specific error messages
2. **Verify token permissions** in GitHub Settings
3. **Try regenerating** the token with all scopes
4. **Contact support** if repository-specific issues persist

**Once set up correctly, your Windows builds will work automatically! 🎉**