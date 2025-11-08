import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Enrollment from '@/models/Enrollment';
import ChitPlan from '@/models/ChitPlan';
import User from '@/models/User';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const enrollmentId = searchParams.get('enrollmentId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const paymentType = searchParams.get('paymentType');
    
    let query: any = {};
    
    // If regular user, only show their payments
    if (user.role === 'user') {
      query.userId = user.userId;
    } else {
      if (userId) query.userId = userId;
      if (enrollmentId) query.enrollmentId = enrollmentId;
    }
    
    if (status) query.status = status;
    if (paymentType) query.paymentType = paymentType;
    
    const payments = await Payment.find(query)
      .populate('userId', 'name email phone')
      .populate('enrollmentId', 'enrollmentId memberNumber')
      .populate('planId', 'planName installmentAmount')
      .populate('collectedBy', 'name email')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ payments });
    
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

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
      paymentType = 'installment',
      installmentNumber,
      transactionId,
      notes,
      collectionMethod = 'office'
    } = await request.json();
    
    // Verify enrollment exists
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }
    
    // Calculate days past due if applicable
    let daysPastDue = 0;
    let penaltyAmount = 0;
    
    if (paymentType === 'installment' && enrollment.nextDueDate) {
      const today = new Date();
      const dueDate = new Date(enrollment.nextDueDate);
      
      if (today > dueDate) {
        daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        // Calculate penalty (example: 1% per month late)
        const monthsLate = Math.ceil(daysPastDue / 30);
        penaltyAmount = (amount * 0.01 * monthsLate);
      }
    }
    
    const payment = new Payment({
      enrollmentId,
      userId: enrollment.userId,
      planId: enrollment.planId,
      amount,
      paymentMethod,
      paymentType,
      installmentNumber,
      daysPastDue,
      penaltyAmount,
      transactionId,
      notes,
      collectedBy: user.userId,
      collectionMethod
    });
    
    await payment.save();
    
    // Update enrollment totals
    enrollment.totalPaid += amount;
    enrollment.totalDue -= amount;
    
    // Update next due date for installment payments
    if (paymentType === 'installment') {
      const nextDue = new Date(enrollment.nextDueDate || enrollment.startDate);
      
      if (enrollment.planId.planType === 'monthly') {
        nextDue.setMonth(nextDue.getMonth() + 1);
      } else if (enrollment.planId.planType === 'weekly') {
        nextDue.setDate(nextDue.getDate() + 7);
      } else if (enrollment.planId.planType === 'daily') {
        nextDue.setDate(nextDue.getDate() + 1);
      }
      
      enrollment.nextDueDate = nextDue;
    }
    
    await enrollment.save();
    
    const populatedPayment = await Payment.findById(payment._id)
      .populate('userId', 'name email phone')
      .populate('enrollmentId', 'enrollmentId memberNumber')
      .populate('planId', 'planName installmentAmount')
      .populate('collectedBy', 'name email');
    
    return NextResponse.json({
      message: 'Payment recorded successfully',
      payment: populatedPayment
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    );
  }
}