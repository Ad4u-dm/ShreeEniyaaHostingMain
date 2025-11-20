import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';

export async function GET(req: Request) {
  try {
    await connectDB();
    
    // Find the latest invoice with the highest receipt number
    const latestInvoice = await Invoice.findOne()
      .sort({ receiptNo: -1, createdAt: -1 })
      .select('receiptNo');
    
    let nextNumber = 1;
    
    if (latestInvoice && latestInvoice.receiptNo) {
      // Extract number from receipt number (handle both string and number formats)
      const currentNumber = typeof latestInvoice.receiptNo === 'string' 
        ? parseInt(latestInvoice.receiptNo.replace(/\D/g, '')) 
        : parseInt(latestInvoice.receiptNo.toString());
      
      if (!isNaN(currentNumber)) {
        nextNumber = currentNumber + 1;
      }
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