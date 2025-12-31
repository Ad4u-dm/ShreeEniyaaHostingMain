import mongoose from 'mongoose';

const SMSLogSchema = new mongoose.Schema({
  // Recipient Details
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  phoneNumber: { type: String, required: true }, // SMS phone number
  
  // Message Details
  message: { type: String, required: true },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'failed'],
    default: 'pending' 
  },
  
  // MSG91 Response
  requestId: { type: String },
  errorMessage: { type: String },
  
  // Provider
  provider: { type: String, default: 'MSG91' },
  
  // Staff Details
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Timestamps
  sentAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update updatedAt on save
SMSLogSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const SMSLog = (mongoose.models.SMSLog || mongoose.model('SMSLog', SMSLogSchema)) as any;
export { SMSLog };
export default SMSLog;
