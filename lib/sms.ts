// SMS SERVICE TEMPORARILY COMMENTED OUT - WAITING FOR DLT APPROVAL
/*
// SMS service using Fast2SMS (Indian provider, no DLT needed for testing)
import SMSLog from '@/models/SMSLog';
import connectDB from '@/lib/mongodb';

interface SMSResponse {
  success: boolean;
  message: string;
  requestId?: string;
  errorCode?: string;
}

class Fast2SMSService {
  private apiKey: string;
  private senderId: string;
  private route: string;
  private baseUrl = 'https://www.fast2sms.com/dev/bulkV2';

  constructor() {
    this.apiKey = process.env.FAST2SMS_API_KEY || '';
    this.senderId = process.env.FAST2SMS_SENDER_ID || 'FSTSMS';
    this.route = process.env.FAST2SMS_ROUTE || 'q';
  }

  async sendSMS(payload: { mobiles: string; message: string }): Promise<SMSResponse> {
    try {
      if (!this.apiKey) {
        throw new Error('Fast2SMS API Key not configured');
      }

      // Remove +91 if present, Fast2SMS expects 10-digit numbers
      let phoneNumber = payload.mobiles.replace(/^\+91/, '');
      
      const smsData = {
        authorization: this.apiKey,
        sender_id: this.senderId,
        message: payload.message,
        route: this.route,
        numbers: phoneNumber
      };

      console.log('Sending SMS via Fast2SMS:', {
        ...smsData,
        authorization: '[HIDDEN]'
      });

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'authorization': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          sender_id: this.senderId,
          message: payload.message,
          route: this.route,
          numbers: phoneNumber
        })
      });

      const result = await response.json();
      console.log('Fast2SMS Response:', result);

      if (result.return === true || result.message?.includes('SMS sent successfully')) {
        return {
          success: true,
          message: 'SMS sent successfully',
          requestId: result.request_id || 'FAST2SMS_' + Date.now()
        };
      }

      return {
        success: false,
        message: result.message || 'SMS sending failed',
        errorCode: result.code || 'UNKNOWN'
      };

    } catch (error: any) {
      console.error('Fast2SMS error:', error);
      return {
        success: false,
        message: error.message || 'SMS sending failed',
        errorCode: 'ERROR'
      };
    }
  }

  async sendBulkSMS(recipients: { phone: string; message: string }[]): Promise<SMSResponse[]> {
    const results: SMSResponse[] = [];
    
    for (const recipient of recipients) {
      const result = await this.sendSMS({
        mobiles: recipient.phone,
        message: recipient.message
      });
      results.push(result);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    return results;
  }

  async logSMS(data: {
    userId: string;
    phone: string;
    message: string;
    status: 'sent' | 'failed' | 'pending';
    requestId?: string;
    errorMessage?: string;
    sentBy: string;
  }) {
    try {
      await connectDB();
      
      const smsLog = new SMSLog({
        userId: data.userId,
        phone: data.phone,
        message: data.message,
        status: data.status,
        requestId: data.requestId,
        errorMessage: data.errorMessage,
        sentBy: data.sentBy,
        sentAt: new Date()
      });

      await smsLog.save();
      return smsLog;
    } catch (error) {
      console.error('Error logging SMS:', error);
      throw error;
    }
  }

  // Predefined message templates  
  getTemplate(type: string, variables: Record<string, any> = {}): string {
    const templates: Record<string, string> = {
      payment_reminder: `Dear ${variables.customerName}, your chit fund payment of Rs.${variables.amount} is due on ${variables.dueDate}. Plan: ${variables.planName}. Pay now to avoid late fees. - Shree Eniyaa Chitfunds`,
      
      payment_confirmation: `Dear ${variables.customerName}, we have received your payment of Rs.${variables.amount} for ${variables.planName}. Receipt No: ${variables.receiptNo}. Thank you! - Shree Eniyaa Chitfunds`,
      
      due_alert: `Dear ${variables.customerName}, your payment of Rs.${variables.amount} is overdue for ${variables.planName}. Please pay immediately to avoid penalty. - Shree Eniyaa Chitfunds`,
      
      welcome: `Welcome to Shree Eniyaa Chitfunds, ${variables.customerName}! Your enrollment in ${variables.planName} is confirmed. Monthly amount: Rs.${variables.amount}. Member No: ${variables.memberNo}`,
      
      custom: variables.message || 'Custom message from Shree Eniyaa Chitfunds'
    };

    return templates[type] || templates.custom;
  }
}

export const smsService = new Fast2SMSService();
export default smsService;
*/

// Temporary placeholder service to prevent import errors
export const smsService = {
  sendSMS: () => Promise.resolve({ success: false, message: 'SMS service disabled' }),
  sendBulkSMS: () => Promise.resolve([]),
  logSMS: () => Promise.resolve(null),
  getTemplate: () => 'SMS service disabled'
};
export default smsService;