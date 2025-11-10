import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    await connectDB();
    
    // Await params to comply with Next.js 15
    const { customerId } = await params;
    
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');
    
    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // Get all invoices for this customer and plan
    const invoices = await Invoice.find({
      customerId: customerId,
      planId: planId,
      status: { $in: ['paid', 'sent'] } // Only consider paid or sent invoices
    })
    .select('paymentMonth receivedAmount totalAmount dueAmount createdAt')
    .sort({ createdAt: -1 })
    .lean();

    // Format payment history
    const payments = invoices.map(invoice => ({
      paymentMonth: invoice.paymentMonth || invoice.createdAt?.toISOString().slice(0, 7),
      amount: invoice.receivedAmount || invoice.totalAmount || 0,
      dueAmount: invoice.dueAmount || 0,
      date: invoice.createdAt
    }));

    return NextResponse.json({
      success: true,
      payments
    });

  } catch (error) {
    console.error('Payment history API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment history' },
      { status: 500 }
    );
  }
}