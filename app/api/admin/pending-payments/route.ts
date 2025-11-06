import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query for pending payments
    let query: any = {
      status: 'pending'
    };

    // Add filters
    if (status === 'overdue') {
      query.dueDate = { $lt: new Date() };
    } else if (status === 'due') {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      query.dueDate = { $gte: startOfDay, $lt: endOfDay };
    } else if (status === 'upcoming') {
      query.dueDate = { $gt: new Date() };
    }

    // Get payments with populated data
    let paymentsQuery = Payment.find(query)
      .populate({
        path: 'userId',
        select: 'name phone email'
      })
      .populate({
        path: 'planId', 
        select: 'planName monthlyAmount'
      })
      .populate({
        path: 'enrollmentId',
        select: 'enrollmentId memberNumber'
      })
      .sort({ dueDate: 1 });

    // Apply search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const searchQuery = {
        $and: [
          query,
          {
            $or: [
              { 'userId.name': searchRegex },
              { 'userId.phone': searchRegex },
              { 'enrollmentId.enrollmentId': searchRegex }
            ]
          }
        ]
      };
      paymentsQuery = Payment.find(searchQuery)
        .populate('userId', 'name phone email')
        .populate('planId', 'planName monthlyAmount')
        .populate('enrollmentId', 'enrollmentId memberNumber')
        .sort({ dueDate: 1 });
    }

    const payments = await paymentsQuery
      .skip((page - 1) * limit)
      .limit(limit);

    // Calculate overdue days and penalty for each payment
    const today = new Date();
    const processedPayments = payments.map(payment => {
      const dueDate = new Date(payment.dueDate);
      const overdueDays = dueDate < today ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      const penaltyAmount = overdueDays > 0 ? Math.floor(payment.amount * 0.01) * overdueDays : 0; // 1% per day penalty

      return {
        ...payment.toObject(),
        overdueDays,
        penaltyAmount
      };
    });

    // Calculate stats
    const totalPendingQuery = { status: 'pending' };
    const [
      totalPending,
      totalAmount,
      overdueCount,
      todayDue
    ] = await Promise.all([
      Payment.countDocuments(totalPendingQuery),
      Payment.aggregate([
        { $match: totalPendingQuery },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Payment.countDocuments({
        status: 'pending',
        dueDate: { $lt: new Date() }
      }),
      Payment.countDocuments({
        status: 'pending',
        dueDate: {
          $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        }
      })
    ]);

    const stats = {
      totalPending,
      totalAmount: totalAmount[0]?.total || 0,
      overdueCount,
      todayDue
    };

    return NextResponse.json({
      success: true,
      payments: processedPayments,
      stats,
      pagination: {
        page,
        limit,
        total: totalPending,
        pages: Math.ceil(totalPending / limit)
      }
    });

  } catch (error) {
    console.error('Pending payments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending payments' },
      { status: 500 }
    );
  }
}