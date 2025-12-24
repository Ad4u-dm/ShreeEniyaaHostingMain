// SMS service using MSG91 (Indian SMS provider with DLT support)
import SMSLog from '@/models/SMSLog';
import connectDB from '@/lib/mongodb';

interface SMSResponse {
  success: boolean;
  message: string;
  requestId?: string;
  errorCode?: string;
}

interface MSG91SendResponse {
  type: string;
  message: string;
  request_id?: string;
}

class MSG91Service {
  private authKey: string;
  private senderId: string;
  private route: string;
  private baseUrl = 'https://api.msg91.com/api/v5';
  private entity_id: string;
  private dlt_template_id: string;

  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY || '';
    this.senderId = process.env.MSG91_SENDER_ID || 'SHRENF'; // DLT approved sender ID
    this.route = process.env.MSG91_ROUTE || '4'; // 4 = Transactional, 1 = Promotional
    this.entity_id = process.env.MSG91_ENTITY_ID || ''; // Your DLT entity ID
    this.dlt_template_id = process.env.MSG91_DLT_TEMPLATE_ID || ''; // Default template ID
  }

  async sendSMS(payload: { 
    mobiles: string; 
    message: string;
    templateId?: string;
    variables?: Record<string, string>;
  }): Promise<SMSResponse> {
    try {
      if (!this.authKey) {
        throw new Error('MSG91 Auth Key not configured');
      }

      // Remove +91 if present, MSG91 expects 10-digit numbers
      let phoneNumber = payload.mobiles.replace(/^\+91/, '').replace(/\s+/g, '');
      
      // Validate phone number format
      if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
        return {
          success: false,
          message: 'Invalid Indian phone number format',
          errorCode: 'INVALID_NUMBER'
        };
      }

      // For DLT compliance, use template-based SMS if template ID provided
      const smsData = {
        sender: this.senderId,
        route: this.route,
        country: '91',
        sms: [
          {
            message: payload.message,
            to: [phoneNumber]
          }
        ]
      };

      // Add DLT parameters if available
      if (this.entity_id) {
        Object.assign(smsData, { entity_id: this.entity_id });
      }
      if (payload.templateId || this.dlt_template_id) {
        Object.assign(smsData.sms[0], { 
          template_id: payload.templateId || this.dlt_template_id 
        });
      }

      console.log('Sending SMS via MSG91:', {
        ...smsData,
        authkey: '[HIDDEN]',
        to: phoneNumber
      });

      const response = await fetch(`${this.baseUrl}/flow/`, {
        method: 'POST',
        headers: {
          'authkey': this.authKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(smsData)
      });

      const result: MSG91SendResponse = await response.json();
      console.log('MSG91 Response:', result);

      if (result.type === 'success' || response.ok) {
        return {
          success: true,
          message: 'SMS sent successfully',
          requestId: result.request_id || 'MSG91_' + Date.now()
        };
      }

      return {
        success: false,
        message: result.message || 'SMS sending failed',
        errorCode: result.type || 'UNKNOWN'
      };

    } catch (error: any) {
      console.error('MSG91 error:', error);
      return {
        success: false,
        message: error.message || 'SMS sending failed',
        errorCode: 'ERROR'
      };
    }
  }

  async sendBulkSMS(recipients: { 
    phone: string; 
    message: string;
    templateId?: string;
  }[]): Promise<SMSResponse[]> {
    const results: SMSResponse[] = [];
    
    for (const recipient of recipients) {
      const result = await this.sendSMS({
        mobiles: recipient.phone,
        message: recipient.message,
        templateId: recipient.templateId
      });
      results.push(result);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
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
    provider?: string;
  }) {
    try {
      await connectDB();
      
      const smsLog = new SMSLog({
        userId: data.userId,
        phoneNumber: data.phone,
        message: data.message,
        status: data.status,
        requestId: data.requestId,
        errorMessage: data.errorMessage,
        sentBy: data.sentBy,
        provider: data.provider || 'MSG91',
        sentAt: data.status === 'sent' ? new Date() : undefined,
        createdAt: new Date()
      });

      await smsLog.save();
      return smsLog;
    } catch (error) {
      console.error('Error logging SMS:', error);
      throw error;
    }
  }

  // Predefined DLT-approved message templates
  // NOTE: Replace these with your actual DLT-approved templates
  getTemplate(type: string, variables: Record<string, any> = {}): string {
    const templates: Record<string, string> = {
      payment_reminder: `Dear ${variables.customerName}, your chit fund payment of Rs.${variables.amount} is due on ${variables.dueDate}. Plan: ${variables.planName}. Pay now to avoid late fees. - Shree Eniyaa Chitfunds`,
      
      payment_confirmation: `Dear ${variables.customerName}, we have received your payment of Rs.${variables.amount} for ${variables.planName}. Receipt No: ${variables.receiptNo}. Thank you! - Shree Eniyaa Chitfunds`,
      
      due_alert: `Dear ${variables.customerName}, your payment of Rs.${variables.amount} is overdue for ${variables.planName}. Please pay immediately to avoid penalty. - Shree Eniyaa Chitfunds`,
      
      welcome: `Welcome to Shree Eniyaa Chitfunds, ${variables.customerName}! Your enrollment in ${variables.planName} is confirmed. Monthly amount: Rs.${variables.amount}. Member No: ${variables.memberNo}. Contact: 96266 66527`,
      
      custom: variables.message || 'Message from Shree Eniyaa Chitfunds'
    };

    return templates[type] || templates.custom;
  }

  // Get DLT template IDs (you'll need to configure these after DLT approval)
  getTemplateId(type: string): string | undefined {
    const templateIds: Record<string, string> = {
      payment_reminder: process.env.MSG91_TEMPLATE_PAYMENT_REMINDER || '',
      payment_confirmation: process.env.MSG91_TEMPLATE_PAYMENT_CONFIRMATION || '',
      due_alert: process.env.MSG91_TEMPLATE_DUE_ALERT || '',
      welcome: process.env.MSG91_TEMPLATE_WELCOME || '',
    };

    return templateIds[type] || this.dlt_template_id;
  }
}

export const smsService = new MSG91Service();
export default smsService;