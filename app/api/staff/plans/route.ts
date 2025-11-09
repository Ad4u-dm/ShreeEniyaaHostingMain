import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Plan from '@/models/Plan';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active plans using the new unified schema
    const plans = await Plan.find({
      status: 'active'
    }).sort({ totalAmount: 1 });

    return NextResponse.json({
      success: true,
      plans: plans.map((plan: any) => ({
        _id: plan._id,
        planId: plan.planId,
        planName: plan.planName,
        totalAmount: plan.totalAmount,
        monthlyAmount: plan.monthlyAmount || Math.round(plan.totalAmount / plan.duration),
        duration: plan.duration,
        description: plan.description || `${plan.planName} - Professional Chit Plan`,
        totalMembers: plan.totalMembers,
        commissionRate: plan.commissionRate || 5,
        monthlyData: plan.monthlyData, // Include month-wise data
        isActive: plan.status === 'active'
      }))
    });

  } catch (error) {
    console.error('Failed to fetch plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}