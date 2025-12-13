import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';

export async function GET(req: Request) {
  try {
    await connectDB();

    // Find ALL invoices with receiptNo and extract numbers to find the true max
    const allInvoices = await Invoice.find({ receiptNo: { $exists: true, $ne: null } })
      .select('receiptNo')
      .lean();

    let nextNumber = 1;

    if (allInvoices && allInvoices.length > 0) {
      // Extract all numbers and find the maximum
      const numbers = allInvoices.map((inv: any) => {
        const receiptNo = inv.receiptNo;
        const number = typeof receiptNo === 'string'
          ? parseInt(receiptNo.replace(/\D/g, ''))
          : parseInt(String(receiptNo));
        return isNaN(number) ? 0 : number;
      });

      const maxNumber = Math.max(...numbers);
      nextNumber = maxNumber + 1;
    }

    // Format as 4-digit padded number
    const formattedNumber = nextNumber.toString().padStart(4, '0');

    return NextResponse.json({
      success: true,
      nextReceiptNo: formattedNumber,
      nextNumberValue: nextNumber
    });

  } catch (error) {
    console.error('Error generating next receipt number:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate receipt number',
        nextReceiptNo: '0001',
        nextNumberValue: 1
      },
      { status: 500 }
    );
  }
}