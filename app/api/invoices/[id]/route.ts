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

    console.log('=== INVOICE API DEBUG ===');
    console.log('Looking for invoice ID:', id);

    // First fetch without populate to see raw data
    const rawInvoice = await Invoice.findById(id).lean();
    console.log('Raw invoice from DB:', rawInvoice);

    // Fetch real invoice from database with populated references
    const invoice = await Invoice.findById(id)
      .populate('customerId', 'name email phone address')
      .populate('planId', 'planName totalAmount monthlyAmount duration')
      .lean();

    console.log('Populated invoice:', invoice);
    console.log('Invoice customerId after populate:', invoice?.customerId);
    console.log('Invoice planId after populate:', invoice?.planId);

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Process invoice to match expected format
    // Use snapshot data from customerDetails/planDetails if populate didn't work
    const customerData = invoice.customerId || invoice.customerDetails;
    const planData = invoice.planId || invoice.planDetails;

    console.log('Customer data to use:', customerData);
    console.log('Plan data to use:', planData);
    console.log('Raw invoice receiptData from DB:', invoice.receiptData);
    console.log('Raw invoice memberNumber from DB:', invoice.memberNumber);
    console.log('Raw invoice dueNumber from DB:', invoice.dueNumber);

    const processedInvoice = {
      _id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      receiptNo: invoice.receiptNo,
      invoiceId: invoice.invoiceId,
      receiptData: invoice.receiptData, // Include saved receipt data
      
      // Chit Fund specific fields for thermal receipt
      memberNumber: invoice.memberNumber,
      dueNumber: invoice.dueNumber,
      memberName: invoice.memberName,
      paymentMonth: invoice.paymentMonth,
      dueAmount: invoice.dueAmount,
      arrearAmount: invoice.arrearAmount,
      pendingAmount: invoice.pendingAmount,
      receivedAmount: invoice.receivedAmount,
      balanceAmount: invoice.balanceAmount,
      totalReceivedAmount: invoice.totalReceivedAmount,
      issuedBy: invoice.issuedBy,
      
      customerId: {
        _id: customerData?._id || invoice.customerId,
        name: customerData?.name || invoice.memberName || 'Unknown Customer',
        email: customerData?.email || 'No email',
        phone: customerData?.phone || 'No phone',
        address: typeof customerData?.address === 'object'
          ? `${customerData.address.street || ''}, ${customerData.address.city || ''}, ${customerData.address.state || ''} - ${customerData.address.pincode || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '')
          : customerData?.address || 'Address not provided'
      },
      planId: {
        _id: planData?._id || invoice.planId,
        name: planData?.planName || invoice.planId?.planName || 'No Plan',
        monthlyAmount: planData?.monthlyAmount || invoice.planId?.monthlyAmount || 0
      },
      amount: invoice.amount || invoice.total || invoice.totalAmount || 0,
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
      total: invoice.total || invoice.amount || invoice.totalAmount || 0,
      paymentTerms: invoice.paymentTerms || 'Net 30 days',
      notes: invoice.notes || 'Thank you for investing with Shree Eniyaa Chitfunds',
      template: invoice.template || 1
    };

    console.log('Final processed invoice being returned:', processedInvoice);
    console.log('Customer in response:', processedInvoice.customerId);
    console.log('Plan in response:', processedInvoice.planId);
    console.log('Chit fund fields in response:');
    console.log('  memberNumber:', processedInvoice.memberNumber);
    console.log('  dueAmount:', processedInvoice.dueAmount);
    console.log('  receivedAmount:', processedInvoice.receivedAmount);
    console.log('  balanceAmount:', processedInvoice.balanceAmount);
    console.log('  dueNumber:', processedInvoice.dueNumber);

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