import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ChitPlan from '@/models/ChitPlan';

export async function GET() {
  try {
    await connectDB();
    
    // Get all plans without any filtering
    const allPlans = await ChitPlan.find({});
    const activePlans = await ChitPlan.find({ isActive: true });
    
    console.log('All plans:', allPlans.length);
    console.log('Active plans:', activePlans.length);
    
    return NextResponse.json({
      success: true,
      debug: {
        totalPlans: allPlans.length,
        activePlans: activePlans.length,
        allPlansData: allPlans.map(plan => ({
          _id: plan._id,
          planName: plan.planName,
          totalAmount: plan.totalAmount,
          monthlyAmount: plan.monthlyAmount,
          duration: plan.duration,
          isActive: plan.isActive,
          createdAt: plan.createdAt
        })),
        activePlansData: activePlans.map(plan => ({
          _id: plan._id,
          planName: plan.planName,
          totalAmount: plan.totalAmount,
          monthlyAmount: plan.monthlyAmount,
          duration: plan.duration,
          isActive: plan.isActive,
          createdAt: plan.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('Debug plans error:', error);
    return NextResponse.json(
      { error: 'Failed to debug plans', details: error.message },
      { status: 500 }
    );
  }
}