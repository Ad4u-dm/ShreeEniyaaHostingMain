import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  planId: { type: String, unique: true }, // Auto-generated in pre-save hook
  planName: { type: String, required: true, trim: true }, // Changed from plan_name
  totalAmount: { type: Number, required: true, min: 0 }, // Changed from total_value
  duration: { type: Number, required: true, min: 1 }, // Changed from months
  planType: { 
    type: String, 
    enum: ['monthly', 'weekly', 'daily'], 
    default: 'monthly' 
  },
  
  // Month-wise payment structure
  monthlyData: [{
    monthNumber: { type: Number, required: true, min: 1 }, // Changed from month_number
    installmentAmount: { type: Number, required: true, min: 0 }, // Changed from installment_amount
    dividend: { type: Number, default: 0, min: 0 },
    payableAmount: { type: Number, required: true, min: 0 } // Changed from payable_amount
  }],
  
  // For backward compatibility and quick access
  monthlyAmount: { type: Number }, // Average monthly amount for display
  totalMembers: { type: Number, default: 20 }, // Max members allowed
  
  // Commission & Charges
  commissionRate: { type: Number, default: 5 }, // Percentage
  processingFee: { type: Number, default: 0 },
  
  // Plan Status
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'completed', 'cancelled'], 
    default: 'active' 
  },
  
  // Auction Details (optional for compatibility)
  auctionDay: { type: Number, default: 1 }, // Day of month for auction
  auctionTime: { type: String, default: '10:00' }, // Time for auction
  
  // Plan Description
  description: { type: String },
  terms: { type: String },
  
  // Created by
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Generate planId automatically
planSchema.pre('save', async function(next) {
  if (!this.planId) {
    const count = await mongoose.model('Plan').countDocuments();
    this.planId = `PLAN${String(count + 1).padStart(4, '0')}`;
  }
  
  // Calculate average monthly amount for display
  if (this.monthlyData && this.monthlyData.length > 0) {
    const totalPayable = this.monthlyData.reduce((sum, month) => sum + month.payableAmount, 0);
    this.monthlyAmount = Math.round(totalPayable / this.monthlyData.length);
  }
  
  this.updatedAt = new Date();
  next();
});

// Add indexes for performance
planSchema.index({ planId: 1 });
planSchema.index({ status: 1 });
planSchema.index({ createdBy: 1 });

let Plan: any;
try {
  Plan = mongoose.model('Plan');
} catch {
  Plan = mongoose.model('Plan', planSchema);
}

export default Plan;
