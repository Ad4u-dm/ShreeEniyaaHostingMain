import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import connectDB from '@/lib/mongodb';
import SMSLog from '@/models/SMSLog';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export interface SMSData {
  userId: string;
  phoneNumber: string;
  messageType: 'payment_reminder' | 'payment_confirmation' | 'auction_notification' | 'welcome' | 'general';
  messageText: string;
  triggeredBy?: string;
  enrollmentId?: string;
  paymentId?: string;
  isAutomatic?: boolean;
}

// SMS Templates
export const SMS_TEMPLATES = {
  payment_reminder: (name: string, amount: number, dueDate: string, planName: string) => 
    `Dear ${name}, your payment of ₹${amount.toLocaleString('en-IN')} for ${planName} is due on ${dueDate}. Please pay on time to avoid penalty. - ChitFund Management`,
  
  payment_confirmation: (name: string, amount: number, receiptNo: string, planName: string) => 
    `Dear ${name}, we received your payment of ₹${amount.toLocaleString('en-IN')} for ${planName}. Receipt No: ${receiptNo}. Thank you! - ChitFund Management`,
  
  auction_notification: (name: string, planName: string, auctionDate: string) => 
    `Dear ${name}, auction for ${planName} is scheduled on ${auctionDate}. Please attend or submit your bid. - ChitFund Management`,
  
  welcome: (name: string, planName: string, memberNumber: number) => 
    `Welcome ${name}! You're successfully enrolled in ${planName} as Member #${memberNumber}. Our team will contact you soon. - ChitFund Management`,
  
  general: (message: string) => message
};

// Send SMS using Firebase Cloud Messaging (for web notifications)
// In production, you would integrate with SMS gateway like Twilio, AWS SNS, etc.
export async function sendSMS(smsData: SMSData): Promise<boolean> {
  try {
    await connectDB();
    
    // Create SMS log entry
    const smsLog = new SMSLog({
      userId: smsData.userId,
      phoneNumber: smsData.phoneNumber,
      messageType: smsData.messageType,
      messageText: smsData.messageText,
      triggeredBy: smsData.triggeredBy,
      enrollmentId: smsData.enrollmentId,
      paymentId: smsData.paymentId,
      isAutomatic: smsData.isAutomatic ?? true,
      status: 'pending'
    });
    
    await smsLog.save();
    
    // Here you would integrate with actual SMS service
    // For demo purposes, we'll simulate SMS sending
    
    try {
      // Simulate SMS API call
      const success = await simulateSMSDelivery(smsData.phoneNumber, smsData.messageText);
      
      if (success) {
        smsLog.status = 'sent';
        smsLog.sentAt = new Date();
        // In real implementation, you might get delivery confirmation later
        smsLog.deliveredAt = new Date();
      } else {
        smsLog.status = 'failed';
        smsLog.failureReason = 'SMS gateway error';
      }
      
      await smsLog.save();
      return success;
      
    } catch (error) {
      smsLog.status = 'failed';
      smsLog.failureReason = error instanceof Error ? error.message : 'Unknown error';
      await smsLog.save();
      return false;
    }
    
  } catch (error) {
    console.error('SMS sending error:', error);
    return false;
  }
}

// Simulate SMS delivery (replace with real SMS gateway)
async function simulateSMSDelivery(phoneNumber: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      // Simulate 95% success rate
      const success = Math.random() > 0.05;
      console.log(`SMS ${success ? 'sent' : 'failed'} to ${phoneNumber}: ${message}`);
      resolve(success);
    }, 1000);
  });
}

// Send payment reminder SMS
export async function sendPaymentReminder(
  userId: string,
  name: string,
  phoneNumber: string,
  amount: number,
  dueDate: string,
  planName: string,
  enrollmentId: string,
  triggeredBy?: string
) {
  const messageText = SMS_TEMPLATES.payment_reminder(name, amount, dueDate, planName);
  
  return sendSMS({
    userId,
    phoneNumber,
    messageType: 'payment_reminder',
    messageText,
    enrollmentId,
    triggeredBy,
    isAutomatic: !triggeredBy
  });
}

// Send payment confirmation SMS
export async function sendPaymentConfirmation(
  userId: string,
  name: string,
  phoneNumber: string,
  amount: number,
  receiptNo: string,
  planName: string,
  paymentId: string,
  triggeredBy?: string
) {
  const messageText = SMS_TEMPLATES.payment_confirmation(name, amount, receiptNo, planName);
  
  return sendSMS({
    userId,
    phoneNumber,
    messageType: 'payment_confirmation',
    messageText,
    paymentId,
    triggeredBy,
    isAutomatic: !triggeredBy
  });
}

// Send welcome SMS
export async function sendWelcomeSMS(
  userId: string,
  name: string,
  phoneNumber: string,
  planName: string,
  memberNumber: number,
  enrollmentId: string,
  triggeredBy?: string
) {
  const messageText = SMS_TEMPLATES.welcome(name, planName, memberNumber);
  
  return sendSMS({
    userId,
    phoneNumber,
    messageType: 'welcome',
    messageText,
    enrollmentId,
    triggeredBy,
    isAutomatic: !triggeredBy
  });
}

// Get SMS logs for admin/staff
export async function getSMSLogs(
  userId?: string,
  messageType?: string,
  status?: string,
  limit: number = 50
) {
  try {
    await connectDB();
    
    let query: any = {};
    if (userId) query.userId = userId;
    if (messageType) query.messageType = messageType;
    if (status) query.status = status;
    
    const logs = await SMSLog.find(query)
      .populate('userId', 'name email phone')
      .populate('triggeredBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit);
    
    return logs;
    
  } catch (error) {
    console.error('Get SMS logs error:', error);
    return [];
  }
}