# 🚀 Quick Start Guide - Frontend & Backend Separation

## What Just Happened?

Your application has been successfully separated into:
- **Frontend** (Next.js) - For Hostinger
- **Backend** (Express API) - For separate server

All existing code works **without modifications** thanks to automatic routing!

---

## ⚡ Quick Test (5 minutes)

### Step 1: Backend Setup
```bash
# Install backend dependencies
cd backend
npm install

# Create environment file
cp .env.example .env

# Edit .env (minimal setup)
nano .env
```

**Minimal `.env` configuration:**
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/chitfund
JWT_SECRET=your-secret-key-here
```

```bash
# Start backend
npm run dev

# You should see:
# 🚀 Backend server running on port 5000
# 📡 Health check: http://localhost:5000/health
```

### Step 2: Frontend Setup
```bash
# Open new terminal, go to project root
cd ..

# Create frontend environment file
cp .env.example .env.local

# Edit .env.local
nano .env.local
```

**Minimal `.env.local` configuration:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
# Start frontend
npm run dev

# You should see:
# ✓ Global fetch wrapper initialized - API calls will route to: http://localhost:5000
# ▲ Next.js 14.x
# - Local: http://localhost:3000
```

### Step 3: Test
1. Open browser: `http://localhost:3000`
2. Try to login
3. Create an invoice
4. Everything should work normally!

---

## 🎯 Production Deployment

### Backend Deployment (Choose One)

#### Option A: Railway (Easiest - 5 minutes)

1. **Sign up**: https://railway.app
2. **New Project** → **Deploy from GitHub**
3. **Settings**:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. **Environment Variables** (add these):
   ```
   PORT=5000
   NODE_ENV=production
   FRONTEND_URL=https://your-hostinger-domain.com
   MONGODB_URI=your-mongodb-atlas-connection
   JWT_SECRET=super-secret-key-change-this
   MSG91_AUTH_KEY=your-msg91-key
   MSG91_SENDER_ID=SHRENF
   MSG91_ROUTE=4
   ```
5. **Deploy** → Copy your Railway URL (e.g., `https://your-app.up.railway.app`)

#### Option B: Render (Free tier)

1. **Sign up**: https://render.com
2. **New Web Service**
3. **Connect Repository**
4. **Settings**:
   - Name: `chitfund-backend`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add same environment variables as Railway
6. **Create** → Copy your Render URL

#### Option C: VPS (DigitalOcean, AWS, etc.)

```bash
# SSH into server
ssh user@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone your-repo-url
cd shri_iniya_chit_funds/backend

# Install dependencies
npm install

# Create .env
nano .env
# Add all production environment variables

# Install PM2
sudo npm install -g pm2

# Start backend
pm2 start server.js --name chitfund-backend
pm2 save
pm2 startup
```

Your backend is now running at `http://your-server-ip:5000`

### Frontend Deployment (Hostinger)

#### Method 1: Static Export (Recommended for Hostinger)

```bash
# In project root

# 1. Update environment variables
nano .env.local
```

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

```bash
# 2. Build for production
npm run build

# 3. Export static site
# Add to package.json if not present:
npm run build && npx next export

# This creates 'out' folder with static files
```

#### Method 2: Upload to Hostinger

**Via File Manager:**
1. Login to Hostinger
2. Go to File Manager
3. Navigate to `public_html`
4. Delete old files
5. Upload all files from `out` folder
6. Done!

**Via FTP:**
```bash
# Install FTP client
npm install -g ftp-deploy

# Create .ftp-deploy.json
{
  "host": "ftp.your-domain.com",
  "user": "your-username",
  "password": "your-password",
  "localRoot": "./out",
  "remoteRoot": "/public_html"
}

# Deploy
ftp-deploy
```

---

## ✅ Verification Checklist

### Backend
- [ ] Health check works: `curl https://your-backend-url/health`
- [ ] Returns: `{"status":"OK","message":"Backend server is running"}`
- [ ] Environment variables set correctly
- [ ] MongoDB connection working
- [ ] CORS allows your frontend domain

### Frontend
- [ ] .env.local has correct NEXT_PUBLIC_API_URL
- [ ] Build completes without errors
- [ ] Static files generated in `out` folder
- [ ] Uploaded to Hostinger
- [ ] Website loads

### Integration
- [ ] Login works
- [ ] Dashboard loads
- [ ] Can create invoices
- [ ] SMS notifications work (if configured)
- [ ] No CORS errors in browser console

---

## 🔧 Common Issues & Fixes

### Issue 1: "CORS Error"
**Problem**: Browser shows CORS policy error

**Fix**:
```bash
# Backend .env
FRONTEND_URL=https://your-exact-domain.com  # Must match exactly!
```

### Issue 2: "401 Unauthorized"
**Problem**: All API calls fail with 401

**Fix**:
1. Check JWT_SECRET is set in backend .env
2. Clear browser cookies
3. Login again

### Issue 3: "Connection Refused"
**Problem**: Frontend can't reach backend

**Fix**:
1. Check backend is running: `curl https://your-backend-url/health`
2. Check NEXT_PUBLIC_API_URL in frontend .env.local
3. Verify no firewall blocking

### Issue 4: "Database Connection Failed"
**Problem**: Backend can't connect to MongoDB

**Fix**:
1. Check MONGODB_URI is correct
2. For MongoDB Atlas: Whitelist backend server IP
3. Test connection: `mongo "your-connection-string"`

---

## 🎉 You're Done!

Your application is now:
- ✅ Frontend on Hostinger
- ✅ Backend on Railway/Render/VPS
- ✅ Fully separated and scalable
- ✅ No code changes required

## 📞 Need Help?

1. Check `DEPLOYMENT_GUIDE.md` for detailed instructions
2. Check `backend/README.md` for backend-specific info
3. Review console logs for errors
4. Test with `curl` commands

---

## 🚀 Useful Commands

```bash
# Test backend locally
cd backend && npm run dev

# Test frontend locally  
npm run dev

# Run both together
npm run dev:fullstack

# Build frontend for production
npm run build

# Install backend dependencies
npm run backend:install

# Check backend health
curl http://localhost:5000/health

# View backend logs (PM2)
pm2 logs chitfund-backend

# Restart backend (PM2)
pm2 restart chitfund-backend
```

---

**Estimated Setup Time**: 
- Local testing: 5 minutes
- Production deployment: 15-30 minutes

**Happy Deploying! 🎊**
