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
  
  // ChitFund Customer specific fields
  occupation: { type: String },
  nomineeName: { type: String },
  nomineeRelation: { 
    type: String, 
    enum: ['spouse', 'father', 'mother', 'son', 'daughter', 'brother', 'sister', 'other'] 
  },
  emergencyContact: { type: String },
  
  // Additional profile fields
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, ref: 'User' }, // Staff who created this customer
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Generate userId automatically
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
  this.updatedAt = new Date();
  next();
});

export default (mongoose.models.User || mongoose.model('User', UserSchema)) as any;