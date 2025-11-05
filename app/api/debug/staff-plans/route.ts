import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ChitPlan from '@/models/ChitPlan';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    console.log('Debug: Fetching plans for staff...');
    
    // Get all active chit plans
    const plans = await ChitPlan.find({ isActive: true }).sort({ totalAmount: 1 });
    
    console.log('Debug: Found plans:', plans.length);
    console.log('Debug: Plans data:', plans.map(p => ({ name: p.planName, amount: p.totalAmount, active: p.isActive })));

    return NextResponse.json({
      success: true,
      debug: true,
      message: `Found ${plans.length} active plans`,
      plans: plans.map(plan => ({
        _id: plan._id,
        planName: plan.planName,
        totalAmount: plan.totalAmount,
        monthlyAmount: plan.monthlyAmount,
        duration: plan.duration,
        description: plan.description,
        minParticipants: plan.minParticipants,
        maxParticipants: plan.maxParticipants,
        commissionRate: plan.commissionRate,
        isActive: plan.isActive
      }))
    });

  } catch (error) {
    console.error('Failed to fetch plans (debug):', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans', details: error.message },
      { status: 500 }
    );
  }
}