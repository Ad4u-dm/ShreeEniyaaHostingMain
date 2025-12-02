import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
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
  const { name, email, phone, role, address, dob, weddingDate } = await req.json();

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
    if (dob) updateData.dateOfBirth = new Date(dob);
    if (weddingDate) updateData.weddingDate = new Date(weddingDate);

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

    // CASCADE DELETE: Remove all related data
    const userId = user.userId; // Get the custom userId field
    
    console.log(`🗑️ Starting cascade deletion for user: ${userId} (${user.name})`);
    
    // 1. Delete all enrollments for this user
    const deletedEnrollments = await Enrollment.deleteMany({ userId: userId });
    console.log(`   ✓ Deleted ${deletedEnrollments.deletedCount} enrollments`);
    
    // 2. Delete all invoices for this user
    const deletedInvoices = await Invoice.deleteMany({ customerId: userId });
    console.log(`   ✓ Deleted ${deletedInvoices.deletedCount} invoices`);
    
    // 3. Delete all payments for this user
    const deletedPayments = await Payment.deleteMany({ customerId: userId });
    console.log(`   ✓ Deleted ${deletedPayments.deletedCount} payments`);
    
    // 4. Finally, delete the user
    await User.findByIdAndDelete(id);
    console.log(`   ✓ Deleted user: ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'User and all related data deleted successfully',
      deleted: {
        enrollments: deletedEnrollments.deletedCount,
        invoices: deletedInvoices.deletedCount,
        payments: deletedPayments.deletedCount
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}