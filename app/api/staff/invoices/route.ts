import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import Plan from '@/models/Plan';
import Payment from '@/models/Payment';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'my_invoices';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    switch (type) {
      case 'my_invoices':
        // Get invoices created by this staff member
        let query: any = { createdBy: user.userId };
        
        if (status !== 'all') {
          query.status = status;
        }

        const invoices = await Invoice.find(query)
          .populate('enrollmentId', 'enrollmentId memberNumber')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit);

        const totalCount = await Invoice.countDocuments(query);

        return NextResponse.json({
          invoices,
          totalCount,
          page,
          totalPages: Math.ceil(totalCount / limit),
          summary: {
            total: await Invoice.countDocuments({ createdBy: user.userId }),
            draft: await Invoice.countDocuments({ createdBy: user.userId, status: 'draft' }),
            sent: await Invoice.countDocuments({ createdBy: user.userId, status: 'sent' }),
            paid: await Invoice.countDocuments({ createdBy: user.userId, status: 'paid' }),
            overdue: await Invoice.countDocuments({ createdBy: user.userId, status: 'overdue' })
          }
        });

      case 'pending_payments':
        // Get invoices that need payment from staff's customers
        const staffEnrollments = await Enrollment.find({ 
          assignedStaff: user.userId 
        }).select('_id');
        
        const pendingInvoices = await Invoice.find({
          enrollmentId: { $in: staffEnrollments.map(e => e._id) },
          status: { $in: ['sent', 'overdue'] }
        })
        .populate('enrollmentId', 'enrollmentId memberNumber')
        .sort({ dueDate: 1 })
        .limit(50);

        return NextResponse.json({ pendingInvoices });

      case 'customer_invoices':
        // Get invoices for a specific customer
        const customerId = searchParams.get('customerId');
        if (!customerId) {
          return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
        }

        const customerInvoices = await Invoice.find({
          customerId: customerId
        })
        .populate('enrollmentId', 'enrollmentId memberNumber')
        .sort({ createdAt: -1 });

        return NextResponse.json({ customerInvoices });

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

  } catch (error) {
    console.error('Invoice fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

// POST endpoint for creating invoices
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      enrollmentId, 
      items, 
      dueDate, 
      notes,
      autoCalculate = true 
    } = await request.json();

    // Verify enrollment is assigned to this staff
    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      assignedStaff: user.userId
    }).populate('userId planId');

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found or not assigned to you' },
        { status: 404 }
      );
    }

    let invoiceItems = items || [];

    // Auto-calculate pending payments if requested
    if (autoCalculate) {
      const pendingPayments = await Payment.find({
        enrollmentId: enrollmentId,
        status: 'pending',
        dueDate: { $lte: new Date(dueDate) }
      }).sort({ dueDate: 1 });

      invoiceItems = pendingPayments.map(payment => ({
        description: `${payment.paymentType} payment - Installment #${payment.installmentNumber}`,
        amount: payment.amount,
        installmentNumber: payment.installmentNumber,
        dueDate: payment.dueDate,
        type: payment.paymentType
      }));

      // Add any penalty for overdue payments
      const overduePayments = pendingPayments.filter(p => 
        new Date(p.dueDate) < new Date()
      );
      
      if (overduePayments.length > 0) {
        const penaltyAmount = overduePayments.reduce((sum, p) => {
          const daysOverdue = Math.floor(
            (new Date().getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          return sum + (p.amount * 0.01 * Math.max(daysOverdue - 7, 0)); // 1% penalty after 7 days
        }, 0);

        if (penaltyAmount > 0) {
          invoiceItems.push({
            description: `Late payment penalty (${overduePayments.length} overdue payments)`,
            amount: penaltyAmount,
            type: 'late_fee'
          });
        }
      }
    }

    // Create invoice
    const invoice = new Invoice({
      enrollmentId: enrollment._id,
      customerId: enrollment.userId.userId,
      planId: enrollment.planId._id,
      createdBy: user.userId,
      dueDate: new Date(dueDate),
      items: invoiceItems,
      notes,
      
      // Snapshot customer details
      customerDetails: {
        name: enrollment.userId.name,
        email: enrollment.userId.email,
        phone: enrollment.userId.phone,
        address: enrollment.userId.address
      },
      
      // Snapshot plan details
      planDetails: {
        planName: enrollment.planId.planName,
        monthlyAmount: enrollment.planId.monthlyAmount,
        duration: enrollment.planId.duration,
        totalAmount: enrollment.planId.totalAmount
      }
    });

    await invoice.save();

    return NextResponse.json({
      success: true,
      invoice: {
        invoiceId: invoice.invoiceId,
        totalAmount: invoice.totalAmount,
        status: invoice.status,
        dueDate: invoice.dueDate
      },
      message: 'Invoice created successfully'
    });

  } catch (error) {
    console.error('Invoice creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}

// PUT endpoint for updating invoice status
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoiceId, action, data } = await request.json();

    const invoice = await Invoice.findOne({ 
      _id: invoiceId,
      createdBy: user.userId 
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found or not authorized' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'send':
        invoice.status = 'sent';
        invoice.sentDate = new Date();
        break;

      case 'mark_paid':
        invoice.status = 'paid';
        invoice.paidAmount = data.amount || invoice.totalAmount;
        invoice.paidDate = new Date();
        invoice.paymentMethod = data.paymentMethod;
        invoice.transactionId = data.transactionId;

        // Update related payments as completed
        const relatedPayments = await Payment.find({
          enrollmentId: invoice.enrollmentId,
          status: 'pending',
          installmentNumber: { 
            $in: invoice.items.map((item: any) => item.installmentNumber).filter(Boolean) 
          }
        });

        await Promise.all(relatedPayments.map(payment => {
          payment.status = 'completed';
          payment.collectedBy = user.userId;
          payment.paidDate = new Date();
          payment.paymentMethod = data.paymentMethod;
          payment.transactionId = data.transactionId;
          return payment.save();
        }));

        break;

      case 'cancel':
        invoice.status = 'cancelled';
        break;

      case 'send_reminder':
        invoice.remindersSent += 1;
        invoice.lastReminderDate = new Date();
        if (new Date() > new Date(invoice.dueDate) && invoice.status === 'sent') {
          invoice.status = 'overdue';
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await invoice.save();

    return NextResponse.json({
      success: true,
      invoice: {
        invoiceId: invoice.invoiceId,
        status: invoice.status,
        paidAmount: invoice.paidAmount
      },
      message: `Invoice ${action.replace('_', ' ')} successfully`
    });

  } catch (error) {
    console.error('Invoice update error:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}