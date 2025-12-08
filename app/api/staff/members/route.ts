import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Plan from '@/models/Plan';
import ChitPlan from '@/models/ChitPlan';
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

    // Get the full user document to access MongoDB _id
    const staffUser = await User.findOne({ userId: user.userId });
    if (!staffUser) {
      return NextResponse.json({ error: 'Staff user not found' }, { status: 401 });
    }

    const memberData = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'phone'];
    for (const field of requiredFields) {
      if (!memberData[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Check if email or phone already exists for the same role (user)
    // Allow same phone for different roles (e.g., staff and user can have same phone)
    const existingPhoneUser = await User.findOne({
      phone: memberData.phone,
      role: 'user' // Only check within user role since we're creating a user
    });

    if (existingPhoneUser) {
      return NextResponse.json(
        { error: 'A customer with this phone number already exists' },
        { status: 400 }
      );
    }

    // Check email separately (email must be unique across all roles)
    const existingEmailUser = await User.findOne({
      email: memberData.email
    });

    if (existingEmailUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
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
      createdBy: staffUser._id,
      isActive: true,
      status: 'active'
    });

    const savedUser = await newUser.save();

    return NextResponse.json({
      success: true,
      message: 'Member registered successfully',
      member: {
        userId: savedUser.userId, // Use custom userId for consistency
        name: savedUser.name,
        email: savedUser.email,
        phone: savedUser.phone,
        memberNumber: savedUser.memberNumber,
        tempPassword: tempPassword // Include temporary password for staff to communicate to customer
      }
    });

  } catch (error) {
    console.error('Member registration error:', error);
    return NextResponse.json(
      {
        error: 'Failed to register member',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : 'Internal server error'
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