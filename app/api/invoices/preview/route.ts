import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import ChitPlan from '@/models/ChitPlan';

export async function POST(request: NextRequest) {
  try {
    console.log('Preview endpoint called');
    await connectDB();
    const { customerId, planId, receivedAmount } = await request.json();
    console.log('Preview request body:', { customerId, planId, receivedAmount });
    if (!customerId || !planId) {
      return NextResponse.json({ success: false, error: 'customerId and planId required' }, { status: 400 });
    }

    // Fetch plan details
    const plan = await ChitPlan.findById(planId);
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
    }

    // Fetch previous invoice for this customer/plan
    const previousInvoice = await Invoice.findOne({ customerId, planId }).sort({ createdAt: -1 });
    const today = new Date();
    const is21st = today.getDate() === 21;
    let arrearAmount = 0;
    let balanceAmount = 0;
    let dueAmount = plan.monthlyAmount;
    // Use provided receivedAmount or default to 0
    const received = typeof receivedAmount === 'number' ? receivedAmount : 0;

    if (!previousInvoice) {
      // First invoice logic
      arrearAmount = 0;
      balanceAmount = Math.max(0, dueAmount - received);
    } else {
      if (is21st) {
        arrearAmount = previousInvoice.balanceAmount ?? 0;
        balanceAmount = Math.max(0, (dueAmount + arrearAmount) - received);
      } else {
        arrearAmount = previousInvoice.arrearAmount ?? 0;
        if ((previousInvoice.balanceAmount ?? 0) === 0) {
          balanceAmount = Math.max(0, dueAmount - received);
        } else {
          balanceAmount = Math.max(0, previousInvoice.balanceAmount - received);
        }
      }
    }

    // Simulate other fields for preview
    const previewInvoice = {
      dueAmount,
      arrearAmount,
      balanceAmount,
      receivedAmount: received,
      pendingAmount: 0,
      dueNumber: previousInvoice ? (parseInt(previousInvoice.dueNumber || '1') + 1) : 1,
      paymentMonth: `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`
    };

    console.log('Preview response:', previewInvoice);
    return NextResponse.json({ success: true, invoice: previewInvoice });
  } catch (error: any) {
    console.error('Preview invoice error:', error);
    return NextResponse.json({ success: false, error: 'Failed to preview invoice', details: error?.message }, { status: 500 });
  }
}
