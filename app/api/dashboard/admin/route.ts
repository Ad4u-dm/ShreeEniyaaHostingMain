import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import ChitPlan from '@/models/ChitPlan';
import Enrollment from '@/models/Enrollment';
import Payment from '@/models/Payment';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get dashboard statistics
    const Plan = (await import('@/models/Plan')).default;
    const [
      totalUsers,
      totalStaff,
      totalPlans,
      activePlans,
      totalEnrollments,
      activeEnrollments,
      totalPayments,
      todayPayments,
      monthlyRevenue,
      pendingPayments
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'staff' }),
      Plan.countDocuments(),
      Plan.countDocuments({ status: 'active' }),
      Enrollment.countDocuments(),
      Enrollment.countDocuments({ status: 'active' }),
      Payment.countDocuments(),
      Payment.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      Payment.aggregate([
        {
          $match: {
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
        nextDueDate: { $lt: new Date() },
        status: 'active'
      })
    ]);
    
    // Recent activities - get raw data first, then manually populate
    const rawRecentEnrollments = await Enrollment.find()
      .populate('planId', 'planName')
      .sort({ createdAt: -1 })
      .limit(5);
    
    const rawRecentPayments = await Payment.find()
      .populate('planId', 'planName')
      .sort({ createdAt: -1 })
      .limit(5);

    // Manually populate user data for enrollments
    const enrollmentUserIds = rawRecentEnrollments.map(e => e.userId).filter(Boolean);
    const paymentUserIds = rawRecentPayments.map(p => p.userId).filter(Boolean);
    const allUserIds = Array.from(new Set(enrollmentUserIds.concat(paymentUserIds)));
    
    const users = await User.find({ userId: { $in: allUserIds } }, 'name email userId');
    const userMap = new Map(users.map(user => [user.userId, user]));

    // Combine data with user information
    const recentEnrollments = rawRecentEnrollments.map(enrollment => ({
      ...enrollment.toObject(),
      userId: userMap.get(enrollment.userId) || { 
        userId: enrollment.userId, 
        name: 'Unknown User', 
        email: '' 
      }
    }));
    
    const recentPayments = rawRecentPayments.map(payment => ({
      ...payment.toObject(),
      userId: userMap.get(payment.userId) || { 
        userId: payment.userId, 
        name: 'Unknown User', 
        email: '' 
      }
    }));
    
    // Top performing staff
    const staffPerformance = await Payment.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      },
      {
        $group: {
          _id: '$collectedBy',
          totalCollected: { $sum: '$amount' },
          paymentCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'userId',
          as: 'staff'
        }
      },
      {
        $unwind: '$staff'
      },
      {
        $sort: { totalCollected: -1 }
      },
      {
        $limit: 5
      }
    ]);
    
    const dashboard = {
      stats: {
        totalUsers,
        totalStaff,
        totalPlans,
        activePlans,
        totalEnrollments,
        activeEnrollments,
        totalPayments,
        todayPayments,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        pendingPayments
      },
      recentActivity: {
        enrollments: recentEnrollments,
        payments: recentPayments
      },
      staffPerformance
    };
    
    return NextResponse.json({ dashboard });
    
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}