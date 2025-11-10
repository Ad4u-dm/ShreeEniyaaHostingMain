import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import Plan from '@/models/Plan';
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
    
    // Get pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    // Add search to query if provided
    if (search && (user.role === 'admin' || user.role === 'staff')) {
      // For admin/staff, allow searching across all enrollments
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id').lean();
      
      const userIds = users.map(u => u._id);
      
      if (!query.userId) {
        query.$or = [
          { userId: { $in: userIds } },
          { memberNumber: { $regex: search, $options: 'i' } }
        ];
      }
    }

    // Get enrollments with only ObjectId-based populations
    const [rawEnrollments, total] = await Promise.all([
      Enrollment.find(query)
        .populate('planId', 'planName totalAmount installmentAmount duration monthlyAmount')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit),
      Enrollment.countDocuments(query)
    ]);

    // Manually populate user data for userId and assignedStaff
    const userIds = rawEnrollments.map(enrollment => enrollment.userId).filter(Boolean);
    const staffIds = rawEnrollments.map(enrollment => enrollment.assignedStaff).filter(Boolean);
    
    // Get all unique user IDs (both customers and staff)
    const allUserIds = Array.from(new Set(userIds.concat(staffIds)));
    const users = await User.find({ userId: { $in: allUserIds } }, 'name email phone userId');
    const userMap = new Map(users.map(user => [user.userId, user]));

    // Combine enrollment data with user data
    const enrollments = rawEnrollments.map(enrollment => ({
      ...enrollment.toObject(),
      userId: userMap.get(enrollment.userId) || { 
        userId: enrollment.userId, 
        name: 'Unknown User', 
        email: '', 
        phone: '' 
      },
      assignedStaff: enrollment.assignedStaff ? (userMap.get(enrollment.assignedStaff) || {
        userId: enrollment.assignedStaff,
        name: 'Unknown Staff',
        email: ''
      }) : null
    }));

    // Calculate stats (only for admin/staff)
    let stats: any = null;
    if (user.role === 'admin' || user.role === 'staff') {
      const [totalCount, activeCount, completedCount, cancelledCount, avgDuration] = await Promise.all([
        Enrollment.countDocuments(),
        Enrollment.countDocuments({ status: 'active' }),
        Enrollment.countDocuments({ status: 'completed' }),
        Enrollment.countDocuments({ status: 'cancelled' }),
        Enrollment.aggregate([
          { $group: { _id: null, avgDuration: { $avg: '$planId.duration' } } }
        ])
      ]);

      // Calculate total value
      const enrollmentsWithPlans = await Enrollment.find()
        .populate('planId', 'totalAmount')
        .lean();
      
      const totalValue = enrollmentsWithPlans.reduce((sum, enrollment) => {
        return sum + (enrollment.planId?.totalAmount || 0);
      }, 0);

      stats = {
        totalEnrollments: totalCount,
        activeEnrollments: activeCount,
        completedEnrollments: completedCount,
        cancelledEnrollments: cancelledCount,
        totalValue,
        averageDuration: Math.round(avgDuration[0]?.avgDuration || 18)
      };
    }

    return NextResponse.json({ 
      success: true,
      enrollments,
      stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
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
    
    // Debug logging
    console.log('Enrollment request data:', { userId, planId, startDate, nominee, assignedStaff });
    console.log('Plan ID type:', typeof planId, 'Plan ID value:', planId);
    
    // Verify plan exists (using Plan model for consistency with /api/plans)
    const plan = await Plan.findById(planId);
    console.log('Plan lookup result:', plan ? 'Found' : 'Not found');
    
    if (!plan) {
      // Try to find all plans to see what's available
      const allPlans = await Plan.find({}).select('_id planName').limit(5);
      console.log('Available plans (first 5):', allPlans);
      
      return NextResponse.json(
        { error: `Plan not found with ID: ${planId}` },
        { status: 404 }
      );
    }
    
    // Verify user exists - try both userId and _id
    console.log('Looking for user with userId:', userId);
    let targetUser = await User.findOne({ userId });
    
    if (!targetUser) {
      // Only try findById if userId looks like an ObjectId (24 hex characters)
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
      if (isObjectId) {
        console.log('Trying findById as userId appears to be an ObjectId');
        targetUser = await User.findById(userId);
      }
    }
    
    if (!targetUser) {
      console.log('User not found with ID:', userId);
      return NextResponse.json(
        { error: `User not found with ID: ${userId}` },
        { status: 404 }
      );
    }
    
    console.log('Found user:', { _id: targetUser._id, userId: targetUser.userId, name: targetUser.name });
    
    // Check if user is already actively enrolled in this plan
    console.log('Checking for existing active enrollment with userId:', targetUser.userId, 'planId:', planId);
    const existingActiveEnrollment = await Enrollment.findOne({ 
      userId: targetUser.userId, 
      planId,
      status: 'active'
    });
    console.log('Existing active enrollment found:', existingActiveEnrollment ? 'Yes' : 'No');
    
    if (existingActiveEnrollment) {
      return NextResponse.json(
        { error: 'User already has an active enrollment in this plan' },
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
      userId: targetUser.userId, // Use the user's custom userId, not _id
      planId,
      enrollmentDate: start,
      startDate: start,
      endDate: end,
      status: 'active',
      totalDue: plan.totalAmount,
      nextDueDate: start,
      nominee,
      assignedStaff: assignedStaff || user.userId
    });
    
    await enrollment.save();
    
    // Manually populate user data since userId and assignedStaff are now strings, not ObjectId references
    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('planId', 'planName totalAmount installmentAmount duration');
    
    // Get user data separately using the string userIds
    const [userData, staffData] = await Promise.all([
      User.findOne({ userId: enrollment.userId }, 'name email phone userId'),
      enrollment.assignedStaff ? User.findOne({ userId: enrollment.assignedStaff }, 'name email userId') : null
    ]);
    
    // Add user and staff data to the enrollment object
    const enrollmentWithUser = {
      ...populatedEnrollment.toObject(),
      userId: userData || { userId: enrollment.userId, name: 'Unknown User', email: '', phone: '' },
      assignedStaff: staffData || (enrollment.assignedStaff ? { userId: enrollment.assignedStaff, name: 'Unknown Staff', email: '' } : null)
    };
    
    return NextResponse.json({
      message: 'Enrollment created successfully',
      enrollment: enrollmentWithUser
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create enrollment error:', error);
    return NextResponse.json(
      { error: 'Failed to create enrollment' },
      { status: 500 }
    );
  }
}