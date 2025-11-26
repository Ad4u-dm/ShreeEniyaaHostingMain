import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    let user = null;
    // Check if id is a valid ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      user = await User.findById(id).select('-password');
    } else {
      user = await User.findOne({ userId: id }).select('-password');
    }

    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

  const { id } = await params;
  const { name, email, phone, role, address } = await req.json();

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ 
      email, 
      _id: { $ne: id } 
    });

    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email is already registered with another user' 
      }, { status: 400 });
    }

    const updateData: any = {
      name: name?.trim(),
      email: email?.toLowerCase().trim(),
      phone: phone?.trim(),
      updatedAt: new Date()
    };

    if (role) updateData.role = role;
    if (address) updateData.address = address;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

  const { id } = await params;
    const user = await User.findById(id);
    
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

    await User.findByIdAndDelete(id);

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}