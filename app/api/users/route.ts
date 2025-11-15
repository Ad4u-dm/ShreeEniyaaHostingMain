import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build query
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    } else {
      // By default, exclude staff members from users list
      query.role = { $ne: 'staff' };
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit),
      User.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { name, email, phone, role, password } = await request.json();

    // Validate required fields based on role
    if (!name || !phone || !role) {
      return NextResponse.json(
        { success: false, error: 'Name, phone, and role are required' },
        { status: 400 }
      );
    }

    // For staff and admin roles, email and password are required
    if ((role === 'staff' || role === 'admin') && (!email || !password)) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required for staff and admin accounts' },
        { status: 400 }
      );
    }

    // Check if user already exists (only check email if provided)
    const existingUserQuery: any = { phone };
    if (email) {
      existingUserQuery.$or = [{ email }, { phone }];
    }
    
    const existingUser = await User.findOne(existingUserQuery);

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email or phone already exists' },
        { status: 400 }
      );
    }

    // Hash password (only if provided)
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    // Determine if created by staff (check for authorization token)
    let createdByUserId = null;
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        
        // If the creator is staff, set createdBy field
        if (decoded.role === 'staff') {
          const staffUser = await User.findOne({ 
            email: decoded.email, 
            role: 'staff' 
          });
          if (staffUser) {
            createdByUserId = staffUser._id;
          }
        }
      } catch (jwtError) {
        // Token is invalid but we can still create user (for admin)
        console.log('JWT verification failed during user creation:', jwtError);
      }
    }

    // Create user data object
    const userData: any = {
      name,
      phone,
      role
    };

    // Add email and password only if provided (for staff/admin)
    if (email) {
      userData.email = email;
    }
    if (hashedPassword) {
      userData.password = hashedPassword;
    }

    // Add createdBy field if created by staff
    if (createdByUserId) {
      userData.createdBy = createdByUserId;
    }

    const user = new User(userData);
    await user.save();

    // Return user without password
    const { password: _, ...userWithoutPassword } = user.toObject();

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}