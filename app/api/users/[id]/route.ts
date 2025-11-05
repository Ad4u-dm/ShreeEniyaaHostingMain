import { NextRequest, NextResponse } from 'next/server';
import getMongoURI from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const mongoURI = getMongoURI();
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoURI);
    }

    const user = await User.findById(params.id).select('-password');
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const mongoURI = getMongoURI();
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoURI);
    }

    const { name, email, phone, role } = await request.json();

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email, 
      _id: { $ne: params.id } 
    });

    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email is already registered with another user' 
      }, { status: 400 });
    }

    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      { 
        name: name?.trim(),
        email: email?.toLowerCase().trim(),
        phone: phone?.trim(),
        role,
        updatedAt: new Date()
      },
      { new: true, select: '-password' }
    );

    if (!updatedUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const mongoURI = getMongoURI();
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoURI);
    }

    const user = await User.findById(params.id);
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Prevent deletion of admin users
    if (user.role === 'admin') {
      return NextResponse.json({ 
        success: false, 
        message: 'Admin users cannot be deleted' 
      }, { status: 403 });
    }

    await User.findByIdAndDelete(params.id);

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}