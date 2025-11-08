import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { hashPassword, getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { email, password, name, phone, role = 'user', address } = await request.json();
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Get the creator (admin/staff) if request is authenticated
    const creator = getUserFromRequest(request);
    
    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      phone,
      role,
      address,
      createdBy: creator?.userId || null // Set creator if authenticated, null for self-registration
    });
    
    await user.save();
    
    // Remove password from response
    const { password: _, ...userResponse } = user.toObject();
    
    return NextResponse.json({
      message: 'User created successfully',
      user: userResponse
    }, { status: 201 });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}