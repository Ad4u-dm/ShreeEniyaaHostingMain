// SMS MODEL TEMPORARILY COMMENTED OUT - WAITING FOR DLT APPROVAL
/*
import mongoose from 'mongoose';

const SMSLogSchema = new mongoose.Schema({
  // Recipient Details
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  phone: { type: String, required: true }, // Changed from phoneNumber to phone
  
  // Message Details
  message: { type: String, required: true }, // Changed from messageText to message
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'failed'], // Simplified enum
    default: 'pending' 
  },
  
  // MSG91 Response
  requestId: { type: String },
  errorMessage: { type: String },
  
  // Staff Details
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Timestamps
  sentAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update updatedAt on save
SMSLogSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const SMSLog = mongoose.models.SMSLog || mongoose.model('SMSLog', SMSLogSchema);
export default SMSLog;
*/

// Temporary placeholder to prevent import errors
export const SMSLog = null;
export default null;