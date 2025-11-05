import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Plan from '@/models/Plan';
import Enrollment from '@/models/Enrollment';
import Payment from '@/models/Payment';
import { getUserFromRequest, hasMinimumRole, hashPassword } from '@/lib/auth';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberData = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'phone', 'planId'];
    for (const field of requiredFields) {
      if (!memberData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Check if email or phone already exists
    const existingUser = await User.findOne({
      $or: [
        { email: memberData.email },
        { phone: memberData.phone }
      ]
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email or phone already exists' },
        { status: 400 }
      );
    }

    // Validate plan exists
    const plan = await Plan.findById(memberData.planId);
    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    // Hash temporary password
    const tempPassword = `${memberData.name.replace(/\s+/g, '').toLowerCase()}123`;
    const hashedPassword = await hashPassword(tempPassword);

    // Create new user (customer)
    const newUser = new User({
      name: memberData.name,
      email: memberData.email,
      phone: memberData.phone,
      role: 'user', // 'user' represents customers in the system
      password: hashedPassword, // Hashed temporary password
      address: {
        street: memberData.street || '',
        city: memberData.city || '',
        state: memberData.state || '',
        pincode: memberData.pincode || ''
      },
      dateOfBirth: memberData.dateOfBirth ? new Date(memberData.dateOfBirth) : undefined,
      occupation: memberData.occupation || '',
      nomineeName: memberData.nomineeName || '',
      nomineeRelation: memberData.nomineeRelation || undefined,
      emergencyContact: memberData.emergencyContact || '',
      createdBy: new mongoose.Types.ObjectId(user.userId),
      isActive: true,
      status: 'active'
    });

    const savedUser = await newUser.save();

    // Generate member number (CF + year + sequential number)
    const currentYear = new Date().getFullYear();
    const totalEnrollments = await Enrollment.countDocuments();
    const memberNumber = `CF${currentYear}${String(totalEnrollments + 1).padStart(4, '0')}`;
    
    // For the enrollment's memberNumber field (numeric position in the plan)
    const planEnrollments = await Enrollment.countDocuments({ planId: plan._id });
    const memberPosition = planEnrollments + 1;

    // Create enrollment
    const enrollment = new Enrollment({
      userId: savedUser._id,
      planId: plan._id,
      memberNumber: memberPosition, // Numeric position in the plan (1, 2, 3, etc.)
      enrollmentId: `ENR${memberNumber}`, // String identifier like ENR-CF20250001
      assignedStaff: user.userId,
      startDate: new Date(),
      endDate: new Date(Date.now() + plan.duration * 30 * 24 * 60 * 60 * 1000), // duration in months
      status: 'active',
      totalPaid: 0,
      totalDue: plan.totalAmount,
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      createdAt: new Date()
    });

    const savedEnrollment = await enrollment.save();

    // Create payment schedule using month-wise data
    const payments = [];
    const startDate = new Date();
    
    for (let i = 1; i <= plan.duration; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      // Get amount for this specific month from monthlyData
      const monthData = plan.monthlyData?.find((m: any) => m.monthNumber === i);
      const amount = monthData ? monthData.payableAmount : (plan.monthlyAmount || Math.round(plan.totalAmount / plan.duration));
      
      const payment = new Payment({
        enrollmentId: savedEnrollment._id,
        userId: savedUser._id,
        planId: plan._id,
        installmentNumber: i,
        amount: amount,
        dueDate: dueDate,
        status: 'pending',
        paymentType: 'installment', // Correct enum value
        paymentMethod: 'cash', // Default payment method
        createdAt: new Date()
      });
      
      payments.push(payment);
    }

    // Save payments individually to trigger pre-save hooks
    for (const payment of payments) {
      await payment.save();
    }

    // Populate the enrollment with user and plan details for response
    const populatedEnrollment = await Enrollment.findById(savedEnrollment._id)
      .populate('userId')
      .populate('planId');

    return NextResponse.json({
      success: true,
      message: 'Member registered successfully',
      member: {
        userId: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        phone: savedUser.phone,
        memberNumber: memberNumber,
        enrollmentId: savedEnrollment.enrollmentId,
        planName: plan.planName,
        monthlyAmount: plan.monthlyAmount || Math.round(plan.totalAmount / plan.duration),
        totalAmount: plan.totalAmount,
        duration: plan.duration,
        nextPaymentDate: savedEnrollment.nextPaymentDate,
        status: savedEnrollment.status,
        tempPassword: tempPassword // Include temporary password for staff to communicate to customer
      }
    });

  } catch (error) {
    console.error('Member registration error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to register member', 
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build search query
    let searchQuery: any = {
      assignedStaff: user.userId
    };

    if (status !== 'all') {
      searchQuery.status = status;
    }

    // Get enrollments with populated user and plan data
    const enrollments = await Enrollment.find(searchQuery)
      .populate({
        path: 'userId',
        match: search ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ]
        } : {}
      })
      .populate('planId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Filter out enrollments where user didn't match the search
    const filteredEnrollments = enrollments.filter(enrollment => enrollment.userId);

    // Get total count for pagination
    const totalCount = await Enrollment.countDocuments(searchQuery);

    return NextResponse.json({
      success: true,
      members: filteredEnrollments.map(enrollment => ({
        _id: enrollment._id,
        userId: enrollment.userId,
        planId: enrollment.planId,
        memberNumber: enrollment.memberNumber,
        enrollmentId: enrollment.enrollmentId,
        status: enrollment.status,
        totalPaid: enrollment.totalPaid,
        pendingAmount: enrollment.pendingAmount,
        nextPaymentDate: enrollment.nextPaymentDate,
        createdAt: enrollment.createdAt
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount,
        hasMore: page * limit < totalCount
      }
    });

  } catch (error) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}