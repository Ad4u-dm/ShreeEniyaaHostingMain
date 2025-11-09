import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import ChitPlan from '@/models/ChitPlan';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Fetch real invoice from database with populated references
    const invoice = await Invoice.findById(id)
      .populate('customerId', 'name email phone address')
      .populate('planId', 'planName totalAmount monthlyAmount duration')
      .lean();

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Process invoice to match expected format
    const processedInvoice = {
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: {
        _id: invoice.customerId?._id,
        name: invoice.customerId?.name || 'Unknown Customer',
        email: invoice.customerId?.email || 'No email',
        phone: invoice.customerId?.phone || 'No phone',
        address: typeof invoice.customerId?.address === 'object'
          ? `${invoice.customerId.address.street || ''}, ${invoice.customerId.address.city || ''}, ${invoice.customerId.address.state || ''} - ${invoice.customerId.address.pincode || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '')
          : invoice.customerId?.address || 'Address not provided'
      },
      planId: {
        _id: invoice.planId?._id,
        name: invoice.planId?.planName || 'No Plan',
        monthlyAmount: invoice.planId?.monthlyAmount || 0
      },
      amount: invoice.amount || invoice.total || 0,
      dueDate: invoice.dueDate,
      issueDate: invoice.issueDate || invoice.createdAt,
      status: invoice.status || 'draft',
      description: invoice.description || `Payment for ${invoice.planId?.planName || 'Chit Fund'}`,
      items: invoice.items || [
        {
          description: `Payment - ${invoice.planId?.planName || 'Chit Fund'}`,
          quantity: 1,
          rate: invoice.amount || invoice.total || 0,
          amount: invoice.amount || invoice.total || 0
        }
      ],
      subtotal: invoice.subtotal || invoice.amount || invoice.total || 0,
      tax: invoice.tax || 0,
      total: invoice.total || invoice.amount || 0,
      paymentTerms: invoice.paymentTerms || 'Net 30 days',
      notes: invoice.notes || 'Thank you for investing with Shree Eniyaa Chitfunds',
      template: invoice.template || 1
    };

    return NextResponse.json({
      success: true,
      invoice: processedInvoice
    });

  } catch (error) {
    console.error('Get invoice error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch invoice' 
      },
      { status: 500 }
    );
  }
}