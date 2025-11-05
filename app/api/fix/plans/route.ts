import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ChitPlan from '@/models/ChitPlan';

export async function POST() {
  try {
    await connectDB();
    
    // Get all plans that need fixing
    const plansToFix = await ChitPlan.find({});
    
    let updated = 0;
    for (const plan of plansToFix) {
      const updateData: any = {};
      
      // Set isActive to true if not present
      if (plan.isActive === undefined || plan.isActive === null) {
        updateData.isActive = true;
      }
      
      // Set monthlyAmount from installmentAmount if not present
      if (!plan.monthlyAmount && plan.installmentAmount) {
        updateData.monthlyAmount = plan.installmentAmount;
      } else if (!plan.monthlyAmount && plan.totalAmount && plan.duration) {
        updateData.monthlyAmount = Math.round(plan.totalAmount / plan.duration);
      }
      
      // Set minParticipants and maxParticipants if not present
      if (!plan.minParticipants) {
        updateData.minParticipants = plan.totalMembers || 15;
      }
      if (!plan.maxParticipants) {
        updateData.maxParticipants = (plan.totalMembers || 15) + 10;
      }
      
      // Update the plan if there are changes
      if (Object.keys(updateData).length > 0) {
        await ChitPlan.findByIdAndUpdate(plan._id, updateData);
        updated++;
      }
    }

    // Get updated plans
    const updatedPlans = await ChitPlan.find({ 
      $or: [
        { isActive: true },
        { status: 'active' },
        { status: { $exists: false } }
      ]
    });

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} plans with missing fields`,
      totalActivePlans: updatedPlans.length,
      plans: updatedPlans.map(plan => ({
        _id: plan._id,
        planName: plan.planName,
        totalAmount: plan.totalAmount,
        monthlyAmount: plan.monthlyAmount || plan.installmentAmount || Math.round(plan.totalAmount / plan.duration),
        duration: plan.duration,
        isActive: plan.isActive !== false,
        status: plan.status,
        description: plan.description || `${plan.planName} - Professional ChitFund Plan`,
        minParticipants: plan.minParticipants || plan.totalMembers || 15,
        maxParticipants: plan.maxParticipants || (plan.totalMembers || 15) + 10,
        commissionRate: plan.commissionRate || 5
      }))
    });

  } catch (error) {
    console.error('Failed to fix plans:', error);
    return NextResponse.json(
      { error: 'Failed to fix plans', details: error.message },
      { status: 500 }
    );
  }
}