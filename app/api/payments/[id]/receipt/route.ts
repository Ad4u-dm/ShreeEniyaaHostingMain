import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    
    // Find the payment by ID or paymentId
    const payment = await Payment.findOne({
      $or: [
        { _id: id },
        { paymentId: id }
      ]
    })
    .populate('userId', 'name email phone address')
    .populate('enrollmentId', 'enrollmentId memberNumber')
    .populate('planId', 'planName totalAmount installmentAmount')
    .populate('collectedBy', 'name email');
    
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    
    // Check access permissions
    if (user.role === 'user' && payment.userId._id !== user.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Generate receipt data
    const receipt = {
      receiptNumber: payment.receiptNumber,
      paymentId: payment.paymentId,
      date: payment.paidDate,
      customer: {
        name: payment.userId.name,
        phone: payment.userId.phone,
        email: payment.userId.email,
        memberNumber: payment.enrollmentId.memberNumber
      },
      plan: {
        name: payment.planId.planName,
        installmentAmount: payment.planId.installmentAmount
      },
      payment: {
        amount: payment.amount,
        method: payment.paymentMethod,
        type: payment.paymentType,
        installmentNumber: payment.installmentNumber,
        transactionId: payment.transactionId,
        notes: payment.notes
      },
      staff: {
        name: payment.collectedBy?.name || 'System',
        collectionMethod: payment.collectionMethod
      },
      penalty: {
        daysPastDue: payment.daysPastDue,
        penaltyAmount: payment.penaltyAmount
      }
    };
    
    return NextResponse.json({ 
      success: true, 
      receipt 
    });
    
  } catch (error) {
    console.error('Get receipt error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipt' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const { format = 'thermal' } = await request.json();
    
    // Find the payment
    const payment = await Payment.findOne({
      $or: [
        { _id: id },
        { paymentId: id }
      ]
    })
    .populate('userId', 'name email phone address')
    .populate('enrollmentId', 'enrollmentId memberNumber')
    .populate('planId', 'planName totalAmount installmentAmount')
    .populate('collectedBy', 'name email');
    
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    
    // Mark receipt as generated and update path
    const receiptPath = `/receipt/${format}/${payment.paymentId}`;
    
    await Payment.findByIdAndUpdate(payment._id, {
      receiptGenerated: true,
      receiptPath: receiptPath,
      updatedAt: new Date()
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Receipt generated successfully',
      receiptPath: receiptPath,
      receiptUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${receiptPath}`
    });
    
  } catch (error) {
    console.error('Generate receipt error:', error);
    return NextResponse.json(
      { error: 'Failed to generate receipt' },
      { status: 500 }
    );
  }
}