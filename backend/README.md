# Shri Iniya Chitfunds - Backend API Server

This is the standalone backend API server for the Shri Iniya Chitfunds application.

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start development server
npm run dev
```

Server will start on `http://localhost:5000`

### Production

```bash
# Install dependencies
npm install

# Start production server
npm start
```

## 📋 Environment Variables

Copy `.env.example` to `.env` and update the following:

```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key
MSG91_AUTH_KEY=your-msg91-key
```

## 🔌 API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Plans
- `GET /api/plans` - List chit fund plans
- `POST /api/plans` - Create plan
- `GET /api/plans/:id` - Get plan
- `PUT /api/plans/:id` - Update plan

### SMS
- `POST /api/sms/send` - Send SMS
- `GET /api/sms/logs` - Get SMS logs

And many more... (see routes.js for full list)

## 🌐 Deployment

### Railway

1. Create new project on [railway.app](https://railway.app)
2. Connect GitHub repository
3. Set root directory to `backend`
4. Add environment variables
5. Deploy!

### Render

1. Create new Web Service on [render.com](https://render.com)
2. Connect GitHub repository
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables
7. Deploy!

### VPS (Ubuntu/Debian)

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone and setup
git clone your-repo-url
cd backend
npm install

# Create .env file
nano .env

# Start with PM2
pm2 start server.js --name chitfund-backend
pm2 save
pm2 startup
```

## 🔒 Security

- All passwords are hashed with bcrypt
- JWT tokens for authentication
- CORS configured for frontend domain only
- Helmet.js for security headers
- Environment variables for secrets

## 📊 Monitoring

### PM2 (if using VPS)

```bash
# View logs
pm2 logs chitfund-backend

# Monitor
pm2 monit

# Restart
pm2 restart chitfund-backend
```

### Railway/Render
Check their respective dashboards for logs and metrics.

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

## 🛠️ Tech Stack

- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **CORS** - Cross-origin requests
- **Helmet** - Security
- **Morgan** - Logging

## 📝 License

Private - Shri Iniya Chitfunds (P) Ltd.
