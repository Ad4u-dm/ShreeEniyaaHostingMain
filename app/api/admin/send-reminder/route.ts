import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId } = await request.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    // Get payment details with user info
    const payment = await Payment.findById(paymentId)
      .populate('userId', 'name phone email')
      .populate('planId', 'planName')
      .populate('enrollmentId', 'enrollmentId');

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // In a real application, you would integrate with SMS/Email service here
    // For now, we'll just simulate sending a reminder
    
    const reminderMessage = `Dear ${payment.userId.name}, your payment of ₹${payment.amount.toLocaleString('en-IN')} for ${payment.planId.planName} (${payment.enrollmentId.enrollmentId}) is due on ${new Date(payment.dueDate).toLocaleDateString('en-IN')}. Please make your payment to avoid late fees. Thank you!`;

    // Log the reminder attempt (in a real app, this would be stored in a communications log)
    console.log(`Reminder sent to ${payment.userId.phone}: ${reminderMessage}`);

    // Update payment with reminder sent timestamp
    await Payment.findByIdAndUpdate(paymentId, {
      $push: {
        reminders: {
          sentAt: new Date(),
          sentBy: user.userId,
          method: 'sms',
          message: reminderMessage
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Reminder sent successfully',
      reminderDetails: {
        recipient: payment.userId.name,
        phone: payment.userId.phone,
        message: reminderMessage
      }
    });

  } catch (error) {
    console.error('Send reminder error:', error);
    return NextResponse.json(
      { error: 'Failed to send reminder' },
      { status: 500 }
    );
  }
}