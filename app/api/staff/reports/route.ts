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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';
    const period = searchParams.get('period') || 'month'; // 'week', 'month', 'quarter', 'year'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date range
    let dateRange = {};
    if (startDate && endDate) {
      dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const now = new Date();
      let start = new Date();
      
      switch (period) {
        case 'week':
          start.setDate(now.getDate() - 7);
          break;
        case 'month':
          start.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          start.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          start.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      dateRange = { $gte: start, $lte: now };
    }

    switch (type) {
      case 'summary':
        // Get comprehensive staff performance summary
        const [
          totalCustomers,
          activeCustomers,
          totalCollections,
          monthlyTarget,
          paymentStats,
          enrollmentStats
        ] = await Promise.all([
          Enrollment.countDocuments({ assignedStaff: user.userId }),
          Enrollment.countDocuments({ assignedStaff: user.userId, status: 'active' }),
          Payment.aggregate([
            {
              $lookup: {
                from: 'enrollments',
                localField: 'enrollmentId',
                foreignField: '_id',
                as: 'enrollment'
              }
            },
            {
              $match: {
                'enrollment.assignedStaff': user.userId,
                collectedBy: user.userId,
                status: 'completed',
                createdAt: dateRange
              }
            },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: '$amount' },
                totalCount: { $sum: 1 },
                avgAmount: { $avg: '$amount' }
              }
            }
          ]),
          50000, // Monthly target (this could come from user settings)
          Payment.aggregate([
            {
              $lookup: {
                from: 'enrollments',
                localField: 'enrollmentId',
                foreignField: '_id',
                as: 'enrollment'
              }
            },
            {
              $match: {
                'enrollment.assignedStaff': user.userId,
                createdAt: dateRange
              }
            },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                amount: { $sum: '$amount' }
              }
            }
          ]),
          Enrollment.aggregate([
            {
              $match: {
                assignedStaff: user.userId,
                createdAt: dateRange
              }
            },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ])
        ]);

        const collections = totalCollections[0] || { totalAmount: 0, totalCount: 0, avgAmount: 0 };
        const successRate = collections.totalCount > 0 ? 
          (paymentStats.find(p => p._id === 'completed')?.count || 0) / collections.totalCount * 100 : 0;

        return NextResponse.json({
          summary: {
            totalCustomers,
            activeCustomers,
            totalCollected: collections.totalAmount,
            totalPayments: collections.totalCount,
            averagePayment: collections.avgAmount,
            monthlyTarget,
            targetProgress: (collections.totalAmount / monthlyTarget) * 100,
            successRate,
            commission: collections.totalAmount * 0.02 // 2% commission
          },
          paymentStats,
          enrollmentStats
        });

      case 'performance':
        // Daily/weekly performance data for charts
        const performanceData = await Payment.aggregate([
          {
            $lookup: {
              from: 'enrollments',
              localField: 'enrollmentId',
              foreignField: '_id',
              as: 'enrollment'
            }
          },
          {
            $match: {
              'enrollment.assignedStaff': user.userId,
              collectedBy: user.userId,
              status: 'completed',
              createdAt: dateRange
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
              },
              dailyAmount: { $sum: '$amount' },
              dailyCount: { $sum: 1 }
            }
          },
          {
            $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
          }
        ]);

        return NextResponse.json({ performanceData });

      case 'customers':
        // Customer-wise performance analysis
        const customerPerformance = await Payment.aggregate([
          {
            $lookup: {
              from: 'enrollments',
              localField: 'enrollmentId',
              foreignField: '_id',
              as: 'enrollment'
            }
          },
          {
            $match: {
              'enrollment.assignedStaff': user.userId,
              createdAt: dateRange
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'customer'
            }
          },
          {
            $group: {
              _id: '$userId',
              customerName: { $first: { $arrayElemAt: ['$customer.name', 0] } },
              totalPaid: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] } },
              totalDue: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
              paymentCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              overdueCount: { 
                $sum: { 
                  $cond: [
                    { 
                      $and: [
                        { $eq: ['$status', 'pending'] },
                        { $lt: ['$dueDate', new Date()] }
                      ]
                    }, 
                    1, 
                    0
                  ] 
                } 
              }
            }
          },
          {
            $sort: { totalPaid: -1 }
          }
        ]);

        return NextResponse.json({ customerPerformance });

      case 'trends':
        // Monthly trends analysis
        const trends = await Payment.aggregate([
          {
            $lookup: {
              from: 'enrollments',
              localField: 'enrollmentId',
              foreignField: '_id',
              as: 'enrollment'
            }
          },
          {
            $match: {
              'enrollment.assignedStaff': user.userId,
              collectedBy: user.userId,
              status: 'completed',
              createdAt: {
                $gte: new Date(new Date().getFullYear(), 0, 1) // Start of current year
              }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              monthlyAmount: { $sum: '$amount' },
              monthlyCount: { $sum: 1 },
              avgAmount: { $avg: '$amount' }
            }
          },
          {
            $sort: { '_id.year': 1, '_id.month': 1 }
          }
        ]);

        return NextResponse.json({ trends });

      case 'commission':
        // Commission breakdown
        const commissionData = await Payment.aggregate([
          {
            $lookup: {
              from: 'enrollments',
              localField: 'enrollmentId',
              foreignField: '_id',
              as: 'enrollment'
            }
          },
          {
            $match: {
              'enrollment.assignedStaff': user.userId,
              collectedBy: user.userId,
              status: 'completed',
              createdAt: dateRange
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              totalCollection: { $sum: '$amount' },
              commission: { $sum: { $multiply: ['$amount', 0.02] } }, // 2% commission
              paymentCount: { $sum: 1 }
            }
          },
          {
            $sort: { '_id.year': 1, '_id.month': 1 }
          }
        ]);

        return NextResponse.json({ commissionData });

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Staff reports error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}