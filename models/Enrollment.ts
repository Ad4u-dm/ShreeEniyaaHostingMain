import mongoose from 'mongoose';

const EnrollmentSchema = new mongoose.Schema({
  enrollmentId: { type: String, unique: true }, // Auto-generated in pre-save hook
  
  // References
  userId: { type: String, required: true }, // Custom string userId, no ref since it's not ObjectId
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true }, // Updated to use Plan model
  
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
  memberNumber: { type: String, required: true, unique: true }, // Customer's choice - must be unique
  
  // Nominee Details
  nominee: {
    name: { type: String },
    relationship: { type: String },
    phone: { type: String },
    address: { type: String }
  },
  
  // Staff Assignment
  assignedStaff: { type: String }, // Custom string userId, no ref since it's not ObjectId
  
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
    try {
      // Find the last enrollment by sorting by enrollmentId in descending order
      const lastEnrollment = await mongoose.model('Enrollment')
        .findOne({ enrollmentId: { $exists: true } })
        .sort({ enrollmentId: -1 })
        .select('enrollmentId')
        .lean() as { enrollmentId?: string } | null;

      let nextNumber = 1;
      if (lastEnrollment?.enrollmentId) {
        // Extract the number from the last enrollmentId (e.g., "ENR000034" -> 34)
        const match = lastEnrollment.enrollmentId.match(/ENR(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      this.enrollmentId = `ENR${String(nextNumber).padStart(6, '0')}`;
    } catch (error) {
      // Fallback to timestamp-based ID if there's an error
      this.enrollmentId = `ENR${Date.now()}`;
    }
  }
  this.updatedAt = new Date();
  next();
});

export default (mongoose.models.Enrollment || mongoose.model('Enrollment', EnrollmentSchema)) as any;