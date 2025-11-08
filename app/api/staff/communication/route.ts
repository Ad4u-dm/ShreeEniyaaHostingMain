import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import ChitPlan from '@/models/ChitPlan';
import Payment from '@/models/Payment';
import User from '@/models/User';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

// In a real application, you would integrate with SMS/Email services
// For demo purposes, we'll simulate these communications

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'history';

    switch (type) {
      case 'history':
        // Get communication history for staff's customers
        // In a real app, this would come from a communications log table
        const recentCommunications = [
          {
            id: '1',
            type: 'sms',
            recipient: 'Raj Kumar',
            message: 'Payment reminder for Plan A - ₹5,000 due today',
            status: 'sent',
            sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            response: null
          },
          {
            id: '2',
            type: 'call',
            recipient: 'Priya Sharma',
            message: 'Follow-up call regarding overdue payment',
            status: 'completed',
            sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
            response: 'Will pay tomorrow'
          },
          {
            id: '3',   
            type: 'email',
            recipient: 'Amit Patel',
            message: 'Monthly statement and payment reminder',
            status: 'delivered',
            sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            response: null
          }
        ];

        return NextResponse.json({ communications: recentCommunications });

      case 'templates':
        // Get message templates
        const templates = [
          {
            id: 'payment-due',
            name: 'Payment Due Reminder',
            type: 'sms',
            template: 'Dear {customerName}, your payment of ₹{amount} for {planName} is due today. Please make payment to avoid late charges. Thank you.'
          },
          {
            id: 'payment-overdue',
            name: 'Overdue Payment',
            type: 'sms',
            template: 'Dear {customerName}, your payment of ₹{amount} for {planName} is overdue by {days} days. Please contact us immediately to avoid penalties.'
          },
          {
            id: 'meeting-reminder',
            name: 'Meeting Reminder',
            type: 'sms',
            template: 'Dear {customerName}, this is a reminder about our meeting scheduled for {date} at {time}. Please confirm your availability.'
          },
          {
            id: 'document-request',
            name: 'Document Required',
            type: 'sms',
            template: 'Dear {customerName}, we need the following documents for your {planName} enrollment: {documents}. Please submit them at your earliest convenience.'
          },
          {
            id: 'payment-confirmation',
            name: 'Payment Confirmation',
            type: 'sms',
            template: 'Dear {customerName}, we have received your payment of ₹{amount} for {planName}. Receipt number: {receiptNumber}. Thank you!'
          }
        ];

        return NextResponse.json({ templates });

      case 'pending':
        // Get customers who need follow-up
        const overduePayments = await Payment.find({
          status: 'pending',
          dueDate: { $lt: new Date() }
        })
        .populate({
          path: 'enrollmentId',
          match: { assignedStaff: user.userId },
          populate: {
            path: 'userId',
            select: 'name phone email'
          }
        })
        .populate('planId', 'planName')
        .limit(20);

        const pendingContacts = overduePayments
          .filter(payment => payment.enrollmentId)
          .map(payment => ({
            customerId: payment.enrollmentId.userId._id,
            customerName: payment.enrollmentId.userId.name,
            phone: payment.enrollmentId.userId.phone,
            email: payment.enrollmentId.userId.email,
            planName: payment.planId.planName,
            amount: payment.amount,
            daysPastDue: Math.floor((new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
            lastContact: null, // Would come from communication log
            priority: Math.floor((new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24)) > 7 ? 'high' : 'medium'
          }));

        return NextResponse.json({ pendingContacts });

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

  } catch (error) {
    console.error('Communication fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch communication data' },
      { status: 500 }
    );
  }
}

// POST endpoint for sending communications
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data } = await request.json();

    switch (action) {
      case 'send_reminder':
        const { 
          recipients, // Array of customer IDs or 'all-due', 'overdue'
          template,
          customMessage,
          communicationType = 'sms'
        } = data;

        let targetCustomers: any[] = [];

        if (recipients === 'all-due') {
          // Get all customers with payments due today
          const duePayments = await Payment.find({
            dueDate: {
              $gte: new Date(new Date().setHours(0, 0, 0, 0)),
              $lt: new Date(new Date().setHours(23, 59, 59, 999))
            },
            status: 'pending'
          })
          .populate({
            path: 'enrollmentId',
            match: { assignedStaff: user.userId },
            populate: {
              path: 'userId',
              select: 'name phone email'
            }
          })
          .populate('planId', 'planName');

          targetCustomers = duePayments
            .filter(p => p.enrollmentId)
            .map(p => ({
              customer: p.enrollmentId.userId,
              plan: p.planId,
              amount: p.amount,
              dueDate: p.dueDate
            }));

        } else if (recipients === 'overdue') {
          // Get all customers with overdue payments
          const overduePayments = await Payment.find({
            dueDate: { $lt: new Date() },
            status: 'pending'
          })
          .populate({
            path: 'enrollmentId',
            match: { assignedStaff: user.userId },
            populate: {
              path: 'userId',
              select: 'name phone email'
            }
          })
          .populate('planId', 'planName');

          targetCustomers = overduePayments
            .filter(p => p.enrollmentId)
            .map(p => ({
              customer: p.enrollmentId.userId,
              plan: p.planId,
              amount: p.amount,
              dueDate: p.dueDate,
              daysPastDue: Math.floor((new Date().getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24))
            }));

        } else if (Array.isArray(recipients)) {
          // Get specific customers
          const enrollments = await Enrollment.find({
            userId: { $in: recipients },
            assignedStaff: user.userId
          })
          .populate('userId', 'name phone email')
          .populate('planId', 'planName');

          targetCustomers = enrollments.map(e => ({
            customer: e.userId,
            plan: e.planId,
            amount: e.planId.monthlyAmount
          }));
        }

        // Simulate sending messages (in real app, integrate with SMS/Email service)
        const sentMessages = targetCustomers.map(target => {
          let message = customMessage;
          
          if (template && !customMessage) {
            // Apply template with placeholders
            message = template
              .replace('{customerName}', target.customer.name)
              .replace('{amount}', target.amount?.toLocaleString('en-IN'))
              .replace('{planName}', target.plan.planName)
              .replace('{days}', target.daysPastDue || 0);
          }

          return {
            customerId: target.customer._id,
            customerName: target.customer.name,
            phone: target.customer.phone,
            email: target.customer.email,
            message,
            type: communicationType,
            status: 'sent', // In real app, this would be the actual delivery status
            sentAt: new Date()
          };
        });

        // In a real application, you would:
        // 1. Send actual SMS/emails
        // 2. Store communication records in database
        // 3. Handle delivery confirmations

        return NextResponse.json({
          success: true,
          messagesSent: sentMessages.length,
          messages: sentMessages,
          message: `${sentMessages.length} ${communicationType} reminders sent successfully`
        });

      case 'log_call':
        const { customerId, callDuration, callNotes, callOutcome } = data;

        // Verify customer is assigned to this staff
        const enrollment = await Enrollment.findOne({
          userId: customerId,
          assignedStaff: user.userId
        });

        if (!enrollment) {
          return NextResponse.json(
            { error: 'Customer not found or not assigned to you' },
            { status: 404 }
          );
        }

        // Add call log to enrollment notes
        enrollment.notes.push({
          text: `Phone call (${callDuration} min) - Outcome: ${callOutcome}. Notes: ${callNotes}`,
          addedBy: user.userId,
          addedAt: new Date()
        });

        await enrollment.save();

        return NextResponse.json({
          success: true,
          message: 'Call logged successfully'
        });

      case 'schedule_callback':
        const { customerId: callbackCustomerId, scheduledDate, purpose } = data;

        const callbackEnrollment = await Enrollment.findOne({
          userId: callbackCustomerId,
          assignedStaff: user.userId
        });

        if (!callbackEnrollment) {
          return NextResponse.json(
            { error: 'Customer not found or not assigned to you' },
            { status: 404 }
          );
        }

        // Add callback reminder to notes
        callbackEnrollment.notes.push({
          text: `Callback scheduled for ${new Date(scheduledDate).toLocaleDateString('en-IN')} - Purpose: ${purpose}`,
          addedBy: user.userId,
          addedAt: new Date()
        });

        await callbackEnrollment.save();

        return NextResponse.json({
          success: true,
          message: 'Callback scheduled successfully'
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Communication action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform communication action' },
      { status: 500 }
    );
  }
}