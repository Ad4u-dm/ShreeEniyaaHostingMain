import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import ChitPlan from '@/models/ChitPlan';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';

export async function GET(req: Request) {
  try {
    await connectDB();

  const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build query
    const query: any = {};
    
    if (search) {
      // Search in user names or plan names through populated fields
      query.$or = [
        { 'userId.name': { $regex: search, $options: 'i' } },
        { 'planId.planName': { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }

    const [transactions, total, summary] = await Promise.all([
      Payment.find()
        .populate('userId', 'name email phone')
        .populate('planId', 'planName totalAmount')
        .populate('enrollmentId', 'memberNumber')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit),
      Payment.countDocuments(),
      Payment.aggregate([
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            totalTransactions: { $sum: 1 },
            avgAmount: { $avg: '$amount' }
          }
        }
      ])
    ]);

    // Get status breakdown
    const statusBreakdown = await Payment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      }
    ]);

    // Calculate stats for the frontend
    const stats = {
      totalTransactions: total,
      totalAmount: summary[0]?.totalAmount || 0,
      successfulTransactions: statusBreakdown.find(s => s._id === 'completed')?.count || 0,
      pendingTransactions: statusBreakdown.find(s => s._id === 'pending')?.count || 0,
      failedTransactions: statusBreakdown.find(s => s._id === 'failed')?.count || 0
    };

    return NextResponse.json({
      success: true,
      transactions,
      stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      summary: summary[0] || { totalAmount: 0, totalTransactions: 0, avgAmount: 0 },
      statusBreakdown
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { userId, planId, enrollmentId, amount, paymentMethod, remarks } = await request.json();

    // Validate required fields
    if (!userId || !planId || !enrollmentId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Required fields missing' },
        { status: 400 }
      );
    }

    // Create payment record
    const payment = new Payment({
      userId,
      planId,
      enrollmentId,
      amount,
      paymentMethod: paymentMethod || 'cash',
      status: 'completed',
      remarks
    });

    await payment.save();

    // Populate the created payment
    const populatedPayment = await Payment.findById(payment._id)
      .populate('userId', 'name email phone')
      .populate('planId', 'planName totalAmount')
      .populate('enrollmentId', 'memberNumber');

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      payment: populatedPayment
    });

  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record payment' },
      { status: 500 }
    );
  }
}