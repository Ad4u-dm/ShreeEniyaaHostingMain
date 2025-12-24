# Shree Eniyaa Chitfunds (P) Ltd. - Management System

A complete chit fund management system with separated frontend and backend architecture for scalable deployment.

## 🏗️ Architecture

This application is built with a **modern separated architecture**:

- **Frontend**: Next.js 14 with TypeScript (Deploy to Hostinger)
- **Backend**: Express.js REST API (Deploy to Railway/Render/VPS)
- **Database**: MongoDB (MongoDB Atlas)
- **SMS**: MSG91 Integration

---

## 📚 Quick Links

- **[🚀 Quick Start Guide](QUICK_START.md)** - Get running in 5 minutes
- **[📖 Deployment Guide](DEPLOYMENT_GUIDE.md)** - Complete deployment instructions  
- **[✅ Deployment Checklist](DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist
- **[📊 Separation Summary](SEPARATION_SUMMARY.md)** - Architecture details
- **[🔧 Backend README](backend/README.md)** - Backend API docs
- **[📱 SMS Setup Guide](SMS_SETUP_GUIDE.md)** - MSG91 configuration

---

## ✨ Features

### Invoice Management
- ✅ Create and manage invoices with automatic calculations
- ✅ Automatic receipt number generation
- ✅ Due number and arrear tracking
- ✅ Thermal receipt printing (80mm)
- ✅ PDF export and email delivery

### Customer Management
- ✅ Customer enrollment in chit plans
- ✅ Member number assignment
- ✅ Profile management
- ✅ Payment history tracking

### Plan Management
- ✅ Multiple chit fund plans
- ✅ Monthly installment tracking
- ✅ Dividend calculations
- ✅ Duration management

### SMS Integration
- ✅ Automatic payment confirmation SMS
- ✅ Payment reminders & due alerts
- ✅ MSG91 with DLT support
- ✅ SMS logging and tracking

### Reports & Analytics
- ✅ Daily invoice reports
- ✅ Staff performance tracking
- ✅ Plan-wise and user-wise reports
- ✅ PDF export functionality

### Security & Access Control
- ✅ Role-based access (Admin/Staff/User)
- ✅ JWT authentication
- ✅ Secure password hashing
- ✅ CORS protection

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Git

### Local Development (5 minutes)

**1. Clone & Setup Backend**
```bash
git clone <your-repo-url>
cd shri_iniya_chit_funds/backend
npm install
cp .env.example .env
# Edit .env with MongoDB URI and secrets
npm run dev
# Backend runs on http://localhost:5000
```

**2. Setup Frontend**
```bash
# New terminal, project root
cd ..
npm install
cp .env.example .env.local
# Edit: NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev
# Frontend runs on http://localhost:3000
```

**3. Test**
Visit `http://localhost:3000` - Everything works!

---

## 📦 Deployment

### Backend Deployment (Choose one)

**Railway** (Recommended - Free tier):
1. Sign up at railway.app
2. Deploy from GitHub
3. Set root: `backend`
4. Add environment variables
5. Deploy!

**Other Options**: Render, VPS, AWS

### Frontend Deployment (Hostinger)

```bash
# Update environment
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app

# Build
npm run build
npx next export

# Upload 'out' folder to Hostinger public_html
```

**Complete Instructions**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 📁 Project Structure

```
shri_iniya_chit_funds/
├── backend/                    # Standalone Express backend
│   ├── server.js              # Server entry point
│   ├── routes.js              # API configuration
│   └── package.json
│
├── app/                       # Next.js frontend
│   ├── admin/                 # Admin pages
│   ├── staff/                 # Staff pages
│   └── api/                   # API routes (used by backend)
│
├── lib/
│   ├── apiClient.ts           # Backend API client
│   ├── fetchWrapper.ts        # Automatic routing
│   └── ...
│
├── models/                    # MongoDB models
│   ├── User.ts
│   ├── Invoice.ts
│   └── ...
│
└── components/                # React components
```

---

## 🛠️ Tech Stack

**Frontend**: Next.js 14, TypeScript, Tailwind CSS, Shadcn UI  
**Backend**: Express.js, MongoDB, Mongoose, JWT  
**SMS**: MSG91 with DLT support  
**Hosting**: Hostinger (Frontend) + Railway/Render (Backend)

---

## 🔑 Environment Variables

### Frontend `.env.local`
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Backend `.env`
```env
PORT=5000
FRONTEND_URL=https://your-domain.com
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
MSG91_AUTH_KEY=your-msg91-key
```

Full configuration: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## ✅ Key Benefits of Separated Architecture

- **Scalable**: Frontend & backend scale independently
- **Secure**: Database credentials never exposed
- **Cost-Effective**: Use free hosting tiers
- **Fast**: Static frontend on CDN
- **Zero Breaking Changes**: All existing code works!

---

## 🧪 Testing

```bash
# Test backend
cd backend && npm run dev
curl http://localhost:5000/health

# Test frontend
npm run dev
# Visit http://localhost:3000
```

---

## 📖 Documentation

All documentation is in the root folder:

- `QUICK_START.md` - 5-minute setup guide
- `DEPLOYMENT_GUIDE.md` - Complete deployment
- `DEPLOYMENT_CHECKLIST.md` - Deployment steps
- `SEPARATION_SUMMARY.md` - Architecture details
- `SMS_SETUP_GUIDE.md` - MSG91 setup
- `backend/README.md` - Backend API docs

---

## 🎯 Getting Started

1. Read [QUICK_START.md](QUICK_START.md)
2. Test locally (5 minutes)
3. Deploy backend to Railway
4. Deploy frontend to Hostinger
5. Follow [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
6. Go live! 🚀

---

## 📝 License

Private - Shree Eniyaa Chitfunds (P) Ltd.  
All rights reserved.

---

**Built with ❤️ for Shree Eniyaa Chitfunds (P) Ltd.**

Need help? Start with [QUICK_START.md](QUICK_START.md)!
