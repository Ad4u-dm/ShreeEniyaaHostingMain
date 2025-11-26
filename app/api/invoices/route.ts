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

    // Chit fund logic for balance and arrear calculation
    // Fetch previous invoice for this customer/plan
    const previousInvoice = await Invoice.findOne({
      customerId: payment.userId._id,
      planId: payment.planId._id
    }).sort({ createdAt: -1 });

    const today = new Date();
    const is21st = today.getDate() === 21;
    let arrearAmount = 0;
    let balanceAmount = 0;
    let dueAmount = payment.planId.monthlyAmount;
    let receivedAmount = payment.amount;

    // Debug logging for previous invoice and calculation
    console.log('=== INVOICE CALCULATION DEBUG ===');
    if (previousInvoice) {
      console.log('Previous Invoice:', {
        balanceAmount: previousInvoice.balanceAmount,
        arrearAmount: previousInvoice.arrearAmount,
        dueAmount: previousInvoice.dueAmount,
        receivedAmount: previousInvoice.receivedAmount,
        invoiceId: previousInvoice.invoiceId
      });
    } else {
      console.log('No previous invoice found for customer/plan');
    }
    console.log('Current Payment:', { dueAmount, receivedAmount, is21st });

    // Improved logic for all scenarios
    if (!previousInvoice) {
      // First invoice logic
      arrearAmount = 0;
      balanceAmount = Math.max(0, dueAmount - receivedAmount);
      console.log('First invoice calculation:', { arrearAmount, balanceAmount });
    } else {
      // Not first invoice
      if (is21st) {
        // On 21st, arrears = previous balance
        arrearAmount = previousInvoice.balanceAmount ?? 0;
        balanceAmount = Math.max(0, (dueAmount + arrearAmount) - receivedAmount);
        console.log('21st calculation:', { arrearAmount, balanceAmount });
      } else {
        // Other days, arrears = previous arrear
        arrearAmount = previousInvoice.arrearAmount ?? 0;
        // If previous balance is zero, use dueAmount for new cycle
        if ((previousInvoice.balanceAmount ?? 0) === 0) {
          balanceAmount = Math.max(0, dueAmount - receivedAmount);
          console.log('Previous balance zero, new cycle:', { arrearAmount, balanceAmount });
        } else {
          balanceAmount = Math.max(0, previousInvoice.balanceAmount - receivedAmount);
          console.log('Normal calculation:', { arrearAmount, balanceAmount });
        }
      }
    }
    console.log('=== END INVOICE CALCULATION DEBUG ===');

    // Generate invoice data
    const invoiceData = {
      invoiceNumber: `INV-${Date.now()}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
      },
      arrearAmount,
      balanceAmount,
      dueAmount,
      receivedAmount
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

      if (latestInvoice && (latestInvoice.balanceAmount !== undefined || latestInvoice.arrearAmount !== undefined)) {
        // If both are zero, check if there are any invoices at all for this customer/plan
        const isZeroInvoice = (latestInvoice.balanceAmount === 0 && latestInvoice.arrearAmount === 0);
        if (isZeroInvoice) {
          const invoiceCount = await Invoice.countDocuments({ customerId, planId });
          if (invoiceCount === 0) {
            // Truly first invoice
            return NextResponse.json({
              success: true,
              invoice: null // No previous invoice found
            });
          } else {
            // There are invoices, but last one is zero
            return NextResponse.json({
              success: true,
              invoice: {
                balanceAmount: latestInvoice.balanceAmount || 0,
                arrearAmount: latestInvoice.arrearAmount || 0
              }
            });
          }
        } else {
          return NextResponse.json({
            success: true,
            invoice: {
              balanceAmount: latestInvoice.balanceAmount || 0,
              arrearAmount: latestInvoice.arrearAmount || 0
            }
          });
        }
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