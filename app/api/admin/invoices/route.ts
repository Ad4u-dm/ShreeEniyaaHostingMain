import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Generate mock invoice data
    const mockInvoices = Array.from({ length: 50 }, (_, i) => ({
      _id: `invoice-${i + 1}`,
      invoiceNumber: `INV-${String(i + 1).padStart(4, '0')}`,
      customerId: {
        _id: `customer-${i + 1}`,
        name: `Customer ${i + 1}`,
        email: `customer${i + 1}@example.com`,
        phone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`
      },
      planId: {
        _id: `plan-${Math.floor(Math.random() * 4) + 1}`,
        name: ['₹1L Plan', '₹2L Plan', '₹5L Plan', '₹10L Plan'][Math.floor(Math.random() * 4)],
        monthlyAmount: [5000, 10000, 25000, 50000][Math.floor(Math.random() * 4)]
      },
      amount: [5000, 10000, 25000, 50000][Math.floor(Math.random() * 4)],
      dueDate: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      issueDate: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: ['draft', 'sent', 'paid', 'overdue', 'cancelled'][Math.floor(Math.random() * 5)],
      description: `Monthly payment for ${['₹1L Plan', '₹2L Plan', '₹5L Plan', '₹10L Plan'][Math.floor(Math.random() * 4)]}`,
      items: [{
        description: `Monthly Payment - ${['₹1L Plan', '₹2L Plan', '₹5L Plan', '₹10L Plan'][Math.floor(Math.random() * 4)]}`,
        quantity: 1,
        rate: [5000, 10000, 25000, 50000][Math.floor(Math.random() * 4)],
        amount: [5000, 10000, 25000, 50000][Math.floor(Math.random() * 4)]
      }],
      subtotal: [5000, 10000, 25000, 50000][Math.floor(Math.random() * 4)],
      tax: 0,
      total: [5000, 10000, 25000, 50000][Math.floor(Math.random() * 4)],
      paymentTerms: '30 days',
      notes: 'Thank you for your business!',
      template: Math.floor(Math.random() * 2) + 1,
      createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // Calculate statistics
    const stats = {
      totalInvoices: mockInvoices.length,
      draftInvoices: mockInvoices.filter(inv => inv.status === 'draft').length,
      sentInvoices: mockInvoices.filter(inv => inv.status === 'sent').length,
      paidInvoices: mockInvoices.filter(inv => inv.status === 'paid').length,
      overdueInvoices: mockInvoices.filter(inv => inv.status === 'overdue').length,
      totalAmount: mockInvoices.reduce((sum, inv) => sum + inv.total, 0),
      paidAmount: mockInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
      overdueAmount: mockInvoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0)
    };

    return NextResponse.json({
      success: true,
      invoices: mockInvoices,
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
    
    // In a real implementation, you would save to database
    // For now, return success with mock data
    
    const newInvoice = {
      _id: `invoice-${Date.now()}`,
      invoiceNumber: `INV-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`,
      ...invoiceData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      invoice: newInvoice,
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