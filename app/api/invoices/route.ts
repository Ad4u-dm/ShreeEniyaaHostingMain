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
        planId: planId
      })
      .sort({ createdAt: -1 })
      .select('balanceAmount totalAmount receivedAmount dueAmount arrearAmount')
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
            balanceAmount: latestInvoice.balanceAmount || 0,
            arrearAmount: latestInvoice.arrearAmount || 0
          }
        });
      } else {
        return NextResponse.json({
          success: true,
          invoice: null // No previous invoice found
        });
      }
    }

    // For counting payments for due number calculation
    if (customerId && planId && !latest) {
      try {
        console.log('=== API: Getting next due number ===', { customerId, planId });
        
        // First try to get the latest invoice for this customer and plan to get the highest due number
        const latestInvoice = await Invoice.findOne({
          customerId: customerId,
          planId: planId
        })
        .sort({ dueNumber: -1, createdAt: -1 }) // Sort by dueNumber first, then createdAt
        .select('dueNumber')
        .lean();
        
        console.log('=== API: Latest invoice found ===', latestInvoice);
        
        let nextDueNumber = 1; // Default
        
        if (latestInvoice && latestInvoice.dueNumber) {
          // If we found an invoice with a due number, increment it
          nextDueNumber = parseInt(latestInvoice.dueNumber) + 1;
          console.log('=== API: Incrementing due number ===', {
            lastDueNumber: latestInvoice.dueNumber,
            nextDueNumber
          });
        } else {
          // Fallback: Count existing invoices for this customer/plan
          const invoiceCount = await Invoice.countDocuments({
            customerId: customerId,
            planId: planId
          });
          nextDueNumber = invoiceCount + 1;
          console.log('=== API: Fallback count method ===', {
            invoiceCount,
            nextDueNumber
          });
        }

        // Return the next due number
        return NextResponse.json({
          success: true,
          nextDueNumber: nextDueNumber,
          // Keep these for compatibility
          invoices: [],
          paymentCount: nextDueNumber - 1
        });
        
      } catch (error) {
        console.error('Error getting next due number:', error);
        return NextResponse.json({
          success: true,
          nextDueNumber: 1,
          invoices: [],
          paymentCount: 0
        });
      }
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // For general invoice listing - use a safer query without populate
    try {
      const [payments, total] = await Promise.all([
        Payment.find()
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip((page - 1) * limit)
          .lean(), // Use lean for better performance
        Payment.countDocuments()
      ]);

      // Transform payments to invoice-ready format without populate
      const invoiceablePayments = payments.map(payment => ({
        id: payment._id,
        paymentId: payment._id,
        customerName: payment.userId || 'Unknown', // Use userId directly
        planName: payment.planId || 'Unknown',     // Use planId directly  
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
  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}