import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import ChitPlan from '@/models/ChitPlan';
import User from '@/models/User';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const planId = searchParams.get('planId');
    const status = searchParams.get('status');
    
    let query: any = {};
    
    // If regular user, only show their enrollments
    if (user.role === 'user') {
      query.userId = user.userId;
    } else if (userId) {
      query.userId = userId;
    }
    
    if (planId) query.planId = planId;
    if (status) query.status = status;
    
    const enrollments = await Enrollment.find(query)
      .populate('userId', 'name email phone')
      .populate('planId', 'planName totalAmount installmentAmount duration')
      .populate('assignedStaff', 'name email')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ enrollments });
    
  } catch (error) {
    console.error('Get enrollments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const {
      userId,
      planId,
      startDate,
      nominee,
      assignedStaff
    } = await request.json();
    
    // Verify plan exists
    const plan = await ChitPlan.findById(planId);
    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }
    
    // Verify user exists
    const targetUser = await User.findOne({ userId });
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user is already enrolled in this plan
    const existingEnrollment = await Enrollment.findOne({ userId: targetUser._id, planId });
    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'User already enrolled in this plan' },
        { status: 400 }
      );
    }
    
    // Count existing enrollments for member number
    const memberCount = await Enrollment.countDocuments({ planId });
    if (memberCount >= plan.totalMembers) {
      return NextResponse.json(
        { error: 'Plan is full' },
        { status: 400 }
      );
    }
    
    // Calculate end date
    const start = new Date(startDate);
    const end = new Date(start);
    
    if (plan.planType === 'monthly') {
      end.setMonth(end.getMonth() + plan.duration);
    } else if (plan.planType === 'weekly') {
      end.setDate(end.getDate() + (plan.duration * 7));
    } else if (plan.planType === 'daily') {
      end.setDate(end.getDate() + plan.duration);
    }
    
    const enrollment = new Enrollment({
      userId: targetUser._id,
      planId,
      startDate: start,
      endDate: end,
      memberNumber: memberCount + 1,
      totalDue: plan.totalAmount,
      nextDueDate: start,
      nominee,
      assignedStaff: assignedStaff || user.userId
    });
    
    await enrollment.save();
    
    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('userId', 'name email phone')
      .populate('planId', 'planName totalAmount installmentAmount duration')
      .populate('assignedStaff', 'name email');
    
    return NextResponse.json({
      message: 'Enrollment created successfully',
      enrollment: populatedEnrollment
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create enrollment error:', error);
    return NextResponse.json(
      { error: 'Failed to create enrollment' },
      { status: 500 }
    );
  }
}