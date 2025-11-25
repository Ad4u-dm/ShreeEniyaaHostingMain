import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';
import Payment from '@/models/Payment';
import Invoice from '@/models/Invoice';
import ChitPlan from '@/models/ChitPlan';
import Plan from '@/models/Plan';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ customerId: string }> }) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerId } = await params;
    
    // Get customer basic info
    const customer = await User.findById(customerId).select('-password');
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get current active enrollment (use customer.userId, not customerId ObjectId)
    const activeEnrollment = await Enrollment.findOne({
      userId: customer.userId,
      status: 'active'
    }).lean();

    // Get enrollment history
    const enrollmentHistory = await Enrollment.find({
      userId: customer.userId
    }).sort({ enrollmentDate: -1 }).lean();

    // Manually populate plan data to avoid ObjectId casting issues
    const planIds = [...(activeEnrollment ? [activeEnrollment.planId] : []), ...enrollmentHistory.map(e => e.planId)];
    const plans = await Plan.find({ _id: { $in: planIds } });
    const planMap = new Map(plans.map(p => [p._id.toString(), p]));

    // Add plan data to enrollments
    if (activeEnrollment && planMap.has(activeEnrollment.planId.toString())) {
      activeEnrollment.planId = planMap.get(activeEnrollment.planId.toString());
    }
    
    enrollmentHistory.forEach(enrollment => {
      if (planMap.has(enrollment.planId.toString())) {
        enrollment.planId = planMap.get(enrollment.planId.toString());
      }
    });

    // Get payment history (use customer.userId for consistency)
    const payments = await Payment.find({
      userId: customer.userId
    }).populate('planId').sort({ paymentDate: -1 });

    // Get invoice history (use customer.userId for consistency)  
    const invoices = await Invoice.find({
      userId: customer.userId
    }).populate('planId').sort({ invoiceDate: -1 });

    // Calculate payment statistics
    const totalPayments = payments.length;
    const totalAmountPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const lastPayment = payments[0];
    
    // Calculate pending amounts for active enrollment
    let pendingAmount = 0;
    let nextDueAmount = 0;
    let currentDueNumber = 1;
    
    if (activeEnrollment && activeEnrollment.planId) {
      const plan = activeEnrollment.planId;
      const monthlyAmount = plan.monthlyAmount || 0;
      const duration = plan.duration || 12;
      const totalExpected = monthlyAmount * duration;
      
      pendingAmount = totalExpected - totalAmountPaid;
      nextDueAmount = monthlyAmount;
      currentDueNumber = Math.min(totalPayments + 1, duration);
    }

    // Calculate credit score based on payment history
    const onTimePayments = payments.filter(p => {
      // Consider payment on time if made within due date + 5 days grace period
      const dueDate = new Date(p.dueDate);
      const paymentDate = new Date(p.paymentDate);
      const gracePeriod = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds
      return paymentDate <= new Date(dueDate.getTime() + gracePeriod);
    }).length;
    
    const latePayments = totalPayments - onTimePayments;
    const creditScore = Math.max(0, Math.min(100, 100 - (latePayments * 5))); // Reduce 5 points per late payment

    // Update customer record with latest data
    await User.findByIdAndUpdate(customerId, {
      memberNumber: activeEnrollment?.memberNumber || customer.memberNumber, // Store member number at user level
      currentEnrollment: activeEnrollment && activeEnrollment.planId ? {
        planId: activeEnrollment.planId._id,
        planName: activeEnrollment.planId.planName,
        enrollmentId: activeEnrollment._id,
        enrollmentDate: activeEnrollment.enrollmentDate,
        monthlyAmount: activeEnrollment.planId.monthlyAmount,
        totalAmount: activeEnrollment.planId.totalAmount,
        status: activeEnrollment.status
      } : null,
      paymentSummary: {
        totalPaymentsMade: totalPayments,
        totalAmountPaid: totalAmountPaid,
        lastPaymentDate: lastPayment?.paymentDate,
        lastPaymentAmount: lastPayment?.amount,
        pendingAmount: pendingAmount,
        arrearAmount: 0, // Calculate based on overdue payments
        nextDueAmount: nextDueAmount,
        currentDueNumber: currentDueNumber
      },
      'creditScore.score': creditScore,
      'creditScore.onTimePayments': onTimePayments,
      'creditScore.latePayments': latePayments,
      'creditScore.lastUpdated': new Date(),
      updatedAt: new Date()
    });

    // Log member number for debugging
    console.log('=== CUSTOMER PROFILE API DEBUG ===');
    console.log('Customer ID:', customerId);
    console.log('Customer userId:', customer.userId);
    console.log('Active enrollment memberNumber:', activeEnrollment?.memberNumber);
    console.log('Customer memberNumber:', customer.memberNumber);
    console.log('Active enrollment object:', JSON.stringify(activeEnrollment, null, 2));

    // Return comprehensive customer data
    return NextResponse.json({
      success: true,
      customer: {
        ...customer.toObject(),
        activeEnrollment,
        enrollmentHistory,
        payments,
        invoices,
        statistics: {
          totalPayments,
          totalAmountPaid,
          pendingAmount,
          creditScore,
          onTimePayments,
          latePayments
        }
      }
    });

  } catch (error) {
    console.error('Get customer profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer profile' },
      { status: 500 }
    );
  }
}