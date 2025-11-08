import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';
import Payment from '@/models/Payment';
import ChitPlan from '@/models/ChitPlan';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all users with their enrollment and payment data
    const users = await User.find({})
      .select('name email phone address role createdAt updatedAt')
      .lean();

    // Get enrollments for all users
    const enrollments = await Enrollment.find({})
      .populate('planId', 'planName totalAmount monthlyAmount duration')
      .populate('userId', 'name email phone')
      .lean();

    // Get payment data for statistics
    const payments = await Payment.find({})
      .select('userId amount paymentDate')
      .lean();

    // Process data to create customer objects with statistics
    const customers = await Promise.all(users.map(async (userData) => {
      const userEnrollments = enrollments.filter(e => 
        e.userId && e.userId._id.toString() === userData._id.toString()
      );
      
      const userPayments = payments.filter(p => 
        p.userId && p.userId.toString() === userData._id.toString()
      );

      const totalPaid = userPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const lastPayment = userPayments.length > 0 
        ? userPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0]
        : null;

      const activeEnrollment = userEnrollments.find(e => e.status === 'active');
      const planName = activeEnrollment?.planId?.planName || 'No Plan';
      const monthlyAmount = activeEnrollment?.planId?.monthlyAmount || 0;
      const pendingAmount = monthlyAmount > 0 ? Math.max(0, monthlyAmount - (lastPayment?.amount || 0)) : 0;

      // Calculate next due date (30 days from last payment or enrollment date)
      const referenceDate = lastPayment?.paymentDate || activeEnrollment?.enrollmentDate || userData.createdAt;
      const nextDue = new Date(new Date(referenceDate).getTime() + 30 * 24 * 60 * 60 * 1000);

      return {
        _id: userData._id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        address: typeof userData.address === 'object' 
          ? `${userData.address.street || ''}, ${userData.address.city || ''}, ${userData.address.state || ''} - ${userData.address.pincode || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '')
          : userData.address || 'Address not provided',
        planId: activeEnrollment?.planId?._id || null,
        planName,
        joinDate: userData.createdAt,
        status: activeEnrollment?.status || 'inactive',
        totalPaid,
        pendingAmount,
        lastPayment: lastPayment?.paymentDate || null,
        nextDue: nextDue.toISOString(),
        paymentHistory: userPayments.length,
        role: userData.role
      };
    }));

    // Calculate statistics
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    const stats = {
      totalUsers: customers.length,
      activeUsers: customers.filter(c => c.status === 'active').length,
      inactiveUsers: customers.filter(c => c.status === 'inactive').length,
      suspendedUsers: customers.filter(c => c.status === 'suspended').length,
      newUsersThisMonth: customers.filter(c => new Date(c.joinDate) >= firstDayOfMonth).length,
      totalRevenue: customers.reduce((sum, c) => sum + c.totalPaid, 0)
    };

    return NextResponse.json({
      success: true,
      customers,
      stats
    });

  } catch (error) {
    console.error('Users API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch users data' 
      },
      { status: 500 }
    );
  }
}