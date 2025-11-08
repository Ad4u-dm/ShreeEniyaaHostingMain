import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import ChitPlan from '@/models/ChitPlan';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch real invoices with populated customer and plan data
    const invoices = await Invoice.find({})
      .populate('customerId', 'name email phone')
      .populate('planId', 'planName totalAmount monthlyAmount duration')
      .sort({ createdAt: -1 })
      .lean();

    // Process invoices to match expected format
    const processedInvoices = invoices.map(invoice => {
      // Determine status based on due date and payment status
      let status = invoice.status || 'draft';
      if (invoice.dueDate && new Date(invoice.dueDate) < new Date() && status !== 'paid') {
        status = 'overdue';
      }

      return {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: {
          _id: invoice.customerId?._id,
          name: invoice.customerId?.name || 'Unknown Customer',
          email: invoice.customerId?.email || 'No email',
          phone: invoice.customerId?.phone || 'No phone'
        },
        planId: {
          _id: invoice.planId?._id,
          name: invoice.planId?.planName || 'No Plan',
          monthlyAmount: invoice.planId?.monthlyAmount || 0
        },
        amount: invoice.amount || invoice.total || 0,
        dueDate: invoice.dueDate,
        issueDate: invoice.issueDate || invoice.createdAt,
        status,
        description: invoice.description || `Payment for ${invoice.planId?.planName || 'Chit Fund'}`,
        items: invoice.items || [{
          description: `Payment - ${invoice.planId?.planName || 'Chit Fund'}`,
          quantity: 1,
          rate: invoice.amount || invoice.total || 0,
          amount: invoice.amount || invoice.total || 0
        }],
        subtotal: invoice.subtotal || invoice.amount || invoice.total || 0,
        tax: invoice.tax || 0,
        total: invoice.total || invoice.amount || 0,
        paymentTerms: invoice.paymentTerms || '30 days',
        notes: invoice.notes || 'Thank you for your business!',
        template: invoice.template || 1,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt
      };
    });

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
    const invoiceData = await request.json();
    
    await connectDB();
    
    // Generate invoice number
    const latestInvoice = await Invoice.findOne({}, {}, { sort: { 'invoiceNumber': -1 } });
    let invoiceNumber = 'INV-0001';
    
    if (latestInvoice && latestInvoice.invoiceNumber) {
      const lastNumber = parseInt(latestInvoice.invoiceNumber.split('-')[1]) || 0;
      invoiceNumber = `INV-${String(lastNumber + 1).padStart(4, '0')}`;
    }
    
    // Create new invoice in database
    const newInvoice = new Invoice({
      ...invoiceData,
      invoiceNumber,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newInvoice.save();
    
    // Populate references for response
    const populatedInvoice = await Invoice.findById(newInvoice._id)
      .populate('customerId', 'name email phone')
      .populate('planId', 'planName monthlyAmount');

    return NextResponse.json({
      success: true,
      invoice: populatedInvoice,
      message: 'Invoice created successfully'
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create invoice' 
      },
      { status: 500 }
    );
  }
}