import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  paymentId: { type: String, unique: true }, // Auto-generated in pre-save hook
  
  // References
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  userId: { type: String, ref: 'User', required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChitPlan', required: true },
  
  // Payment Details
  amount: { type: Number, required: true },
  paymentType: { 
    type: String, 
    enum: ['installment', 'penalty', 'processing_fee', 'commission'], 
    default: 'installment' 
  },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'online', 'bank_transfer', 'cheque', 'upi'], 
    required: true 
  },
  
  // Payment Status
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'completed' 
  },
  
  // Installment Info
  installmentNumber: { type: Number }, // Which installment (1st, 2nd, etc.)
  dueDate: { type: Date },
  paidDate: { type: Date, default: Date.now },
  
  // Late Payment
  daysPastDue: { type: Number, default: 0 },
  penaltyAmount: { type: Number, default: 0 },
  
  // Transaction Details
  transactionId: { type: String }, // Bank/UPI transaction ID
  receiptNumber: { type: String },
  
  // Staff Details
  collectedBy: { type: String, ref: 'User' }, // Staff who collected
  collectionMethod: { 
    type: String, 
    enum: ['office', 'field', 'online'], 
    default: 'office' 
  },
  
  // Notes
  notes: { type: String },
  
  // Receipt Details
  receiptGenerated: { type: Boolean, default: false },
  receiptPath: { type: String },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Generate paymentId automatically
PaymentSchema.pre('save', async function(next) {
  if (!this.paymentId) {
    const count = await mongoose.model('Payment').countDocuments();
    this.paymentId = `PAY${String(count + 1).padStart(6, '0')}`;
  }
  
  // Generate receipt number
  if (!this.receiptNumber) {
    const today = new Date();
    const dateStr = today.getFullYear().toString().slice(-2) + 
                   String(today.getMonth() + 1).padStart(2, '0') + 
                   String(today.getDate()).padStart(2, '0');
    const count = await mongoose.model('Payment').countDocuments({
      createdAt: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      }
    });
    this.receiptNumber = `RCP${dateStr}${String(count + 1).padStart(3, '0')}`;
  }
  
  this.updatedAt = new Date();
  next();
});

export default (mongoose.models.Payment as any) || mongoose.model('Payment', PaymentSchema);