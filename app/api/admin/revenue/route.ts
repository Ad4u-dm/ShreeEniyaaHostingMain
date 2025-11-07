import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get current date info
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    
    // Get yesterday for growth calculation
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);
    
    // Get last month for growth calculation
    const lastMonthStart = new Date(monthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const lastMonthEnd = new Date(monthStart);
    
    // Get last year for growth calculation
    const lastYearStart = new Date(yearStart);
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
    const lastYearEnd = new Date(yearStart);

    // Aggregate revenue statistics
    const revenueStats = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidAt: { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalPayments: { $sum: 1 },
          todayRevenue: {
            $sum: {
              $cond: [
                { $gte: ['$paidAt', todayStart] },
                '$amount',
                0
              ]
            }
          },
          monthlyRevenue: {
            $sum: {
              $cond: [
                { $gte: ['$paidAt', monthStart] },
                '$amount',
                0
              ]
            }
          },
          yearlyRevenue: {
            $sum: {
              $cond: [
                { $gte: ['$paidAt', yearStart] },
                '$amount',
                0
              ]
            }
          },
          yesterdayRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$paidAt', yesterdayStart] },
                    { $lt: ['$paidAt', yesterdayEnd] }
                  ]
                },
                '$amount',
                0
              ]
            }
          },
          lastMonthRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$paidAt', lastMonthStart] },
                    { $lt: ['$paidAt', lastMonthEnd] }
                  ]
                },
                '$amount',
                0
              ]
            }
          },
          lastYearRevenue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$paidAt', lastYearStart] },
                    { $lt: ['$paidAt', lastYearEnd] }
                  ]
                },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);

    const stats = revenueStats[0] || {
      totalRevenue: 0,
      todayRevenue: 0,
      monthlyRevenue: 0,
      yearlyRevenue: 0,
      yesterdayRevenue: 0,
      lastMonthRevenue: 0,
      lastYearRevenue: 0
    };

    // Calculate growth percentages
    const dailyGrowth = stats.yesterdayRevenue > 0 
      ? ((stats.todayRevenue - stats.yesterdayRevenue) / stats.yesterdayRevenue) * 100
      : stats.todayRevenue > 0 ? 100 : 0;

    const monthlyGrowth = stats.lastMonthRevenue > 0
      ? ((stats.monthlyRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100
      : stats.monthlyRevenue > 0 ? 100 : 0;

    const yearlyGrowth = stats.lastYearRevenue > 0
      ? ((stats.yearlyRevenue - stats.lastYearRevenue) / stats.lastYearRevenue) * 100
      : stats.yearlyRevenue > 0 ? 100 : 0;

    // Get daily revenue data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$paidAt" }
          },
          amount: { $sum: '$amount' },
          payments: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Fill missing days with 0
    const dailyData: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = dailyRevenue.find(d => d._id === dateStr);
      dailyData.push({
        date: dateStr,
        amount: dayData?.amount || 0,
        payments: dayData?.payments || 0
      });
    }

    // Get monthly revenue data (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidAt: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$paidAt' },
            month: { $month: '$paidAt' }
          },
          amount: { $sum: '$amount' },
          payments: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Fill missing months with 0
    const monthlyData: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const monthData = monthlyRevenue.find(m => m._id.year === year && m._id.month === month);
      monthlyData.push({
        month: date.toLocaleString('en-IN', { month: 'short' }),
        amount: monthData?.amount || 0,
        payments: monthData?.payments || 0
      });
    }

    // Get yearly revenue data (last 5 years)
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const yearlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          paidAt: { $gte: fiveYearsAgo }
        }
      },
      {
        $group: {
          _id: { $year: '$paidAt' },
          amount: { $sum: '$amount' },
          payments: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Fill missing years with 0
    const yearlyData: any[] = [];
    const currentYear = new Date().getFullYear();
    for (let i = 4; i >= 0; i--) {
      const year = currentYear - i;
      const yearData = yearlyRevenue.find(y => y._id === year);
      yearlyData.push({
        year: year.toString(),
        amount: yearData?.amount || 0,
        payments: yearData?.payments || 0
      });
    }

    // Get plan-wise revenue
    const planWiseRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed'
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customer'
        }
      },
      {
        $lookup: {
          from: 'plans',
          localField: 'customer.planId',
          foreignField: '_id',
          as: 'plan'
        }
      },
      {
        $group: {
          _id: '$plan.name',
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { amount: -1 }
      }
    ]);

    // Get payment method wise revenue
    const paymentMethodRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { amount: -1 }
      }
    ]);

    // Calculate averages
    const averageDaily = stats.totalRevenue / Math.max(1, (Date.now() - new Date(yearStart).getTime()) / (1000 * 60 * 60 * 24));
    const averageMonthly = stats.totalRevenue / Math.max(1, (Date.now() - new Date(yearStart).getTime()) / (1000 * 60 * 60 * 24 * 30));

    const revenue = {
      daily: dailyData,
      monthly: monthlyData,
      yearly: yearlyData,
      stats: {
        todayRevenue: stats.todayRevenue,
        monthlyRevenue: stats.monthlyRevenue,
        yearlyRevenue: stats.yearlyRevenue,
        totalRevenue: stats.totalRevenue,
        averageDaily: Math.round(averageDaily),
        averageMonthly: Math.round(averageMonthly),
        growth: {
          daily: Math.round(dailyGrowth * 100) / 100,
          monthly: Math.round(monthlyGrowth * 100) / 100,
          yearly: Math.round(yearlyGrowth * 100) / 100
        }
      },
      planWise: planWiseRevenue.map(item => ({
        planName: item._id || 'No Plan',
        amount: item.amount,
        count: item.count
      })),
      paymentMethods: paymentMethodRevenue.map(item => ({
        method: item._id || 'Unknown',
        amount: item.amount,
        count: item.count
      }))
    };

    return NextResponse.json({
      success: true,
      revenue
    });

  } catch (error) {
    console.error('Revenue API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch revenue data' 
      },
      { status: 500 }
    );
  }
}