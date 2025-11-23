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

    // Get all users (removed staff limitation)
    console.log('Looking for all users...');
    const users = await User.find({ 
      role: 'user' // Only get customers, not other staff
    }).sort({ createdAt: -1 });
    
    console.log('Found total users:', users.length);

    // Calculate stats from staff's users
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.status === 'active').length;
    const inactiveUsers = users.filter(user => user.status === 'inactive').length;

    // Get enrollments and invoices for staff's users (only if users exist)
    let invoices: any[] = [];
    let enrollments: any[] = [];
    let payments: any[] = [];
    let totalRevenue = 0;
    let pendingPayments = 0;

    if (users.length > 0) {
      const userCustomIds = users.map(user => user.userId); // Use custom userId strings

      // Import Enrollment model dynamically
      const Enrollment = (await import('@/models/Enrollment')).default;

      // Get all enrollments for these users
      enrollments = await Enrollment.find({
        userId: { $in: userCustomIds }
      }).lean();

      // Get all invoices (enrollment-based)
      invoices = await Invoice.find({
        customerId: { $in: userCustomIds }
      }).lean();

      // Get payments for invoices
      const invoiceIds = invoices.map(invoice => invoice._id);
      payments = await Payment.find({
        invoiceId: { $in: invoiceIds }
      }).lean();

      // Calculate financial stats - sum of receivedAmount from all invoices
      totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.receivedAmount || 0), 0);

      // Calculate pending from invoices with balanceAmount > 0
      pendingPayments = invoices.filter(invoice =>
        (invoice.balanceAmount || 0) > 0
      ).length;
    }

    // Format user data with additional info (enrollment-based)
    const formattedUsers = users.map(user => {
      // Get user's enrollments
      const userEnrollments = enrollments.filter(enrollment =>
        enrollment.userId === user.userId
      );

      // Get invoices for this user across all their enrollments
      const userInvoices = invoices.filter(invoice =>
        invoice.customerId === user.userId
      );

      // Calculate totals from invoices
      const totalPaid = userInvoices.reduce((sum, invoice) => sum + (invoice.receivedAmount || 0), 0);
      const totalDue = userInvoices.reduce((sum, invoice) => sum + (invoice.dueAmount || 0), 0);
      const pendingAmount = userInvoices.reduce((sum, invoice) => sum + (invoice.balanceAmount || 0), 0);

      // Find last payment (most recent invoice with receivedAmount > 0)
      const lastInvoiceWithPayment = userInvoices
        .filter(inv => (inv.receivedAmount || 0) > 0)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address || '',
        planName: user.planName || (userEnrollments.length > 0 ? `${userEnrollments.length} Plan(s)` : 'No Plan'),
        status: user.status,
        totalPaid,
        pendingAmount,
        totalEnrollments: userEnrollments.length,
        lastPayment: lastInvoiceWithPayment ? lastInvoiceWithPayment.createdAt : null,
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