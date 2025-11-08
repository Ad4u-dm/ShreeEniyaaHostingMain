import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import User from '@/models/User';
import ChitPlan from '@/models/ChitPlan';
import Enrollment from '@/models/Enrollment';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch real payments with populated references
    const payments = await Payment.find({})
      .populate('userId', 'name phone email')
      .populate('planId', 'planName totalAmount monthlyAmount duration')
      .populate('enrollmentId', 'enrollmentId memberNumber')
      .sort({ createdAt: -1 })
      .lean();

    // Process payments to match expected format
    const processedPayments = payments.map(payment => ({
      _id: payment._id,
      userId: {
        _id: payment.userId?._id,
        name: payment.userId?.name || 'Unknown User',
        phone: payment.userId?.phone || 'No phone',
        email: payment.userId?.email || 'No email'
      },
      planId: {
        _id: payment.planId?._id,
        planName: payment.planId?.planName || 'No Plan',
        monthlyAmount: payment.planId?.monthlyAmount || 0
      },
      enrollmentId: {
        _id: payment.enrollmentId?._id,
        enrollmentId: payment.enrollmentId?.enrollmentId || 'No enrollment ID',
        memberNumber: payment.enrollmentId?.memberNumber || 0
      },
      amount: payment.amount || 0,
      dueDate: payment.dueDate,
      paidDate: payment.paymentDate,
      receiptNumber: payment.receiptNumber,
      status: payment.status || 'pending',
      paymentMethod: payment.paymentType || 'Cash',
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    }));

    // Calculate statistics from real data
    const totalPayments = processedPayments.length;
    const totalAmount = processedPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const todayPayments = processedPayments.filter(p => {
      if (!p.paidDate) return false;
      const paymentDate = new Date(p.paidDate);
      return paymentDate >= todayStart && paymentDate < todayEnd;
    }).length;

    const pendingPayments = processedPayments.filter(p => p.status === 'pending').length;
    const completedPayments = processedPayments.filter(p => p.status === 'completed').length;

    return NextResponse.json({
      success: true,
      payments: processedPayments,
      stats: {
        totalPayments,
        totalAmount,
        todayPayments,
        pendingPayments,
        completedPayments
      }
    });

  } catch (error) {
    console.error('Payments API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch payments data' 
      },
      { status: 500 }
    );
  }
}