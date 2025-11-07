import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoURI!);
    }

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