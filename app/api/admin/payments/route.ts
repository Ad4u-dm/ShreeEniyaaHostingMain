import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Generate mock payment data with proper null-safe structure
    const mockPayments = Array.from({ length: 100 }, (_, i) => ({
      _id: `payment-${i + 1}`,
      userId: {
        _id: `user-${i + 1}`,
        name: `Customer ${i + 1}`,
        phone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        email: `customer${i + 1}@example.com`
      },
      planId: {
        _id: `plan-${Math.floor(Math.random() * 4) + 1}`,
        planName: ['₹1L Plan', '₹2L Plan', '₹5L Plan', '₹10L Plan'][Math.floor(Math.random() * 4)],
        monthlyAmount: [5000, 10000, 25000, 50000][Math.floor(Math.random() * 4)]
      },
      enrollmentId: {
        _id: `enrollment-${i + 1}`,
        enrollmentId: `ENR${String(i + 1).padStart(4, '0')}`,
        memberNumber: i + 1
      },
      amount: [5000, 10000, 25000, 50000][Math.floor(Math.random() * 4)],
      dueDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      paidDate: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString() : null,
      receiptNumber: Math.random() > 0.3 ? `RCP${String(i + 1).padStart(6, '0')}` : null,
      status: ['completed', 'pending', 'failed', 'refunded'][Math.floor(Math.random() * 4)],
      paymentMethod: ['Cash', 'Online', 'Bank Transfer', 'Cheque'][Math.floor(Math.random() * 4)],
      createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString()
    }));

    // Calculate statistics
    const totalPayments = mockPayments.length;
    const totalAmount = mockPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const todayPayments = mockPayments.filter(p => {
      if (!p.paidDate) return false;
      const paymentDate = new Date(p.paidDate);
      const today = new Date();
      return paymentDate.toDateString() === today.toDateString();
    }).length;

    const pendingPayments = mockPayments.filter(p => p.status === 'pending').length;
    const completedPayments = mockPayments.filter(p => p.status === 'completed').length;

    return NextResponse.json({
      success: true,
      payments: mockPayments,
      stats: {
        totalPayments,
        totalAmount,
        todayPayments,
        pendingPayments,
        completedPayments
      }
    });

  } catch (error) {
    console.error('Payments API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch payments data' 
      },
      { status: 500 }
    );
  }
}