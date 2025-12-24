// SMS API ROUTES TEMPORARILY COMMENTED OUT - WAITING FOR DLT APPROVAL
/*
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';
import smsService from '@/lib/sms';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
  const user = getUserFromRequest(req);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get the actual user document to get MongoDB ObjectId
    const currentUser = await User.findOne({ userId: user.userId });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

  const { recipients, message, template, templateData } = await req.json();

    if (!recipients || !recipients.length) {
      return NextResponse.json(
        { error: 'Recipients are required' },
        { status: 400 }
      );
    }

    if (!message && !template) {
      return NextResponse.json(
        { error: 'Message or template is required' },
        { status: 400 }
      );
    }

    type SendResult = {
      recipient: any;
      success: boolean;
      message?: string;
      requestId?: string;
      error?: string;
    };

    const results: SendResult[] = [];

    for (const recipient of recipients) {
      try {
        // Get user details if only userId is provided
        let customerData = recipient;
        if (recipient.userId && !recipient.phone) {
          const customer = await User.findById(recipient.userId);
          if (!customer) {
            results.push({
              recipient,
              success: false,
              error: 'Customer not found'
            });
            continue;
          }
          customerData = {
            ...recipient,
            phone: customer.phone,
            name: customer.name
          };
        }

        if (!customerData.phone) {
          results.push({
            recipient,
            success: false,
            error: 'Phone number not found'
          });
          continue;
        }

        // Generate message from template or use provided message
        let finalMessage = message;
        if (template) {
          finalMessage = smsService.getTemplate(template, {
            customerName: customerData.name,
            ...templateData,
            ...customerData
          });
        }

        // Send SMS
        const smsResult = await smsService.sendSMS({
          mobiles: customerData.phone,
          message: finalMessage
        });

        // Log SMS
        await smsService.logSMS({
          userId: customerData.userId || customerData._id,
          phone: customerData.phone,
          message: finalMessage,
          status: smsResult.success ? 'sent' : 'failed',
          requestId: smsResult.requestId,
          errorMessage: smsResult.success ? undefined : smsResult.message,
          sentBy: currentUser._id // Use MongoDB ObjectId instead of user.userId
        });

        results.push({
          recipient: customerData,
          success: smsResult.success,
          message: smsResult.message,
          requestId: smsResult.requestId
        });

      } catch (error) {
        console.error('Error sending SMS to recipient:', recipient, error);
        results.push({
          recipient,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      message: `SMS sent to ${successCount} recipients, ${failCount} failed`,
      results,
      summary: {
        total: results.length,
        sent: successCount,
        failed: failCount
      }
    });

  } catch (error) {
    console.error('SMS send error:', error);
    return NextResponse.json(
      { error: 'Failed to send SMS' },
      { status: 500 }
    );
  }
}

// Get SMS templates
export async function GET(request: NextRequest) {
  try {
  const user = getUserFromRequest(req);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = [
      {
        id: 'payment_reminder',
        name: 'Payment Reminder',
        description: 'Remind customers about upcoming payments',
        variables: ['customerName', 'amount', 'dueDate', 'planName']
      },
      {
        id: 'payment_confirmation',
        name: 'Payment Confirmation',
        description: 'Confirm receipt of payment',
        variables: ['customerName', 'amount', 'planName', 'receiptNo']
      },
      {
        id: 'due_alert',
        name: 'Overdue Alert',
        description: 'Alert for overdue payments',
        variables: ['customerName', 'amount', 'planName']
      },
      {
        id: 'welcome',
        name: 'Welcome Message',
        description: 'Welcome new customers',
        variables: ['customerName', 'planName', 'amount', 'memberNo']
      },
      {
        id: 'custom',
        name: 'Custom Message',
        description: 'Send custom message',
        variables: ['message']
      }
    ];

    return NextResponse.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json(
      { error: 'Failed to get templates' },
      { status: 500 }
    );
  }
}
*/

// SMS API ROUTES - MSG91 Integration
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';
import smsService from '@/lib/sms';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get the actual user document to get MongoDB ObjectId
    const currentUser = await User.findOne({ userId: user.userId });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { recipients, message, template, templateData } = await request.json();

    if (!recipients || !recipients.length) {
      return NextResponse.json(
        { error: 'Recipients are required' },
        { status: 400 }
      );
    }

    if (!message && !template) {
      return NextResponse.json(
        { error: 'Message or template is required' },
        { status: 400 }
      );
    }

    type SendResult = {
      recipient: any;
      success: boolean;
      message?: string;
      requestId?: string;
      error?: string;
    };

    const results: SendResult[] = [];

    for (const recipient of recipients) {
      try {
        // Get user details if only userId is provided
        let customerData = recipient;
        if (recipient.userId && !recipient.phone) {
          const customer = await User.findById(recipient.userId);
          if (!customer) {
            results.push({
              recipient,
              success: false,
              error: 'Customer not found'
            });
            continue;
          }
          customerData = {
            ...recipient,
            phone: customer.phone,
            name: customer.name
          };
        }

        if (!customerData.phone) {
          results.push({
            recipient,
            success: false,
            error: 'Phone number not found'
          });
          continue;
        }

        // Generate message from template or use provided message
        let finalMessage = message;
        let templateId;
        if (template) {
          finalMessage = smsService.getTemplate(template, {
            customerName: customerData.name,
            ...templateData,
            ...customerData
          });
          templateId = smsService.getTemplateId(template);
        }

        // Send SMS
        const smsResult = await smsService.sendSMS({
          mobiles: customerData.phone,
          message: finalMessage,
          templateId
        });

        // Log SMS
        await smsService.logSMS({
          userId: customerData.userId || customerData._id,
          phone: customerData.phone,
          message: finalMessage,
          status: smsResult.success ? 'sent' : 'failed',
          requestId: smsResult.requestId,
          errorMessage: smsResult.success ? undefined : smsResult.message,
          sentBy: currentUser._id.toString(),
          provider: 'MSG91'
        });

        results.push({
          recipient: customerData,
          success: smsResult.success,
          message: smsResult.message,
          requestId: smsResult.requestId
        });

      } catch (error) {
        console.error('Error sending SMS to recipient:', recipient, error);
        results.push({
          recipient,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return NextResponse.json({
      success: true,
      message: `SMS sent to ${successCount} recipients, ${failCount} failed`,
      results,
      summary: {
        total: results.length,
        sent: successCount,
        failed: failCount
      }
    });

  } catch (error) {
    console.error('SMS send error:', error);
    return NextResponse.json(
      { error: 'Failed to send SMS' },
      { status: 500 }
    );
  }
}

// Get SMS templates
export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = [
      {
        id: 'payment_reminder',
        name: 'Payment Reminder',
        description: 'Remind customers about upcoming payments',
        variables: ['customerName', 'amount', 'dueDate', 'planName']
      },
      {
        id: 'payment_confirmation',
        name: 'Payment Confirmation',
        description: 'Confirm receipt of payment',
        variables: ['customerName', 'amount', 'planName', 'receiptNo']
      },
      {
        id: 'due_alert',
        name: 'Overdue Alert',
        description: 'Alert for overdue payments',
        variables: ['customerName', 'amount', 'planName']
      },
      {
        id: 'welcome',
        name: 'Welcome Message',
        description: 'Welcome new customers',
        variables: ['customerName', 'planName', 'amount', 'memberNo']
      },
      {
        id: 'custom',
        name: 'Custom Message',
        description: 'Send custom message',
        variables: ['message']
      }
    ];

    return NextResponse.json({
      success: true,
      templates
    });

  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json(
      { error: 'Failed to get templates' },
      { status: 500 }
    );
  }
}