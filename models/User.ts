import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  // Basic Info
  userId: { type: String, unique: true }, // Auto-generated in pre-save hook
  email: { 
    type: String, 
    unique: true, 
    sparse: true, // Allows multiple documents with null/undefined email
    required: function(this: any) {
      return this.role === 'staff' || this.role === 'admin';
    }
  },
  phone: { type: String, required: true },
  name: { type: String, required: true },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  
  // User Role & Status
  role: { 
    type: String, 
    enum: ['admin', 'staff', 'user'], 
    default: 'user' 
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'suspended'], 
    default: 'active' 
  },
  
  // Authentication
  password: { 
    type: String, 
    required: function(this: any) {
      return this.role === 'staff' || this.role === 'admin';
    }
  },
  lastLogin: { type: Date },
  
  // Staff/Admin specific
  employeeId: { type: String }, // For staff/admin
  joiningDate: { type: Date, default: Date.now },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Which admin created this staff
  
  // Profile
  profileImage: { type: String },
  dateOfBirth: { type: Date },
  weddingDate: { type: Date },
  
  // Chit Fund Customer specific fields
  occupation: { type: String },
  nomineeName: { type: String },
  nomineeRelation: { 
    type: String, 
    enum: ['spouse', 'father', 'mother', 'son', 'daughter', 'brother', 'sister', 'other'] 
  },
  emergencyContact: { type: String },
  
  // Additional profile fields
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Staff/Admin who created this user
  
  // Chit Fund Tracking Data
  memberNumber: { 
    type: String, 
    unique: true
  }, // Auto-generated unique member number for all users
  
  // Current Active Enrollment Summary
  currentEnrollment: {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChitPlan' },
    planName: { type: String },
    enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment' },
    enrollmentDate: { type: Date },
    monthlyAmount: { type: Number },
    totalAmount: { type: Number },
    status: { 
      type: String, 
      enum: ['active', 'completed', 'defaulted', 'cancelled'], 
      default: 'active' 
    }
  },
  
  // Payment Tracking Summary
  paymentSummary: {
    totalPaymentsMade: { type: Number, default: 0 },
    totalAmountPaid: { type: Number, default: 0 },
    lastPaymentDate: { type: Date },
    lastPaymentAmount: { type: Number },
    pendingAmount: { type: Number, default: 0 },
    arrearAmount: { type: Number, default: 0 },
    nextDueDate: { type: Date },
    nextDueAmount: { type: Number, default: 0 },
    currentDueNumber: { type: Number, default: 1 }
  },
  
  // Historical Data
  enrollmentHistory: [{
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChitPlan' },
    planName: { type: String },
    enrollmentDate: { type: Date },
    completionDate: { type: Date },
    status: { 
      type: String, 
      enum: ['completed', 'cancelled', 'defaulted'] 
    },
    totalPaid: { type: Number },
    totalExpected: { type: Number }
  }],
  
  // Performance Metrics
  creditScore: {
    score: { type: Number, default: 100 }, // Out of 100
    onTimePayments: { type: Number, default: 0 },
    latePayments: { type: Number, default: 0 },
    missedPayments: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  
  // Contact & Communication Log
  communicationLog: [{
    date: { type: Date, default: Date.now },
    type: { 
      type: String, 
      enum: ['sms', 'call', 'email', 'visit', 'reminder'] 
    },
    message: { type: String },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    response: { type: String }
  }],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Generate userId and memberNumber automatically
UserSchema.pre('save', async function(next) {
  try {
    if (!this.userId) {
      // Keep incrementing until we find an unused userId
      // Start from the highest existing userId
      const lastUser = await mongoose.model('User').findOne({}, { userId: 1 }).sort({ userId: -1 });
      let nextNumber = 1;

      if (lastUser && lastUser.userId) {
        // Extract number from userId (e.g., "CF000020" -> 20)
        const match = lastUser.userId.match(/CF(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      // Keep trying until we find an unused userId (in case of gaps from deletions)
      let userId = `CF${String(nextNumber).padStart(6, '0')}`;
      let attempts = 0;
      const maxAttempts = 1000;

      while (attempts < maxAttempts) {
        const existing = await mongoose.model('User').findOne({ userId });
        if (!existing) {
          // Found an unused userId
          this.userId = userId;
          break;
        }
        // Try next number
        nextNumber++;
        userId = `CF${String(nextNumber).padStart(6, '0')}`;
        attempts++;
      }

      if (!this.userId) {
        throw new Error('Could not generate unique userId after ' + maxAttempts + ' attempts');
      }
    }
    
    // Generate member number if not exists (for all user types)
    if (!this.memberNumber) {
      let prefix = '';
      let startNumber = 1;
      
      switch (this.role) {
        case 'user':
          prefix = '';
          startNumber = 1001; // Customers start from 1001
          break;
        case 'staff':
          prefix = 'STF';
          startNumber = 1; // Staff start from STF001
          break;
        case 'admin':
          prefix = 'ADM';
          startNumber = 1; // Admins start from ADM001
          break;
        default:
          prefix = 'USR';
          startNumber = 1; // Fallback
      }
      
      let nextNumber = startNumber;
      let attempts = 0;
      const maxAttempts = 1000;
      
      while (attempts < maxAttempts) {
        const memberNumber = prefix ? `${prefix}${String(nextNumber).padStart(3, '0')}` : String(nextNumber);
        const existing = await mongoose.model('User').findOne({ memberNumber });
        
        if (!existing) {
          this.memberNumber = memberNumber;
          break;
        }
        
        nextNumber++;
        attempts++;
      }
      
      if (!this.memberNumber) {
        throw new Error('Could not generate unique memberNumber after ' + maxAttempts + ' attempts');
      }
    }
    
    this.updatedAt = new Date();
    next();
  } catch (error) {
    console.error('Error in User pre-save hook:', error);
    next(error as Error);
  }
});

export default (mongoose.models.User || mongoose.model('User', UserSchema)) as any;