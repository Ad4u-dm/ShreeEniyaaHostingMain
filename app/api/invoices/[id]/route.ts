import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import ChitPlan from '@/models/ChitPlan';
import Payment from '@/models/Payment';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;    if (!id) {
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

    // Fetch invoice without populating customerId
    const invoice = await Invoice.findById(id)
      .populate('planId', 'planName totalAmount monthlyAmount duration')
      .lean();

    // Manually fetch user details for string customerId
    let customerData = null;
    if (invoice && invoice.customerId) {
      customerData = await User.findOne({ userId: invoice.customerId }).select('userId name email phone address');
    }

    console.log('Invoice after manual customer lookup:', invoice);
    console.log('Customer data:', customerData);

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Process invoice to match expected format
    // Use snapshot data from customerDetails/planDetails if populate didn't work
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
      arrAmount: invoice.arrAmount,
      arrearAmount: invoice.arrearAmount,
      pendingAmount: invoice.pendingAmount,
      receivedAmount: invoice.receivedAmount,
      receivedArrearAmount: invoice.receivedArrearAmount,
      balanceAmount: invoice.balanceAmount,
      totalReceivedAmount: invoice.totalReceivedAmount || ((invoice.receivedAmount || 0) + (invoice.receivedArrearAmount || 0)),
      issuedBy: invoice.issuedBy,
      
      customerId: {
        _id: (customerData as any)?._id || invoice.customerId,
        name: (customerData as any)?.name || invoice.memberName || 'Unknown Customer',
        email: (customerData as any)?.email || 'No email',
        phone: (customerData as any)?.phone || 'No phone',
        address: typeof (customerData as any)?.address === 'object'
          ? `${(customerData as any).address.street || ''}, ${(customerData as any).address.city || ''}, ${(customerData as any).address.state || ''} - ${(customerData as any).address.pincode || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '')
          : (customerData as any)?.address || 'Address not provided'
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
    console.log('  receivedArrearAmount:', processedInvoice.receivedArrearAmount);
    console.log('  totalReceivedAmount:', processedInvoice.totalReceivedAmount);
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin can delete invoices
    if (!hasMinimumRole(user, 'admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only admin can delete invoices.' },
        { status: 403 }
      )
    }

    await connectDB()

    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      )
    }

    // Find the invoice first
    const invoice = await Invoice.findById(id)
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Store invoice details before deletion
    const invoiceDetails = {
      id: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      totalAmount: invoice.totalAmount,
      customerName: invoice.customerName || invoice.customerDetails?.name,
      status: invoice.status,
      paymentId: invoice.paymentId
    }

    // Check if invoice can be deleted (business rule)
    if (invoice.status === 'paid') {
      // Option: You might want to restrict deletion of paid invoices
      // return NextResponse.json(
      //   { error: 'Cannot delete paid invoices. Please contact administrator.' },
      //   { status: 400 }
      // )
    }

    // Get related payment if exists
    let relatedPayment = null
    if (invoice.paymentId) {
      relatedPayment = await Payment.findById(invoice.paymentId)
    }

    // Delete the invoice
    await Invoice.findByIdAndDelete(id)

    // Log the deletion for audit purposes
    console.log(`🗑️ Invoice ${invoice.invoiceNumber} deleted by ${user.email}`)
    console.log(`   - Amount: ₹${invoice.amount}`)
    console.log(`   - Customer: ${invoice.customerName}`)
    console.log(`   - Status: ${invoice.status}`)
    console.log(`   - Had related payment: ${relatedPayment ? 'Yes' : 'No'}`)

    return NextResponse.json({
      success: true,
      message: 'Invoice deleted successfully',
      deletedInvoice: invoiceDetails,
      warning: relatedPayment ? 'Note: Related payment record still exists in system' : null
    })

  } catch (error: any) {
    console.error('❌ Error deleting invoice:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to delete invoice',
        details: error.message 
      },
      { status: 500 }
    )
  }
}