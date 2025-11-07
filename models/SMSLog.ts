import mongoose from 'mongoose';

const SMSLogSchema = new mongoose.Schema({
  smsId: { type: String, unique: true }, // Auto-generated in pre-save hook
  
  // Recipient Details
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  phoneNumber: { type: String, required: true },
  
  // Message Details
  messageType: { 
    type: String, 
    enum: ['payment_reminder', 'payment_confirmation', 'auction_notification', 'welcome', 'general'], 
    required: true 
  },
  messageText: { type: String, required: true },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'delivered', 'failed'], 
    default: 'pending' 
  },
  
  // Firebase Response
  firebaseMessageId: { type: String },
  firebaseResponse: { type: mongoose.Schema.Types.Mixed },
  
  // Delivery Details
  sentAt: { type: Date },
  deliveredAt: { type: Date },
  failureReason: { type: String },
  
  // Related Records
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment' },
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  
  // Staff Details
  triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isAutomatic: { type: Boolean, default: true },
  
  // Retry Logic
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  nextRetryAt: { type: Date },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Generate smsId automatically
SMSLogSchema.pre('save', async function(next) {
  if (!this.smsId) {
    const count = await mongoose.model('SMSLog').countDocuments();
    this.smsId = `SMS${String(count + 1).padStart(6, '0')}`;
  }
  this.updatedAt = new Date();
  next();
});

export default (mongoose.models.SMSLog || mongoose.model('SMSLog', SMSLogSchema)) as any;