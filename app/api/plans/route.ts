import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import Plan from '@/models/Plan';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get plans from the plans collection using the new schema
    const plans = await Plan.find({ status: 'active' }).sort({ totalAmount: 1 });

    return NextResponse.json({
      success: true, 
      plans
    });

  } catch (error) {
    console.error('Get plans error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}

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
      monthlyData, // Array of month-wise data
      totalMembers,
      commissionRate,
      processingFee,
      auctionDay,
      auctionTime,
      description,
      terms
    } = await request.json();

    // Validate required fields
    if (!planName || !totalAmount || !duration || !monthlyData || monthlyData.length === 0) {
      return NextResponse.json({ 
        error: 'Plan name, total amount, duration, and monthly data are required' 
      }, { status: 400 });
    }

    // Validate monthly data
    if (monthlyData.length !== duration) {
      return NextResponse.json({ 
        error: 'Monthly data must match plan duration' 
      }, { status: 400 });
    }
    
    const plan = new Plan({
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
    
    await plan.save();
    
    return NextResponse.json({
      success: true,
      message: 'Plan created successfully',
      plan
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create plan error:', error);
    return NextResponse.json(
      { error: 'Failed to create plan' },
      { status: 500 }
    );
  }
}

