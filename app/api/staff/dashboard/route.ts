import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Staff dashboard API called');
    
    // Get JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid auth header');
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('Token extracted, length:', token.length);
    
    // Verify JWT token
    let staffUser: JwtPayload;
    try {
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET environment variable not set');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }
      
      staffUser = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
      console.log('JWT verified, user role:', staffUser.role);
    } catch (error) {
      console.error('JWT verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if user has staff role
    if (staffUser.role !== 'staff') {
      console.log('Access denied - user role:', staffUser.role);
      return NextResponse.json(
        { error: 'Access denied. Staff role required.' },
        { status: 403 }
      );
    }

    // Connect to database
    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected');

    // Get staff user details from database
    console.log('Looking for staff user with email:', staffUser.email);
    const staffUserDoc = await User.findOne({ 
      email: staffUser.email, 
      role: 'staff' 
    });

    if (!staffUserDoc) {
      console.log('Staff user not found in database');
      return NextResponse.json(
        { error: 'Staff user not found' },
        { status: 404 }
      );
    }
    
    console.log('Staff user found:', staffUserDoc.name);

    // Get all users created by this staff member
    console.log('Looking for users created by staff ID:', staffUserDoc._id);
    const users = await User.find({ 
      createdBy: staffUserDoc._id,
      role: 'user' // Only get customers, not other staff
    }).sort({ createdAt: -1 });
    
    console.log('Found users created by staff:', users.length);

    // Calculate stats from staff's users
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.status === 'active').length;
    const inactiveUsers = users.filter(user => user.status === 'inactive').length;

    // Get invoices for staff's users (only if users exist)
    let invoices: any[] = [];
    let payments: any[] = [];
    let totalRevenue = 0;
    let pendingPayments = 0;
    
    if (users.length > 0) {
      const userIds = users.map(user => user._id);
      invoices = await Invoice.find({
        customerId: { $in: userIds }
      });

      // Get payments for staff's invoices
      const invoiceIds = invoices.map(invoice => invoice._id);
      payments = await Payment.find({
        invoiceId: { $in: invoiceIds }
      });

      // Calculate financial stats
      totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
      pendingPayments = invoices.filter(invoice => 
        invoice.status === 'pending' || invoice.status === 'overdue'
      ).length;
    }

    // Format user data with additional info
    const formattedUsers = users.map(user => {
      const userInvoices = invoices.filter(invoice => 
        invoice.customerId.toString() === user._id.toString()
      );
      
      const userPayments = payments.filter(payment => 
        userInvoices.some(invoice => 
          invoice._id.toString() === payment.invoiceId.toString()
        )
      );

      const totalPaid = userPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const totalInvoiced = userInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
      const pendingAmount = Math.max(0, totalInvoiced - totalPaid);
      
      const lastPayment = userPayments.length > 0 ? 
        userPayments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] : null;

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address || '',
        planName: user.planName || 'Standard',
        status: user.status,
        totalPaid,
        pendingAmount,
        lastPayment: lastPayment ? lastPayment.createdAt : null,
        nextDue: user.nextDue || null,
        joinDate: user.createdAt,
        role: user.role
      };
    });

    const stats = {
      totalUsers,
      activeUsers,
      inactiveUsers,
      pendingPayments,
      totalRevenue
    };

    console.log('Returning dashboard data - stats:', stats);
    console.log('Returning dashboard data - users count:', formattedUsers.length);
    
    return NextResponse.json({
      success: true,
      stats,
      users: formattedUsers
    });

  } catch (error) {
    console.error('Staff dashboard error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}