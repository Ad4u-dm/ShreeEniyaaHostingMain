import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'due'; // 'due', 'collected', 'overdue'
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    let query: any = {};
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    switch (type) {
      case 'due':
        // Get payments due today for staff's customers
        query = {
          dueDate: {
            $gte: startDate,
            $lt: endDate
          },
          status: 'pending'
        };
        break;

      case 'collected':
        // Get payments collected by this staff member
        query = {
          collectedBy: user.userId,
          createdAt: {
            $gte: startDate,
            $lt: endDate
          },
          status: 'completed'
        };
        break;

      case 'overdue':
        // Get overdue payments for staff's customers
        query = {
          dueDate: { $lt: new Date() },
          status: 'pending'
        };
        break;
    }

    // For due and overdue payments, we need to filter by staff's assigned customers
    if (type === 'due' || type === 'overdue') {
      const staffEnrollments = await Enrollment.find({ 
        assignedStaff: user.userId 
      }).select('_id');
      
      query.enrollmentId = { 
        $in: staffEnrollments.map(e => e._id) 
      };
    }

    const payments = await Payment.find(query)
      .populate('enrollmentId', 'enrollmentId memberNumber')
      .populate('userId', 'name phone address')
      .populate('planId', 'planName monthlyAmount')
      .sort({ dueDate: 1 })
      .limit(50);

    // Calculate summary statistics
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const paymentCount = payments.length;

    return NextResponse.json({
      payments,
      summary: {
        totalAmount,
        paymentCount,
        averageAmount: paymentCount > 0 ? totalAmount / paymentCount : 0
      }
    });

  } catch (error) {
    console.error('Staff payments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// POST endpoint for collecting payments
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      enrollmentId,
      amount,
      paymentMethod,
      transactionId,
      notes,
      paymentType = 'installment'
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

    // Generate receipt number
    const paymentCount = await Payment.countDocuments();
    const receiptNumber = `RCP${String(paymentCount + 1).padStart(8, '0')}`;

    // Create payment record
    const payment = new Payment({
      enrollmentId: enrollment._id,
      userId: enrollment.userId._id,
      planId: enrollment.planId._id,
      amount,
      paymentMethod,
      paymentType,
      transactionId,
      receiptNumber,
      collectedBy: user.userId,
      status: 'completed',
      paidDate: new Date(),
      notes: notes ? [{ text: notes, addedBy: user.userId }] : []
    });

    await payment.save();

    // Update enrollment totals
    enrollment.totalPaid += amount;
    enrollment.totalDue = Math.max(0, enrollment.totalDue - amount);
    
    // Update next due date logic
    const nextDue = new Date(enrollment.nextDueDate || new Date());
    nextDue.setMonth(nextDue.getMonth() + 1);
    enrollment.nextDueDate = nextDue;

    await enrollment.save();

    // Calculate staff commission (assuming 2% commission)
    const commissionRate = 0.02;
    const commission = amount * commissionRate;

    return NextResponse.json({
      success: true,
      payment: {
        paymentId: payment.paymentId,
        receiptNumber: payment.receiptNumber,
        amount: payment.amount,
        method: payment.paymentMethod,
        date: payment.paidDate,
        commission
      },
      message: 'Payment collected successfully'
    });

  } catch (error) {
    console.error('Payment collection error:', error);
    return NextResponse.json(
      { error: 'Failed to collect payment' },
      { status: 500 }
    );
  }
}

// PUT endpoint for updating payment status
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId, status, notes } = await request.json();

    const payment = await Payment.findOne({ _id: paymentId })
      .populate({
        path: 'enrollmentId',
        match: { assignedStaff: user.userId }
      });

    if (!payment || !payment.enrollmentId) {
      return NextResponse.json(
        { error: 'Payment not found or not authorized' },
        { status: 404 }
      );
    }

    payment.status = status;
    if (notes) {
      payment.notes.push({
        text: notes,
        addedBy: user.userId,
        addedAt: new Date()
      });
    }

    await payment.save();

    return NextResponse.json({
      success: true,
      message: 'Payment status updated successfully'
    });

  } catch (error) {
    console.error('Payment update error:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}