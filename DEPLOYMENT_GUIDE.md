# 🚀 Frontend & Backend Separation Guide

## Overview

Your application has been successfully separated into:
- **Frontend**: Next.js app (deploy to Hostinger)
- **Backend**: Express.js API server (deploy anywhere - VPS, Railway, Render, etc.)

---

## 📁 Project Structure

```
shri_iniya_chit_funds/
├── backend/                    # 🔴 NEW: Standalone backend server
│   ├── server.js              # Express server
│   ├── routes.js              # API route configuration
│   ├── package.json           # Backend dependencies
│   └── .env                   # Backend environment variables
│
├── app/                       # Frontend Next.js pages
│   ├── api/                   # ⚠️  API routes (now used by backend)
│   ├── admin/                 # Admin pages
│   ├── staff/                 # Staff pages
│   └── ...
│
├── lib/
│   ├── apiClient.ts           # 🔴 NEW: API client for backend calls
│   └── ...
│
└── .env.local                 # Frontend environment variables
```

---

## 🎯 What Changed?

### ✅ Backend (New Standalone Server)
- Express.js server that serves all API routes
- Runs independently on port 5000
- Can be deployed to any Node.js hosting

### ✅ Frontend (Modified Next.js)
- All `fetch('/api/...')` calls now go to backend server
- Uses `apiClient.ts` to automatically route to backend
- Deployed as static site to Hostinger

### ✅ API Client
- New `lib/apiClient.ts` handles all backend communication
- Automatically adds authentication headers
- Works with CORS for cross-origin requests

---

## 🔧 Setup Instructions

### Step 1: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Important backend `.env` settings:**
```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-hostinger-domain.com
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key
MSG91_AUTH_KEY=your-msg91-key
```

### Step 2: Frontend Setup

```bash
# Navigate to project root
cd ..

# Create .env.local file
cp .env.example .env.local

# Edit .env.local with your settings
nano .env.local
```

**Important frontend `.env.local` settings:**
```env
NEXT_PUBLIC_API_URL=https://your-backend-server.com
NEXT_PUBLIC_APP_URL=https://your-hostinger-domain.com
```

---

## 🚀 Deployment Guide

### Backend Deployment Options

#### Option 1: Railway (Recommended - Free tier available)

1. Go to [railway.app](https://railway.app)
2. Sign up and create new project
3. Connect GitHub repository
4. Select the `backend` folder as root
5. Add environment variables from `backend/.env.example`
6. Deploy!

**Railway will give you a URL like:** `https://your-app.railway.app`

#### Option 2: Render.com (Free tier available)

1. Go to [render.com](https://render.com)
2. Create new "Web Service"
3. Connect GitHub repository
4. Root directory: `backend`
5. Build command: `npm install`
6. Start command: `npm start`
7. Add environment variables
8. Deploy!

#### Option 3: DigitalOcean/AWS/Any VPS

```bash
# SSH into your server
ssh user@your-server-ip

# Clone repository
git clone your-repo-url
cd shri_iniya_chit_funds/backend

# Install dependencies
npm install

# Install PM2 for process management
npm install -g pm2

# Create .env file
nano .env

# Start backend with PM2
pm2 start server.js --name chitfund-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

### Frontend Deployment (Hostinger)

#### Step 1: Build Frontend

```bash
# In project root
npm run build

# This creates optimized production build in .next folder
```

#### Step 2: Export Static Site

Add to `package.json` scripts:
```json
"export": "next export"
```

Then run:
```bash
npm run build
npm run export
```

This creates an `out` folder with static files.

#### Step 3: Upload to Hostinger

1. Login to Hostinger control panel
2. Go to File Manager
3. Navigate to `public_html` (or your domain folder)
4. Upload all files from the `out` folder
5. Create `.env` file in root with:
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   ```

**Alternative: Deploy via FTP**
```bash
# Install FTP client
npm install -g ftp-deploy

# Create ftp-deploy.json
{
  "host": "ftp.your-domain.com",
  "user": "your-username",
  "password": "your-password",
  "localRoot": "./out",
  "remoteRoot": "/public_html",
  "include": ["*"]
}

# Deploy
ftp-deploy
```

---

## 🧪 Testing

### Test Backend Locally

```bash
cd backend
npm run dev

# Test health endpoint
curl http://localhost:5000/health

# Should return: {"status":"OK","message":"Backend server is running"}
```

### Test Frontend Locally

```bash
# In project root
# Update .env.local
NEXT_PUBLIC_API_URL=http://localhost:5000

npm run dev

# Visit http://localhost:3000
# Try logging in - it should call backend at localhost:5000
```

### Test Production Setup

1. Deploy backend first
2. Get backend URL (e.g., `https://api.yourapp.com`)
3. Update frontend `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=https://api.yourapp.com
   ```
4. Build and deploy frontend
5. Test login and invoice creation

---

## 🔐 Security Checklist

- [ ] Backend `.env` has strong `JWT_SECRET`
- [ ] CORS configured with your frontend domain
- [ ] MongoDB connection string is secure
- [ ] API keys (MSG91) are not exposed in frontend
- [ ] HTTPS enabled on both frontend and backend
- [ ] Cookie settings work with CORS

---

## 🐛 Troubleshooting

### CORS Errors

**Problem:** "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solution:**
1. Check backend `.env` has `FRONTEND_URL=your-hostinger-domain`
2. Ensure backend CORS includes your frontend domain
3. Check browser console for exact error

### Authentication Not Working

**Problem:** Login works but subsequent requests fail

**Solution:**
1. Check cookies are being sent (credentials: 'include')
2. Verify JWT_SECRET is same on backend
3. Check token expiration time
4. Clear browser cookies and try again

### API Calls Fail

**Problem:** All API calls return 404

**Solution:**
1. Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`
2. Verify backend is running and accessible
3. Test backend health endpoint directly
4. Check browser network tab for actual URL being called

---

## 📊 Monitoring

### Backend Logs

```bash
# If using PM2
pm2 logs chitfund-backend

# If using Railway/Render
# Check their dashboard logs
```

### Database Connection

```bash
# Test MongoDB connection
curl http://your-backend-url/health
```

---

## 🔄 Update Process

### Update Backend

```bash
cd backend
git pull origin main
npm install
pm2 restart chitfund-backend
```

### Update Frontend

```bash
git pull origin main
npm install
npm run build
# Upload new files to Hostinger
```

---

## 💰 Cost Estimates

### Backend Hosting
- **Railway**: Free tier → $5-10/month
- **Render**: Free tier → $7/month
- **DigitalOcean**: $6/month (basic droplet)
- **AWS/GCP**: $5-15/month

### Frontend Hosting
- **Hostinger**: Included in your hosting plan
- No additional cost!

### Database (MongoDB)
- **MongoDB Atlas**: Free tier (512MB) → $9/month (2GB)
- Included in most VPS setups

**Total Estimated Cost: $10-25/month**

---

## 🎉 You're All Set!

Your application is now separated and ready for deployment:

1. ✅ Backend server created
2. ✅ Frontend API client configured
3. ✅ Environment variables separated
4. ✅ Deployment guides provided
5. ✅ Security measures in place

**Next Steps:**
1. Deploy backend to Railway/Render/VPS
2. Update frontend environment variables
3. Build and deploy frontend to Hostinger
4. Test everything works!

For support or questions, check the troubleshooting section above.

**Happy Deploying! 🚀**
