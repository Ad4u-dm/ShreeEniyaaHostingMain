import mongoose from 'mongoose';

const InvoiceSchema = new mongoose.Schema({
  invoiceId: { type: String, unique: true }, // Auto-generated in pre-save hook
  receiptNo: { type: String, unique: true }, // Sequential receipt number
  
  // References
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  customerId: { type: String, ref: 'User', required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChitPlan', required: true },
  createdBy: { type: String, ref: 'User', required: true }, // Staff who created invoice
  
  // Invoice Details
  invoiceDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  
  // Items (payments/installments included in this invoice)
  items: [{
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    installmentNumber: { type: Number },
    dueDate: { type: Date },
    type: { 
      type: String, 
      enum: ['installment', 'penalty', 'processing_fee', 'late_fee'], 
      default: 'installment' 
    }
  }],
  
  // Amounts
  subtotal: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  penaltyAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  
  // Payment Status
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], 
    default: 'draft' 
  },
  
  // Payment Details
  paidAmount: { type: Number, default: 0 },
  paidDate: { type: Date },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'online', 'bank_transfer', 'cheque', 'upi'] 
  },
  transactionId: { type: String },
  
  // Customer Details (snapshot at time of invoice creation)
  customerDetails: {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String
    }
  },
  
  // Plan Details (snapshot)
  planDetails: {
    planName: { type: String, required: true },
    monthlyAmount: { type: Number, required: true },
    duration: { type: Number },
    totalAmount: { type: Number }
  },
  
  // Direct receipt fields (simple storage, no calculations)
  memberNumber: String,
  dueNumber: String,
  memberName: String,
  paymentMonth: String, // YYYY-MM format for which month this payment is for
  dueAmount: Number,
  arrAmount: { type: Number, default: 0 }, // Gross arrear from previous invoice
  arrearAmount: { type: Number, default: 0 }, // Net arrear = arrAmount - receivedArrearAmount
  pendingAmount: { type: Number, default: 0 },
  receivedAmount: Number,
  receivedArrearAmount: { type: Number, default: 0 }, // Amount paid specifically for arrears
  balanceAmount: { type: Number, default: 0 },
  totalReceivedAmount: Number,
  issuedBy: { type: String, default: 'ADMIN' },
  
  // Invoice Settings
  notes: { type: String },
  terms: { type: String, default: 'Payment is due within 7 days of invoice date.' },
  
  // Email/SMS tracking
  sentDate: { type: Date },
  remindersSent: { type: Number, default: 0 },
  lastReminderDate: { type: Date },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Generate invoiceId automatically
InvoiceSchema.pre('save', async function(next) {
  if (!this.invoiceId) {
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceId = `INV${String(count + 1).padStart(6, '0')}`;
  }
  this.updatedAt = new Date();
  next();
});

// Calculate totals before saving
InvoiceSchema.pre('save', function(next) {
  this.subtotal = (this.items as any[]).reduce((sum: number, item: any) => sum + item.amount, 0);
  this.totalAmount = this.subtotal + this.taxAmount + this.penaltyAmount;
  next();
});

export default (mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema)) as any;