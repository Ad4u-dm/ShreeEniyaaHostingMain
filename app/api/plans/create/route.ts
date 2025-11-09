import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Types } from 'mongoose';
import Plan from '@/models/Plan';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      planName,
      planType,
      totalAmount,
      duration,
      monthlyData,
      totalMembers,
      commissionRate,
      processingFee,
      auctionDay,
      auctionTime,
      description,
      terms
    } = await request.json();

    // Debug logging
    console.log('Received plan data:', {
      planName,
      totalAmount,
      duration,
      monthlyData: monthlyData?.length || 0,
      monthlyDataSample: monthlyData?.[0]
    });

    // Validate required fields
    if (!planName || !totalAmount || !duration || !monthlyData || monthlyData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Plan name, total amount, duration, and monthly data are required' },
        { status: 400 }
      );
    }

    // Validate monthly data
    if (monthlyData.length !== duration) {
      return NextResponse.json(
        { success: false, error: 'Monthly data must match plan duration' },
        { status: 400 }
      );
    }

    // Create new plan with the new schema
    const newPlan = new Plan({
      planName,
      planType: planType || 'monthly',
      totalAmount,
      duration,
      monthlyData,
      totalMembers: totalMembers || 20,
      commissionRate: commissionRate || 5,
      processingFee: processingFee || 0,
      auctionDay: auctionDay || 1,
      auctionTime: auctionTime || '10:00',
      description,
      terms,
      createdBy: user.userId
    });

    await newPlan.save();

    return NextResponse.json({
      success: true,
      message: 'Plan created successfully',
      plan: newPlan
    });

  } catch (error) {
    console.error('Create plan error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create plan' },
      { status: 500 }
    );
  }
}