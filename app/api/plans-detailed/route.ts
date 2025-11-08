import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get plans from the plans collection (from plans.json) - these are the detailed plan templates
    const Plan = (mongoose.models.Plan || mongoose.model('Plan', new mongoose.Schema({}, { strict: false }))) as any;
    const plans = await Plan.find().sort({ total_value: 1 });

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