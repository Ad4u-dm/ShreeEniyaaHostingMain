import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import Plan from '@/models/Plan';
import ChitPlan from '@/models/ChitPlan';
import Payment from '@/models/Payment';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build query for staff's assigned customers
    let query: any = { assignedStaff: user.userId };

    // Add status filter
    if (status !== 'all') {
      query.status = status;
    }

    // Get enrollments with populated user and plan data
    let enrollments = await Enrollment.find(query)
      .populate('userId', 'name email phone address')
      .populate('planId', 'planName monthlyAmount totalAmount duration')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Filter by search term if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      enrollments = enrollments.filter(enrollment => 
        enrollment.enrollmentId?.match(searchRegex) ||
        enrollment.userId?.name?.match(searchRegex) ||
        enrollment.userId?.phone?.match(searchRegex) ||
        enrollment.userId?.email?.match(searchRegex)
      );
    }

    // Get payment summary for each customer
    const enrollmentsWithPayments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const payments = await Payment.find({ 
          enrollmentId: enrollment._id 
        }).sort({ createdAt: -1 });

        const totalPaid = payments
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + p.amount, 0);

        const lastPayment = payments[0];
        const overduePayments = payments.filter(p => 
          p.status === 'pending' && new Date(p.dueDate) < new Date()
        );

        return {
          ...enrollment.toObject(),
          totalPaid,
          lastPayment: lastPayment ? {
            amount: lastPayment.amount,
            date: lastPayment.createdAt,
            method: lastPayment.paymentMethod
          } : null,
          overdueCount: overduePayments.length,
          overdueAmount: overduePayments.reduce((sum, p) => sum + p.amount, 0),
          nextDueDate: enrollment.nextDueDate,
          paymentHistory: payments.slice(0, 5) // Last 5 payments
        };
      })
    );

    // Get total count for pagination
    const totalCount = await Enrollment.countDocuments(query);

    return NextResponse.json({
      customers: enrollmentsWithPayments,
      totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: skip + enrollments.length < totalCount
    });

  } catch (error) {
    console.error('Staff customers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

// POST endpoint for adding customer notes or updating status
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { enrollmentId, action, data } = await request.json();

    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      assignedStaff: user.userId
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Customer not found or not assigned to you' }, { status: 404 });
    }

    switch (action) {
      case 'add_note':
        enrollment.notes.push({
          text: data.note,
          addedBy: user.userId,
          addedAt: new Date()
        });
        break;

      case 'update_status':
        enrollment.status = data.status;
        break;

      case 'update_contact':
        // Update customer contact information
        const customer = await User.findOne({ userId: enrollment.userId });
        if (customer) {
          if (data.phone) customer.phone = data.phone;
          if (data.email) customer.email = data.email;
          if (data.address) customer.address = { ...customer.address, ...data.address };
          await customer.save();
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await enrollment.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Customer updated successfully' 
    });

  } catch (error) {
    console.error('Staff customer update error:', error);
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    );
  }
}