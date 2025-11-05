import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ChitPlan from '@/models/ChitPlan';

export async function GET() {
  try {
    await connectDB();
    
    // Get all plans with full details
    const allPlans = await ChitPlan.find({}).lean();
    
    return NextResponse.json({
      success: true,
      totalPlans: allPlans.length,
      plans: allPlans.map(plan => ({
        _id: plan._id,
        planName: plan.planName,
        totalAmount: plan.totalAmount,
        monthlyAmount: plan.monthlyAmount,
        duration: plan.duration,
        isActive: plan.isActive,
        description: plan.description,
        minParticipants: plan.minParticipants,
        maxParticipants: plan.maxParticipants,
        commissionRate: plan.commissionRate,
        createdAt: plan.createdAt,
        allFields: Object.keys(plan)
      }))
    });

  } catch (error) {
    console.error('Failed to inspect plans:', error);
    return NextResponse.json(
      { error: 'Failed to inspect plans', details: error.message },
      { status: 500 }
    );
  }
}