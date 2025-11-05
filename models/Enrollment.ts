import mongoose from 'mongoose';

const EnrollmentSchema = new mongoose.Schema({
  enrollmentId: { type: String, unique: true }, // Auto-generated in pre-save hook
  
  // References
  userId: { type: String, ref: 'User', required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChitPlan', required: true },
  
  // Enrollment Details
  enrollmentDate: { type: Date, default: Date.now },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  
  // Status
  status: { 
    type: String, 
    enum: ['active', 'completed', 'cancelled', 'defaulted'], 
    default: 'active' 
  },
  
  // Auction Status
  hasWonAuction: { type: Boolean, default: false },
  auctionWonMonth: { type: Number }, // Which installment month they won
  auctionAmount: { type: Number }, // Amount they bid/won with
  
  // Payment Summary
  totalPaid: { type: Number, default: 0 },
  totalDue: { type: Number, default: 0 },
  nextDueDate: { type: Date },
  
  // Member Position
  memberNumber: { type: Number }, // 1st member, 2nd member, etc.
  
  // Nominee Details
  nominee: {
    name: { type: String },
    relationship: { type: String },
    phone: { type: String },
    address: { type: String }
  },
  
  // Staff Assignment
  assignedStaff: { type: String, ref: 'User' },
  
  // Notes
  notes: [{ 
    text: String,
    addedBy: { type: String, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Generate enrollmentId automatically
EnrollmentSchema.pre('save', async function(next) {
  if (!this.enrollmentId) {
    const count = await mongoose.model('Enrollment').countDocuments();
    this.enrollmentId = `ENR${String(count + 1).padStart(6, '0')}`;
  }
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Enrollment || mongoose.model('Enrollment', EnrollmentSchema);