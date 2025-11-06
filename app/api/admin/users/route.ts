import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // For now, return mock data since we don't have Customer/Payment models defined yet
    // In a real implementation, you would use Mongoose models here
    
    const mockCustomers = Array.from({ length: 50 }, (_, i) => ({
      _id: `customer-${i + 1}`,
      name: `Customer ${i + 1}`,
      email: `customer${i + 1}@example.com`,
      phone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      address: `Address ${i + 1}, City, State - ${Math.floor(Math.random() * 900000) + 100000}`,
      planId: `plan-${Math.floor(Math.random() * 4) + 1}`,
      planName: ['₹1L Plan', '₹2L Plan', '₹5L Plan', '₹10L Plan'][Math.floor(Math.random() * 4)],
      joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: ['active', 'inactive', 'suspended'][Math.floor(Math.random() * 3)],
      totalPaid: Math.floor(Math.random() * 500000) + 50000,
      pendingAmount: Math.floor(Math.random() * 50000),
      lastPayment: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      nextDue: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      paymentHistory: Math.floor(Math.random() * 24) + 1
    }));

    const stats = {
      totalUsers: mockCustomers.length,
      activeUsers: mockCustomers.filter(c => c.status === 'active').length,
      inactiveUsers: mockCustomers.filter(c => c.status === 'inactive').length,
      suspendedUsers: mockCustomers.filter(c => c.status === 'suspended').length,
      newUsersThisMonth: Math.floor(mockCustomers.length * 0.2),
      totalRevenue: mockCustomers.reduce((sum, c) => sum + c.totalPaid, 0)
    };

    return NextResponse.json({
      success: true,
      customers: mockCustomers,
      stats
    });

  } catch (error) {
    console.error('Users API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch users data' 
      },
      { status: 500 }
    );
  }
}