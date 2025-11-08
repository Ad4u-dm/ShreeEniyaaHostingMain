import mongoose from 'mongoose';

const ChitPlanSchema = new mongoose.Schema({
  planId: { type: String, unique: true }, // Auto-generated in pre-save hook
  planName: { type: String, required: true },
  planType: { 
    type: String, 
    enum: ['monthly', 'weekly', 'daily'], 
    default: 'monthly' 
  },
  
  // Financial Details
  totalAmount: { type: Number, required: true }, // Total chit amount
  installmentAmount: { type: Number, required: true }, // Amount per installment
  duration: { type: Number, required: true }, // Duration in months/weeks/days
  totalMembers: { type: Number, required: true }, // Max members allowed
  
  // Commission & Charges
  commissionRate: { type: Number, default: 5 }, // Percentage
  processingFee: { type: Number, default: 0 },
  
  // Plan Status
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'completed', 'cancelled'], 
    default: 'active' 
  },
  
  // Auction Details
  auctionDay: { type: Number, default: 1 }, // Day of month for auction
  auctionTime: { type: String, default: '10:00' }, // Time for auction
  
  // Plan Description
  description: { type: String },
  terms: { type: String },
  
  // Created by
  createdBy: { type: String, ref: 'User', required: true },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Generate planId automatically
ChitPlanSchema.pre('save', async function(next) {
  if (!this.planId) {
    const count = await mongoose.model('ChitPlan').countDocuments();
    this.planId = `PLAN${String(count + 1).padStart(4, '0')}`;
  }
  this.updatedAt = new Date();
  next();
});

export default (mongoose.models.ChitPlan || mongoose.model('ChitPlan', ChitPlanSchema)) as any;