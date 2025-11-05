import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import Payment from '@/models/Payment';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || user.role !== 'user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user's enrollments
    const enrollments = await Enrollment.find({ userId: user.userId })
      .populate('planId', 'planName totalAmount installmentAmount duration planType')
      .populate('assignedStaff', 'name email phone')
      .sort({ createdAt: -1 });
    
    // Get user's payment history
    const payments = await Payment.find({ userId: user.userId })
      .populate('planId', 'planName')
      .populate('enrollmentId', 'enrollmentId memberNumber')
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Calculate summary statistics
    const stats = {
      totalEnrollments: enrollments.length,
      activeEnrollments: enrollments.filter(e => e.status === 'active').length,
      completedEnrollments: enrollments.filter(e => e.status === 'completed').length,
      totalPaid: payments.reduce((sum, p) => sum + p.amount, 0),
      totalDue: enrollments.reduce((sum, e) => sum + e.totalDue, 0)
    };
    
    // Upcoming payments
    const upcomingPayments = enrollments
      .filter(e => e.status === 'active' && e.nextDueDate)
      .map(e => ({
        enrollmentId: e.enrollmentId,
        planName: e.planId.planName,
        dueDate: e.nextDueDate,
        amount: e.planId.installmentAmount,
        daysPastDue: e.nextDueDate < new Date() ? 
          Math.floor((new Date().getTime() - e.nextDueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
      }))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    const dashboard = {
      stats,
      enrollments,
      recentPayments: payments,
      upcomingPayments
    };
    
    return NextResponse.json({ dashboard });
    
  } catch (error) {
    console.error('User dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}