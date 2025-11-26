import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import Plan from '@/models/Plan';
import Enrollment from '@/models/Enrollment';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';
import {
  calculateDueNumber,
  formatPaymentMonth,
  calculateArrearAmount,
  calculateBalanceAmount
} from '@/lib/invoiceUtils';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch invoices without populating customerId
    const invoices = await Invoice.find({})
      .populate('planId', 'planName totalAmount monthlyAmount duration')
      .populate('enrollmentId', 'enrollmentId memberNumber status')
      .sort({ createdAt: -1 })
      .lean();

    // Manually fetch user details for each invoice
    const processedInvoices = await Promise.all(invoices.map(async invoice => {
  // Fetch user by custom userId
  let customer = await User.findOne({ userId: invoice.customerId }).select('userId name email phone');
  // Fetch createdBy user by custom userId
  let creator = invoice.createdBy ? await User.findOne({ userId: invoice.createdBy }).select('_id name email') : null;
      // Determine status based on due date and payment status
      let status = invoice.status || 'draft';
      if (invoice.dueDate && new Date(invoice.dueDate) < new Date() && status !== 'paid') {
        status = 'overdue';
      }
      return {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        receiptNo: invoice.receiptNo,
        customerId: customer ? {
          userId: customer.userId,
          name: customer.name,
          email: customer.email,
          phone: customer.phone
        } : { userId: invoice.customerId, name: 'Unknown Customer', email: '', phone: '' },
        planId: invoice.planId ? {
          _id: invoice.planId._id,
          name: invoice.planId.planName || 'No Plan',
          monthlyAmount: invoice.planId.monthlyAmount || 0
        } : invoice.planId,
        createdBy: creator ? {
          _id: creator._id,
          name: creator.name || 'Unknown',
          email: creator.email || ''
        } : null,
        amount: invoice.receivedAmount || 0,
        dueDate: invoice.dueDate,
        issueDate: invoice.issueDate || invoice.createdAt,
        status,
        description: invoice.description || `Payment for ${invoice.planId?.planName || 'Chit Fund'}`,
        items: invoice.items || [{
          description: `Payment - ${invoice.planId?.planName || 'Chit Fund'}`,
          quantity: 1,
          rate: invoice.receivedAmount || 0,
          amount: invoice.receivedAmount || 0
        }],
        subtotal: invoice.receivedAmount || 0,
        tax: invoice.tax || 0,
        total: invoice.receivedAmount || 0,
        paymentTerms: invoice.paymentTerms || '30 days',
        notes: invoice.notes || 'Thank you for your business!',
        template: invoice.template || 1,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt
      };
    }));

    // Calculate statistics from real data
    const currentDate = new Date();
    const stats = {
      totalInvoices: processedInvoices.length,
      draftInvoices: processedInvoices.filter(inv => inv.status === 'draft').length,
      sentInvoices: processedInvoices.filter(inv => inv.status === 'sent').length,
      paidInvoices: processedInvoices.filter(inv => inv.status === 'paid').length,
      overdueInvoices: processedInvoices.filter(inv => inv.status === 'overdue').length,
      cancelledInvoices: processedInvoices.filter(inv => inv.status === 'cancelled').length,
      totalAmount: processedInvoices.reduce((sum, inv) => sum + inv.total, 0),
      paidAmount: processedInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
      overdueAmount: processedInvoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0)
    };

    return NextResponse.json({
      success: true,
      invoices: processedInvoices,
      stats
    });

  } catch (error) {
    console.error('Invoices API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch invoices data' 
      },
      { status: 500 }
    );
  }
}

// Create new invoice
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoiceData = await request.json();
    console.log('Received invoice data:', invoiceData);

    await connectDB();

    // Validate required fields (enrollmentId and dueNumber NOT required - auto-handled by backend)
    const requiredFields = ['customerId', 'planId', 'createdBy', 'customerDetails', 'planDetails'];
    for (const field of requiredFields) {
      if (!invoiceData[field]) {
        return NextResponse.json(
          {
            success: false,
            error: `Missing required field: ${field}`
          },
          { status: 400 }
        );
      }
    }

    // STEP 1: Find or auto-create enrollment (SILENT - no UI changes needed)
    let enrollment = await Enrollment.findOne({
      userId: invoiceData.customerId,
      planId: invoiceData.planId
    }).lean();

    if (!enrollment) {
      // Cannot auto-create enrollment without memberNumber
      return NextResponse.json(
        {
          success: false,
          error: 'No enrollment found for this user and plan. Please create an enrollment first with a member number.'
        },
        { status: 404 }
      );
    }

    // Fetch the plan to get monthly amount array and duration
    const plan = await Plan.findById(invoiceData.planId);
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan not found' },
        { status: 404 }
      );
    }

    // AUTO-HEALING: Rebuild monthlyAmount from monthlyData if missing or mismatched
    if ((!plan.monthlyAmount || plan.monthlyAmount.length !== plan.duration) &&
        plan.monthlyData && plan.monthlyData.length > 0) {
      console.log('Auto-healing plan monthlyAmount array from monthlyData');
      plan.monthlyAmount = plan.monthlyData
        .sort((a: any, b: any) => a.monthNumber - b.monthNumber)
        .map((m: any) => m.payableAmount ?? m.installmentAmount ?? 0);
      await plan.save();
    }

    // STEP 1: Calculate dueNumber automatically using enrollmentDate + invoiceDate + 20th cut-off
    const invoiceDate = invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate) : new Date();
    const enrollmentDate = new Date(enrollment.enrollmentDate);

    let dueNumber: number;
    try {
      dueNumber = calculateDueNumber(enrollmentDate, invoiceDate, plan.duration);
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Validate dueNumber against plan duration
    if (dueNumber > plan.duration) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid due number ${dueNumber}: plan has only ${plan.duration} installments`
        },
        { status: 400 }
      );
    }

    // STEP 2: Calculate dueAmount from monthlyData based on dueNumber
    // Due amount should come from installmentAmount (the 'Due' column)
    const index = dueNumber - 1;
    let calculatedDueAmount = 0;

    // Use monthlyData.installmentAmount for due
    const monthInfo = plan.monthlyData?.[index];
    if (monthInfo) {
      calculatedDueAmount = monthInfo.installmentAmount ?? 0;
    }
    // Fallback: Use monthlyAmount array
    else if (plan.monthlyAmount && Array.isArray(plan.monthlyAmount) && index < plan.monthlyAmount.length) {
      calculatedDueAmount = plan.monthlyAmount[index];
    }
    // No data available
    else {
      return NextResponse.json(
        {
          success: false,
          error: 'Plan does not have monthly amount data configured'
        },
        { status: 400 }
      );
    }

    console.log('Due amount calculation:', {
      dueNumber,
      index,
      calculatedDueAmount,
      source: 'plan.monthlyData[dueNumber-1]'
    });

    // STEP 3: Get previous invoice for arrear and balance calculation
    const currentDay = invoiceDate.getDate();
    const previousInvoice = await Invoice.findOne({
      enrollmentId: enrollment._id,
      invoiceDate: { $lt: invoiceDate }
    })
      .sort({ invoiceDate: -1 })
      .limit(1)
      .lean();

    // STEP 4: Calculate arrear amount from previous invoice for same enrollment
    const arrearAmount = await calculateArrearAmount(enrollment._id, Invoice, invoiceDate);

    // For first invoice on non-21st day, use due amount as the starting balance
    // Otherwise use the actual previous balance
    let previousBalance: number;
    if (!previousInvoice && currentDay !== 21) {
      // First invoice on non-21st: starting balance = due amount
      previousBalance = calculatedDueAmount;
      console.log('First invoice on non-21st: setting previousBalance = dueAmount:', previousBalance);
    } else {
      previousBalance = previousInvoice ? (previousInvoice.balanceAmount || 0) : 0;
    }

    // STEP 5: Calculate balance amount using the 21st rule
    const receivedAmount = invoiceData.receivedAmount || 0;
    const balanceAmount = calculateBalanceAmount(
      calculatedDueAmount,
      arrearAmount,
      receivedAmount,
      invoiceDate,
      previousBalance
    );

    // STEP 5: Calculate payment month from invoice date
    const paymentMonth = formatPaymentMonth(invoiceDate);

    // Validate customer details required fields
    if (!invoiceData.customerDetails.name || !invoiceData.customerDetails.phone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Customer name and phone are required'
        },
        { status: 400 }
      );
    }

    // Validate plan details required fields
    if (!invoiceData.planDetails.planName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Plan name is required'
        },
        { status: 400 }
      );
    }

    // Validate items have descriptions (if provided)
    if (invoiceData.items && invoiceData.items.some((item: any) => !item.description)) {
      return NextResponse.json(
        {
          success: false,
          error: 'All items must have descriptions'
        },
        { status: 400 }
      );
    }

    // Generate invoice number
    const latestInvoice = await Invoice.findOne({}, {}, { sort: { 'invoiceNumber': -1 } });
    let invoiceNumber = 'INV-0001';

    if (latestInvoice && latestInvoice.invoiceNumber) {
      const lastNumber = parseInt(latestInvoice.invoiceNumber.split('-')[1]) || 0;
      invoiceNumber = `INV-${String(lastNumber + 1).padStart(4, '0')}`;
    }

    // Calculate total amount for invoice display
    // Total = what was billed this month (due + arrear), NOT the balance after payment
    const totalAmount = calculatedDueAmount + arrearAmount;

    // Update items array with the billed amount (due + arrear)
    const updatedItems = invoiceData.items?.map((item: any) => ({
      ...item,
      amount: totalAmount // Total billed amount (always positive)
    })) || [{
      description: `Payment for ${plan.planName}`,
      amount: totalAmount,
      type: 'installment'
    }];

    // Add enrollmentId to invoiceData (auto-found/created above)
    const completeInvoiceData = {
      ...invoiceData,
      enrollmentId: enrollment._id, // Add the auto-found/created enrollmentId
      items: updatedItems, // Use updated items with balance amount
      planDetails: {
        ...invoiceData.planDetails,
        monthlyAmount: calculatedDueAmount, // Required by schema
        duration: plan.duration,
        totalAmount: plan.totalAmount
      }
    };

    // Always use memberNumber from enrollment (created during user creation)
    const memberNumber = enrollment.memberNumber;

    // Create new invoice in database with all calculated values
    const newInvoice = new Invoice({
      ...completeInvoiceData,
      invoiceNumber,
      invoiceDate,
      memberNumber, // Ensure memberNumber is always set
      dueNumber: dueNumber.toString(), // Store as string per schema
      dueAmount: calculatedDueAmount,
      arrearAmount,
      receivedAmount,
      balanceAmount,
      totalAmount,
      paymentMonth,
      subtotal: totalAmount, // Required by schema
      taxAmount: 0, // Explicitly set to 0 for chit fund invoices
      penaltyAmount: 0, // Explicitly set to 0 (unless there's a penalty)
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Creating invoice with calculated values:', {
      enrollmentId: newInvoice.enrollmentId,
      customerId: newInvoice.customerId,
      planId: newInvoice.planId,
      dueNumber,
      dueAmount: calculatedDueAmount,
      arrearAmount,
      receivedAmount,
      balanceAmount,
      totalAmount,
      paymentMonth,
      items: newInvoice.items,
      subtotal: newInvoice.subtotal,
      taxAmount: newInvoice.taxAmount,
      penaltyAmount: newInvoice.penaltyAmount
    });

    await newInvoice.save();
    console.log('Invoice saved successfully with ID:', newInvoice._id);
    console.log('After save - totalAmount:', newInvoice.totalAmount, 'subtotal:', newInvoice.subtotal, 'items:', newInvoice.items.map((i: any) => i.amount));

    // Populate references for response
    // Manually fetch user details for string customerId
  const customerUser = await User.findOne({ userId: newInvoice.customerId }).select('name email phone');
  const invoicePlan = await Plan.findById(newInvoice.planId).select('planName monthlyAmount duration');
  const invoiceEnrollment = await Enrollment.findById(newInvoice.enrollmentId).select('userId planId enrollmentDate');

    const invoiceResponse = {
      ...newInvoice.toObject(),
      customerId: customerUser ? {
        userId: customerUser.userId,
        name: customerUser.name,
        email: customerUser.email,
        phone: customerUser.phone
      } : { userId: newInvoice.customerId, name: 'Unknown', email: '', phone: '' },
      planId: invoicePlan ? {
        _id: invoicePlan._id,
        planName: invoicePlan.planName,
        monthlyAmount: invoicePlan.monthlyAmount,
        duration: invoicePlan.duration
      } : newInvoice.planId,
      enrollmentId: invoiceEnrollment ? {
        _id: invoiceEnrollment._id,
        userId: invoiceEnrollment.userId,
        planId: invoiceEnrollment.planId,
        enrollmentDate: invoiceEnrollment.enrollmentDate
      } : newInvoice.enrollmentId
    };

    return NextResponse.json({
      success: true,
      invoice: invoiceResponse,
      message: 'Invoice created successfully'
    });

  } catch (error: any) {
    console.error('Create invoice error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: validationErrors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create invoice'
      },
      { status: 500 }
    );
  }
}