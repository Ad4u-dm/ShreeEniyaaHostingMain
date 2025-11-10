import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  // Basic Info
  userId: { type: String, unique: true }, // Auto-generated in pre-save hook
  email: { type: String, required: true, unique: true },
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
  password: { type: String, required: true },
  lastLogin: { type: Date },
  
  // Staff/Admin specific
  employeeId: { type: String }, // For staff/admin
  joiningDate: { type: Date, default: Date.now },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Which admin created this staff
  
  // Profile
  profileImage: { type: String },
  dateOfBirth: { type: Date },
  
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
  memberNumber: { type: String, unique: true }, // Auto-generated member number
  
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
  if (!this.userId) {
    // Find the highest existing userId and increment
    const lastUser = await mongoose.model('User').findOne({}, { userId: 1 }).sort({ userId: -1 });
    let nextNumber = 1;
    
    if (lastUser && lastUser.userId) {
      // Extract number from userId (e.g., "CF000020" -> 20)
      const match = lastUser.userId.match(/CF(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    this.userId = `CF${String(nextNumber).padStart(6, '0')}`;
  }
  
  // Generate member number if not exists
  if (!this.memberNumber && this.role === 'user') {
    const lastMember = await mongoose.model('User').findOne(
      { memberNumber: { $exists: true } }, 
      { memberNumber: 1 }
    ).sort({ memberNumber: -1 });
    
    let nextMemberNumber = 1001; // Start from 1001
    
    if (lastMember && lastMember.memberNumber) {
      const memberNum = parseInt(lastMember.memberNumber);
      if (!isNaN(memberNum)) {
        nextMemberNumber = memberNum + 1;
      }
    }
    
    this.memberNumber = String(nextMemberNumber);
  }
  
  this.updatedAt = new Date();
  next();
});

export default (mongoose.models.User || mongoose.model('User', UserSchema)) as any;