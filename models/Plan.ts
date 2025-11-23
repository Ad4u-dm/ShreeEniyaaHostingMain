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

  // Array of monthly amounts - one per month (for direct access)
  monthlyAmount: { type: [Number], default: [] }, // Array: monthlyAmount[0] = month 1, monthlyAmount[1] = month 2, etc.

  // For backward compatibility - average monthly amount for display
  averageMonthlyAmount: { type: Number }, // Calculated average for UI display
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
  createdBy: { type: String, ref: 'User' }
}, { timestamps: true });

// Generate planId automatically
planSchema.pre('save', async function(next) {
  if (!this.planId) {
    const count = await mongoose.model('Plan').countDocuments();
    this.planId = `PLAN${String(count + 1).padStart(4, '0')}`;
  }
  
  // Build monthlyAmount array from monthlyData if not provided
  if (this.monthlyData && this.monthlyData.length > 0) {
    // If monthlyAmount array is not set or empty, build it from monthlyData
    if (!this.monthlyAmount || this.monthlyAmount.length === 0) {
      this.monthlyAmount = (this.monthlyData as any[])
        .sort((a: any, b: any) => a.monthNumber - b.monthNumber)
        .map((month: any) => month.payableAmount);
    }

    // Calculate average for display
    const totalPayable = (this.monthlyData as any[]).reduce((sum: number, month: any) => sum + month.payableAmount, 0);
    this.averageMonthlyAmount = Math.round(totalPayable / this.monthlyData.length);
  } else if (this.monthlyAmount && Array.isArray(this.monthlyAmount) && this.monthlyAmount.length > 0) {
    // If only monthlyAmount array is provided, calculate average
    const total = this.monthlyAmount.reduce((sum: number, amount: number) => sum + amount, 0);
    this.averageMonthlyAmount = Math.round(total / this.monthlyAmount.length);
  }
  
  this.updatedAt = new Date();
  next();
});

// Add indexes for performance
planSchema.index({ status: 1 });
planSchema.index({ createdBy: 1 });

let Plan: any;
try {
  Plan = mongoose.model('Plan');
} catch {
  Plan = mongoose.model('Plan', planSchema);
}

export default Plan;
