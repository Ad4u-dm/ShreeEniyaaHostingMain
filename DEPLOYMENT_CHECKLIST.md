# 📋 Deployment Checklist

Use this checklist to ensure smooth deployment of your separated frontend and backend.

---

## 🔴 Pre-Deployment Setup

### Backend Preparation
- [ ] Navigate to `backend` folder
- [ ] Run `npm install` successfully
- [ ] Copy `.env.example` to `.env`
- [ ] Update `.env` with your values:
  - [ ] `MONGODB_URI` - Your MongoDB connection string
  - [ ] `JWT_SECRET` - Strong random string (use `openssl rand -base64 32`)
  - [ ] `MSG91_AUTH_KEY` - Your MSG91 API key
  - [ ] `MSG91_SENDER_ID` - Your approved sender ID
  - [ ] `MSG91_ENTITY_ID` - Your DLT entity ID
  - [ ] Template IDs for SMS
- [ ] Test locally: `npm run dev`
- [ ] Verify health check works: `curl http://localhost:5000/health`

### Frontend Preparation
- [ ] Stay in project root
- [ ] Copy `.env.example` to `.env.local`
- [ ] Update `.env.local`:
  - [ ] `NEXT_PUBLIC_API_URL=http://localhost:5000` (for local testing)
- [ ] Run `npm run dev`
- [ ] Test login works
- [ ] Test creating invoice
- [ ] Check browser console - no errors

---

## 🟡 Backend Deployment

### Choose Your Platform:

#### Option A: Railway ✅ Recommended
- [ ] Sign up at https://railway.app
- [ ] Create new project
- [ ] Connect GitHub repository
- [ ] Configure settings:
  - [ ] Root directory: `backend`
  - [ ] Build command: `npm install`
  - [ ] Start command: `npm start`
- [ ] Add environment variables (copy from backend/.env)
- [ ] Deploy
- [ ] Copy Railway URL (e.g., `https://xyz.railway.app`)
- [ ] Test: `curl https://your-url.railway.app/health`

#### Option B: Render
- [ ] Sign up at https://render.com
- [ ] New Web Service
- [ ] Connect repository
- [ ] Settings:
  - [ ] Name: `chitfund-backend`
  - [ ] Root: `backend`
  - [ ] Build: `npm install`
  - [ ] Start: `npm start`
- [ ] Add environment variables
- [ ] Create Web Service
- [ ] Copy Render URL
- [ ] Test health endpoint

#### Option C: VPS (DigitalOcean/AWS)
- [ ] SSH into server
- [ ] Install Node.js 18+
- [ ] Install PM2: `sudo npm install -g pm2`
- [ ] Clone repository
- [ ] Navigate to `backend`
- [ ] Run `npm install`
- [ ] Create `.env` file
- [ ] Start: `pm2 start server.js --name chitfund-backend`
- [ ] Save: `pm2 save && pm2 startup`
- [ ] Configure firewall to allow port 5000
- [ ] Test: `curl http://your-ip:5000/health`

### Backend Deployment Verification
- [ ] Health endpoint returns OK
- [ ] Can login via API (test with curl/Postman)
- [ ] Database connection works
- [ ] Environment variables loaded correctly
- [ ] CORS allows your frontend domain
- [ ] SMS sending works (if configured)

---

## 🟢 Frontend Deployment

### Update Environment
- [ ] Update `.env.local`:
  ```env
  NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
  NEXT_PUBLIC_APP_URL=https://your-domain.com
  ```

### Build for Production
- [ ] Run `npm run build`
- [ ] Build completes without errors
- [ ] Run `npx next export`
- [ ] `out` folder created with files

### Deploy to Hostinger

#### Method 1: File Manager
- [ ] Login to Hostinger control panel
- [ ] Go to File Manager
- [ ] Navigate to `public_html` (or your domain folder)
- [ ] Delete old files (backup first!)
- [ ] Upload all files from `out` folder
- [ ] Verify upload completed

#### Method 2: FTP
- [ ] Install FTP client (FileZilla)
- [ ] Connect to Hostinger:
  - Host: `ftp.your-domain.com`
  - Username: Your FTP username
  - Password: Your FTP password
- [ ] Navigate to `/public_html`
- [ ] Upload files from `out` folder
- [ ] Verify upload completed

### Frontend Deployment Verification
- [ ] Website loads at your domain
- [ ] No 404 errors for pages
- [ ] CSS/styling loads correctly
- [ ] Images load correctly
- [ ] Check browser console - no errors

---

## 🔵 Integration Testing

### Authentication
- [ ] Can access login page
- [ ] Can login with valid credentials
- [ ] Token stored in localStorage
- [ ] Redirected to dashboard after login
- [ ] Can logout
- [ ] Invalid credentials show error

### Dashboard
- [ ] Dashboard loads
- [ ] Statistics display correctly
- [ ] No API errors in console
- [ ] Data loads from backend

### Invoice Creation
- [ ] Can access invoice creation page
- [ ] Can select customer
- [ ] Can select plan
- [ ] Can create invoice
- [ ] Invoice saves successfully
- [ ] Receipt number generated
- [ ] SMS sent (if configured)

### CORS Verification
- [ ] No CORS errors in browser console
- [ ] Cookies work across domains
- [ ] Authorization headers sent correctly
- [ ] API responses received

### Mobile Testing
- [ ] Website works on mobile
- [ ] Layout responsive
- [ ] Can navigate pages
- [ ] Can create invoices

---

## 🟣 Post-Deployment

### Security
- [ ] Change default JWT_SECRET
- [ ] Use strong passwords
- [ ] MongoDB access restricted
- [ ] HTTPS enabled on both domains
- [ ] API keys not exposed in frontend
- [ ] Environment variables secured

### Monitoring
- [ ] Backend logs accessible
- [ ] Database connection stable
- [ ] No memory leaks
- [ ] Error tracking setup (optional)

### Backup
- [ ] Database backup configured
- [ ] Code backed up in Git
- [ ] Environment variables documented
- [ ] Deployment process documented

### Performance
- [ ] Frontend loads fast
- [ ] API responses quick (< 1s)
- [ ] No slow queries
- [ ] Caching working (if configured)

---

## 📊 Final Verification

### Smoke Tests
- [ ] Login → Dashboard → Create Invoice → Logout
- [ ] Search customers
- [ ] View reports
- [ ] Send SMS (if configured)
- [ ] Print receipt

### Cross-Browser Testing
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge

### Production Readiness
- [ ] All features working
- [ ] No console errors
- [ ] No broken links
- [ ] SMS working (if configured)
- [ ] Database operations fast
- [ ] Users can login and use system

---

## 🎉 Launch!

Once all checkboxes are ticked:
- [ ] Announce to team
- [ ] Train users if needed
- [ ] Monitor for first few hours
- [ ] Fix any issues quickly
- [ ] Celebrate! 🎊

---

## 📞 Emergency Contacts

### If Something Breaks

**Backend Issues:**
1. Check Railway/Render logs
2. Verify environment variables
3. Test database connection
4. Check `/health` endpoint
5. Restart backend service

**Frontend Issues:**
1. Clear browser cache
2. Check browser console
3. Verify API_URL is correct
4. Check network tab
5. Re-upload files to Hostinger

**Database Issues:**
1. Check MongoDB Atlas status
2. Verify connection string
3. Check IP whitelist
4. Review database logs

---

## 📝 Notes

**Backend URL**: ________________________________

**Frontend URL**: ________________________________

**Database**: ___________________________________

**Deployment Date**: ____________________________

**Deployed By**: ________________________________

---

## 🔗 Quick Links

- [Quick Start Guide](QUICK_START.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Backend README](backend/README.md)
- [SMS Setup Guide](SMS_SETUP_GUIDE.md)

---

**Good luck with your deployment! 🚀**
