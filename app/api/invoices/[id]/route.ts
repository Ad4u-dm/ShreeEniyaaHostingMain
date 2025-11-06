import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // For now, return mock data since we don't have Invoice models defined
    // In a real implementation, you would fetch from the database
    const mockInvoice = {
      _id: id,
      invoiceNumber: `INV-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      customerId: {
        _id: 'customer-1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+91 9876543210',
        address: '123 Main Street, City, State - 123456'
      },
      planId: {
        _id: 'plan-1',
        name: '₹1L Plan',
        monthlyAmount: 5000
      },
      amount: 5000,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      issueDate: new Date().toISOString(),
      status: 'sent',
      description: 'Monthly ChitFund Payment',
      items: [
        {
          description: 'Monthly ChitFund Contribution',
          quantity: 1,
          rate: 5000,
          amount: 5000
        }
      ],
      subtotal: 5000,
      tax: 0,
      total: 5000,
      paymentTerms: 'Net 30 days',
      notes: 'Thank you for investing with Shri Iniya Chit Funds',
      template: 1
    };

    return NextResponse.json({
      success: true,
      invoice: mockInvoice
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