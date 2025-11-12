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
    // Get JWT token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token
    let staffUser: JwtPayload;
    try {
      staffUser = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if user has staff role
    if (staffUser.role !== 'staff') {
      return NextResponse.json(
        { error: 'Access denied. Staff role required.' },
        { status: 403 }
      );
    }

    // Connect to database
    await connectDB();

    // Get staff user details from database
    const staffUserDoc = await User.findOne({ 
      email: staffUser.email, 
      role: 'staff' 
    });

    if (!staffUserDoc) {
      return NextResponse.json(
        { error: 'Staff user not found' },
        { status: 404 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build user query - only users created by this staff member
    const userQuery: any = {
      createdBy: staffUserDoc._id,
      role: 'user' // Only get customers, not other staff
    };

    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (status && status !== 'all') {
      userQuery.status = status;
    }

    // Get users with pagination
    const [users, totalUsers] = await Promise.all([
      User.find(userQuery)
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit),
      User.countDocuments(userQuery)
    ]);

    // Calculate stats for all staff's users
    const allStaffUsers = await User.find({
      createdBy: staffUserDoc._id,
      role: 'user'
    });

    const stats = {
      totalUsers: allStaffUsers.length,
      activeUsers: allStaffUsers.filter(user => user.status === 'active').length,
      inactiveUsers: allStaffUsers.filter(user => user.status === 'inactive').length,
      suspendedUsers: allStaffUsers.filter(user => user.status === 'suspended').length
    };

    // Get financial data for each user
    const userIds = users.map(user => user._id);
    const invoices = await Invoice.find({
      customerId: { $in: userIds }
    });
    
    const invoiceIds = invoices.map(invoice => invoice._id);
    const payments = await Payment.find({
      invoiceId: { $in: invoiceIds }
    });

    // Add financial info to each user
    const usersWithFinancialData = users.map(user => {
      const userInvoices = invoices.filter(invoice => 
        invoice.customerId.toString() === user._id.toString()
      );
      
      const userPayments = payments.filter(payment => 
        userInvoices.some(invoice => 
          invoice._id.toString() === payment.invoiceId.toString()
        )
      );

      const totalPaid = userPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const totalInvoiced = userInvoices.reduce((sum, invoice) => sum + invoice.totalAmount || invoice.amount, 0);
      const pendingAmount = Math.max(0, totalInvoiced - totalPaid);

      return {
        ...user.toObject(),
        totalPaid,
        pendingAmount,
        planName: 'Standard' // Default plan name
      };
    });

    return NextResponse.json({
      success: true,
      users: usersWithFinancialData,
      stats,
      pagination: {
        page,
        limit,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit)
      }
    });

  } catch (error) {
    console.error('Staff users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}