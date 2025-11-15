import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import Plan from '@/models/Plan';
import Enrollment from '@/models/Enrollment';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get staff user details to filter invoices
    const staffUser = await User.findOne({ userId: user.userId }).lean();
    if (!staffUser) {
      return NextResponse.json({ error: 'Staff user not found' }, { status: 404 });
    }

    // Fetch all invoices (removed staff customer limitation)
    const invoices = await Invoice.find()
      .populate('customerId', 'name email phone')
      .populate('planId', 'planName totalAmount monthlyAmount duration')
      .sort({ createdAt: -1 })
      .lean();

    // Process invoices to match expected format
    const processedInvoices = invoices.map(invoice => {
      let status = invoice.status || 'draft';
      if (invoice.dueDate && new Date(invoice.dueDate) < new Date() && status === 'sent') {
        status = 'overdue';
      }

      return {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        receiptNo: invoice.receiptNo,
        customerId: {
          _id: invoice.customerId?._id,
          name: invoice.customerId?.name || 'Unknown Customer',
          email: invoice.customerId?.email || 'No email',
          phone: invoice.customerId?.phone || 'No phone'
        },
        planId: {
          _id: invoice.planId?._id,
          name: invoice.planId?.planName || 'Unknown Plan',
          monthlyAmount: invoice.planId?.monthlyAmount || 0
        },
        amount: invoice.totalAmount || 0,
        dueDate: invoice.dueDate,
        issueDate: invoice.createdAt,
        status: status,
        description: invoice.description || '',
        items: invoice.items || [],
        subtotal: invoice.subtotal || 0,
        tax: invoice.tax || 0,
        total: invoice.totalAmount || 0,
        paymentTerms: invoice.paymentTerms || '',
        notes: invoice.notes || '',
        template: invoice.template || 1
      };
    });

    // Calculate stats
    const stats = {
      totalInvoices: processedInvoices.length,
      draftInvoices: processedInvoices.filter(inv => inv.status === 'draft').length,
      sentInvoices: processedInvoices.filter(inv => inv.status === 'sent').length,
      overdueInvoices: processedInvoices.filter(inv => inv.status === 'overdue').length,
      totalAmount: processedInvoices.reduce((sum, inv) => sum + inv.total, 0),
      pendingAmount: processedInvoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + inv.total, 0),
    };

    return NextResponse.json({
      success: true,
      invoices: processedInvoices,
      stats,
      pagination: {
        page: 1,
        limit: processedInvoices.length,
        total: processedInvoices.length,
        pages: 1
      }
    });

  } catch (error) {
    console.error('Staff invoices error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoiceData = await request.json();
    console.log('Received staff invoice data:', invoiceData);
    
    await connectDB();

    // Get staff user details
    const staffUser = await User.findOne({ userId: user.userId }).lean();
    if (!staffUser) {
      return NextResponse.json({ error: 'Staff user not found' }, { status: 404 });
    }

    // Validate that the customer exists (removed staff ownership check)
    const customer = await User.findById(invoiceData.customerId).lean();
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    const requiredFields = ['enrollmentId', 'customerId', 'planId', 'createdBy', 'totalAmount', 'customerDetails', 'planDetails'];
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
    if (!invoiceData.planDetails.planName || !invoiceData.planDetails.monthlyAmount) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Plan name and monthly amount are required' 
        },
        { status: 400 }
      );
    }

    // Validate items have descriptions
    if (!invoiceData.items || invoiceData.items.some((item: any) => !item.description)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'All invoice items must have descriptions' 
        },
        { status: 400 }
      );
    }

    // Generate invoice number
    const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 }).select('invoiceNumber').lean();
    let nextInvoiceNumber = 'INV-0001';
    
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
      if (match) {
        const num = parseInt(match[1]) + 1;
        nextInvoiceNumber = `INV-${num.toString().padStart(4, '0')}`;
      }
    }

    // Create the invoice
    const newInvoice = new Invoice({
      invoiceNumber: nextInvoiceNumber,
      receiptNo: invoiceData.receiptNo,
      enrollmentId: invoiceData.enrollmentId,
      customerId: invoiceData.customerId,
      planId: invoiceData.planId,
      createdBy: staffUser._id, // Use staff user's ID
      totalAmount: invoiceData.totalAmount,
      subtotal: invoiceData.subtotal,
      tax: invoiceData.tax,
      dueDate: invoiceData.dueDate,
      status: invoiceData.status || 'draft',
      description: invoiceData.description,
      items: invoiceData.items,
      paymentTerms: invoiceData.paymentTerms,
      notes: invoiceData.notes,
      template: invoiceData.template,
      customerDetails: invoiceData.customerDetails,
      planDetails: invoiceData.planDetails
    });

    const savedInvoice = await newInvoice.save();
    console.log('Staff invoice created successfully:', savedInvoice._id);

    return NextResponse.json({
      success: true,
      invoice: savedInvoice,
      message: 'Invoice created successfully'
    });

  } catch (error) {
    console.error('Staff invoice creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
