import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import Payment from '@/models/Payment';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get staff-specific statistics
    const [
      myEnrollments,
      myActiveEnrollments,
      myTodayPayments,
      myMonthlyCollection,
      myPendingPayments
    ] = await Promise.all([
      Enrollment.countDocuments({ assignedStaff: user.userId }),
      Enrollment.countDocuments({ assignedStaff: user.userId, status: 'active' }),
      Payment.countDocuments({
        collectedBy: user.userId,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      Payment.aggregate([
        {
          $match: {
            collectedBy: user.userId,
            createdAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
            },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]),
      Enrollment.countDocuments({
        assignedStaff: user.userId,
        nextDueDate: { $lt: new Date() },
        status: 'active'
      })
    ]);
    
    // My recent activities
    const myRecentEnrollments = await Enrollment.find({ assignedStaff: user.userId })
      .populate('userId', 'name email phone')
      .populate('planId', 'planName installmentAmount')
      .sort({ createdAt: -1 })
      .limit(10);
    
    const myRecentPayments = await Payment.find({ collectedBy: user.userId })
      .populate('userId', 'name email')
      .populate('planId', 'planName')
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Due payments for my customers
    const duePayments = await Enrollment.find({
      assignedStaff: user.userId,
      nextDueDate: { $lte: new Date() },
      status: 'active'
    })
      .populate('userId', 'name email phone')
      .populate('planId', 'planName installmentAmount')
      .sort({ nextDueDate: 1 })
      .limit(20);
    
    // Commission calculation (example: 2% of collections)
    const commissionRate = 0.02;
    const monthlyCommission = (myMonthlyCollection[0]?.total || 0) * commissionRate;
    
    const dashboard = {
      stats: {
        myEnrollments,
        myActiveEnrollments,
        myTodayPayments,
        myMonthlyCollection: myMonthlyCollection[0]?.total || 0,
        myPendingPayments,
        monthlyCommission
      },
      myActivity: {
        enrollments: myRecentEnrollments,
        payments: myRecentPayments
      },
      duePayments
    };
    
    return NextResponse.json({ dashboard });
    
  } catch (error) {
    console.error('Staff dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}