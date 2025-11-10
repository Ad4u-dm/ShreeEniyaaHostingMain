import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import ChitPlan from '@/models/ChitPlan';
import Enrollment from '@/models/Enrollment';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { paymentId, type = 'payment' } = await request.json();

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Fetch payment details with all related data
    const payment = await Payment.findById(paymentId)
      .populate('userId', 'name email phone address')
      .populate('planId', 'planName totalAmount duration monthlyAmount')
      .populate('enrollmentId', 'memberNumber startDate');

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Generate invoice data
    const invoiceData = {
      invoiceNumber: `INV-${Date.now()}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      type,
      customer: {
        name: payment.userId.name,
        email: payment.userId.email,
        phone: payment.userId.phone,
        address: payment.userId.address || 'Address not provided'
      },
      plan: {
        name: payment.planId.planName,
        totalAmount: payment.planId.totalAmount,
        duration: payment.planId.duration,
        monthlyAmount: payment.planId.monthlyAmount
      },
      enrollment: {
        memberNumber: payment.enrollmentId.memberNumber,
        startDate: payment.enrollmentId.startDate
      },
      payment: {
        amount: payment.amount,
        method: payment.paymentMethod,
        date: payment.createdAt,
        status: payment.status,
        remarks: payment.remarks
      },
      company: {
        name: 'Shree Eniyaa Chitfunds (P) Ltd.',
        address: 'Shop No. 2, Irundam Thalam, No. 40, Mahathanath Street, Mayiladuthurai – 609 001.',
        phone: '96266 66527, 90035 62126',
        email: 'shreeniyaachitfunds@gmail.com',
        website: 'www.shreeniyaachitfunds.com'
      }
    };

    // Calculate totals
    const subtotal = payment.amount;
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;

    const completeInvoiceData = {
      ...invoiceData,
      amounts: {
        subtotal,
        tax,
        total
      }
    };

    return NextResponse.json({
      success: true,
      invoice: completeInvoiceData
    });

  } catch (error) {
    console.error('Generate invoice error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const planId = searchParams.get('planId');
    const latest = searchParams.get('latest');

    // If requesting latest invoice for balance calculation
    if (latest && customerId && planId) {
      const latestInvoice = await Invoice.findOne({
        customerId: customerId,
        planId: planId,
        status: { $in: ['sent', 'paid'] }
      })
      .sort({ createdAt: -1 })
      .select('balanceAmount totalAmount receivedAmount dueAmount')
      .lean();

      console.log('Latest invoice lookup:', {
        customerId,
        planId,
        latestInvoice
      });

      if (latestInvoice) {
        return NextResponse.json({
          success: true,
          invoice: {
            balanceAmount: latestInvoice.balanceAmount || 0
          }
        });
      } else {
        return NextResponse.json({
          success: true,
          invoice: null // No previous invoice found
        });
      }
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // For now, we'll return recent payments that can be converted to invoices
    const [payments, total] = await Promise.all([
      Payment.find()
        .populate('userId', 'name email phone')
        .populate('planId', 'planName')
        .populate('enrollmentId', 'memberNumber')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit),
      Payment.countDocuments()
    ]);

    // Transform payments to invoice-ready format
    const invoiceablePayments = payments.map(payment => ({
      id: payment._id,
      paymentId: payment._id,
      customerName: payment.userId.name,
      planName: payment.planId.planName,
      amount: payment.amount,
      date: payment.createdAt,
      status: payment.status,
      canGenerateInvoice: true
    }));

    return NextResponse.json({
      success: true,
      invoices: invoiceablePayments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}