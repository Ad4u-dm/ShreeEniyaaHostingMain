import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ChitPlan from '@/models/ChitPlan';

export async function GET() {
  try {
    await connectDB();
    
    // Check if plans already exist
    const existingPlans = await ChitPlan.countDocuments();
    
    if (existingPlans > 0) {
      return NextResponse.json({
        success: true,
        message: 'Sample plans already exist',
        count: existingPlans
      });
    }

    // Create sample ChitFund plans
    const samplePlans = [
      {
        planName: 'Gold Plan - 50K',
        totalAmount: 50000,
        monthlyAmount: 2500,
        duration: 20,
        description: 'Perfect for small investments and quick returns',
        minParticipants: 15,
        maxParticipants: 25,
        commissionRate: 5,
        isActive: true,
        createdAt: new Date()
      },
      {
        planName: 'Silver Plan - 25K',
        totalAmount: 25000,
        monthlyAmount: 1250,
        duration: 20,
        description: 'Ideal for beginners and small savings',
        minParticipants: 15,
        maxParticipants: 25,
        commissionRate: 5,
        isActive: true,
        createdAt: new Date()
      },
      {
        planName: 'Platinum Plan - 100K',
        totalAmount: 100000,
        monthlyAmount: 5000,
        duration: 20,
        description: 'High-value plan for serious investors',
        minParticipants: 15,
        maxParticipants: 25,
        commissionRate: 5,
        isActive: true,
        createdAt: new Date()
      },
      {
        planName: 'Diamond Plan - 200K',
        totalAmount: 200000,
        monthlyAmount: 10000,
        duration: 20,
        description: 'Premium plan for large investments',
        minParticipants: 15,
        maxParticipants: 25,
        commissionRate: 5,
        isActive: true,
        createdAt: new Date()
      },
      {
        planName: 'Bronze Plan - 10K',
        totalAmount: 10000,
        monthlyAmount: 500,
        duration: 20,
        description: 'Entry-level plan for new members',
        minParticipants: 15,
        maxParticipants: 25,
        commissionRate: 5,
        isActive: true,
        createdAt: new Date()
      },
      {
        planName: 'Special Plan - 75K',
        totalAmount: 75000,
        monthlyAmount: 3750,
        duration: 20,
        description: 'Mid-range plan with balanced returns',
        minParticipants: 15,
        maxParticipants: 25,
        commissionRate: 5,
        isActive: true,
        createdAt: new Date()
      }
    ];

    // Insert sample plans
    const insertedPlans = await ChitPlan.insertMany(samplePlans);

    return NextResponse.json({
      success: true,
      message: 'Sample ChitFund plans created successfully',
      plansCreated: insertedPlans.length,
      plans: insertedPlans.map(plan => ({
        id: plan._id,
        planName: plan.planName,
        totalAmount: plan.totalAmount,
        monthlyAmount: plan.monthlyAmount,
        duration: plan.duration
      }))
    });

  } catch (error) {
    console.error('Error creating sample plans:', error);
    return NextResponse.json(
      { error: 'Failed to create sample plans' },
      { status: 500 }
    );
  }
}