# ChitFund Management System

A comprehensive web-based application for managing chit fund operations, built with Next.js 15, MongoDB, and modern UI components.

## 🚀 Features

### Multi-Role Access Control
- **Admin Dashboard**: Complete system oversight, staff management, analytics
- **Staff Dashboard**: Customer management, payment collection, commission tracking
- **User Dashboard**: Plan tracking, payment history, upcoming payments

### Core Functionality
- **Plan Management**: Create and manage different chit fund plans
- **Customer Enrollment**: Enroll customers in plans with nominee details
- **Payment Processing**: Record payments with multiple methods (Cash, UPI, Online)
- **SMS Notifications**: Automated payment reminders and confirmations
- **Receipt Generation**: Professional PDF receipts with Indian formatting
- **Auction Management**: Track auction schedules and winners

### Professional Features
- **Indian Currency Formatting**: Proper display of amounts in lakhs/crores
- **Role-Based Security**: JWT authentication with role-based access
- **Responsive Design**: Professional glassmorphism UI design
- **Real-time Analytics**: Dashboard with key performance indicators
- **Payment Tracking**: Overdue detection and penalty calculation

## 🛠 Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Backend**: Next.js API Routes, MongoDB with Mongoose
- **Authentication**: JWT with bcryptjs
- **UI Components**: Tailwind CSS, Radix UI components
- **Database**: MongoDB Atlas (cloud) or local MongoDB
- **SMS Integration**: Firebase (ready for Twilio/AWS SNS)
- **PDF Generation**: React-PDF (for receipts)

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd invoify
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/chitfund
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   ```

4. **Start MongoDB** (if using local)
   ```bash
   # Make sure MongoDB is running
   mongod
   ```

5. **Seed the database**
   ```bash
   npm run seed-chitfund
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

## 👥 Demo Accounts

After seeding the database, you can use these demo accounts:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| Admin | admin@chitfund.com | admin123 | Full system access |
| Staff | staff@chitfund.com | staff123 | Customer & payment management |
| User | user@chitfund.com | user123 | Personal dashboard only |

## 🗂 Project Structure

```
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # Authentication endpoints
│   │   ├── dashboard/         # Dashboard data APIs
│   │   ├── enrollments/       # Customer enrollment APIs
│   │   ├── payments/          # Payment processing APIs
│   │   └── plans/             # Plan management APIs
│   ├── components/            # React components
│   │   ├── auth/              # Login/auth components
│   │   ├── dashboards/        # Role-specific dashboards
│   │   └── invoice/           # Invoice generation (legacy)
│   ├── dashboard/             # Dashboard pages
│   └── login/                 # Login page
├── lib/
│   ├── auth.ts               # Authentication utilities
│   ├── helpers.ts            # Indian number formatting
│   ├── mongodb.ts            # Database connection
│   └── utils.ts              # General utilities
├── models/                   # MongoDB schemas
│   ├── User.ts               # User accounts
│   ├── ChitPlan.ts           # Chit fund plans
│   ├── Enrollment.ts         # Customer enrollments
│   ├── Payment.ts            # Payment records
│   └── SMSLog.ts             # SMS tracking
├── services/
│   └── smsService.ts         # SMS integration
└── scripts/
    └── seed.ts               # Database seeding
```

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Role-Based Access Control**: Granular permissions by user role
- **HTTP-Only Cookies**: Secure token storage
- **Input Validation**: Comprehensive data validation
- **API Route Protection**: All sensitive endpoints secured

## 📊 Database Schema

### Users
- User accounts with roles (admin, staff, user)
- Profile information and contact details
- Staff assignments and hierarchy

### ChitPlans
- Plan configurations (amount, duration, members)
- Auction settings and commission rates
- Plan status tracking

### Enrollments
- Customer-plan relationships
- Member numbers and nominee details
- Payment schedules and status

### Payments
- Payment history with receipt tracking
- Multiple payment methods support
- Late payment penalties

### SMSLog
- SMS delivery tracking
- Message templates and status
- Retry mechanisms

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Docker
```bash
# Build and run with Docker
docker build -t chitfund-app .
docker run -p 3000:3000 chitfund-app
```

### Manual Deployment
```bash
npm run build
npm start
```

## 🔧 Configuration

### MongoDB Atlas Setup
1. Create account at mongodb.com
2. Create new cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env.local`

### SMS Integration
- Default: Firebase Cloud Messaging (for web notifications)
- Production: Integrate with Twilio, AWS SNS, or local SMS gateway
- Update `smsService.ts` for your preferred provider

## 📱 Features in Detail

### Admin Dashboard
- System-wide statistics and analytics
- Staff performance tracking
- Customer and plan management
- Revenue and payment analytics

### Staff Dashboard
- Assigned customer management
- Payment collection interface
- Commission tracking
- Due payment alerts

### User Dashboard
- Personal plan details
- Payment history with receipts
- Upcoming payment schedule
- Plan completion tracking

### Payment System
- Multiple payment methods
- Automatic receipt generation
- Late fee calculation
- Commission tracking

### SMS Notifications
- Payment reminders
- Payment confirmations
- Auction notifications
- Welcome messages

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the API documentation in `/api` routes

## 🗺 Roadmap

- [ ] Mobile app integration
- [ ] Advanced reporting and analytics
- [ ] Automated auction system
- [ ] Multi-language support
- [ ] Advanced SMS gateway integration
- [ ] Audit trail and compliance features
- [ ] Advanced permission system
- [ ] API rate limiting
- [ ] Data export/import tools
- [ ] Advanced notification system

---

Built with ❤️ for efficient chit fund management