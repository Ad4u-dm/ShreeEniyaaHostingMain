import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';
import Payment from '@/models/Payment';
import ChitPlan from '@/models/ChitPlan';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role');
    const searchTerm = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build query
    const query: any = {};
    if (roleFilter) {
      query.role = roleFilter;
    } else {
      // Default to filtering by 'user' role to match dashboard count
      query.role = 'user';
    }
    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { phone: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Fetch users with filtering and pagination
    const [users, total] = await Promise.all([
      User.find(query)
        .select('name email phone address role createdAt updatedAt createdBy userId dateOfBirth weddingDate')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(),
      User.countDocuments(query)
    ]);

    // Manually populate createdBy to handle mixed data types (ObjectId vs string)
    const populatedUsers = await Promise.all(users.map(async (user) => {
      if (user.createdBy) {
        try {
          let creator = null;
          
          // Check if createdBy is a valid ObjectId
          if (mongoose.Types.ObjectId.isValid(user.createdBy)) {
            creator = await User.findById(user.createdBy).select('name role').lean();
          } else {
            // If not ObjectId, try to find by userId
            creator = await User.findOne({ userId: user.createdBy }).select('name role').lean();
          }
          
          user.createdBy = creator;
        } catch (error) {
          // If population fails, set to null
          user.createdBy = null;
        }
      }
      return user;
    }));

    // Get enrollments for all users
    const enrollments = await Enrollment.find({})
      .populate('planId', 'planName totalAmount monthlyAmount duration')
      .lean();

    // Get payment data for statistics
    const payments = await Payment.find({})
      .select('userId amount paymentDate')
      .lean();

    // Process data to create customer objects with statistics
    const customers = await Promise.all(populatedUsers.map(async (userData) => {
      const userEnrollments = enrollments.filter(e => 
        e.userId === userData.userId
      );
      
      const userPayments = payments.filter(p => 
        p.userId === userData.userId
      );

      const totalPaid = userPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const lastPayment = userPayments.length > 0 
        ? userPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0]
        : null;

      console.log('Processing user:', userData.userId, userData.name);
      const activeEnrollment = userEnrollments.find(e => e.status === 'active');
      console.log('Active enrollment:', activeEnrollment);
      const planName = activeEnrollment?.planId?.planName || 'No Plan';
      const monthlyAmount = activeEnrollment?.planId?.monthlyAmount || 0;

      // Find latest invoice for this user and plan
      let pendingAmount = 0;
      let totalPaidFromInvoices = 0;
      let lastInvoiceDate = null;
      
      if (activeEnrollment && activeEnrollment.planId) {
        // Get all invoices for this user (temporarily without plan filter)
        const allUserInvoices = await Invoice.find({ 
          customerId: userData._id
        }).lean();
        console.log('All invoices for user (any plan):', allUserInvoices.length);
        
        // Then filter by plan
        const userInvoices = allUserInvoices.filter(inv => 
          inv.planId && (
            inv.planId.toString() === activeEnrollment.planId._id.toString() ||
            inv.planId === activeEnrollment.planId._id
          )
        );
        console.log('Filtered invoices for user and plan:', userInvoices.length);
        
        // Also try direct query for comparison
        const directQueryInvoices = await Invoice.find({ 
          customerId: userData._id, 
          planId: activeEnrollment.planId._id 
        }).lean();
        console.log('Direct query invoices:', directQueryInvoices.length);
        
        console.log('User data:', {
          userId: userData._id,
          userUserId: userData.userId,
          name: userData.name
        });
        console.log('Active enrollment:', {
          planId: activeEnrollment.planId._id,
          planName: activeEnrollment.planId.planName
        });
        console.log('Invoice query result:', userInvoices.length, 'invoices found');
        userInvoices.forEach(inv => {
          console.log('Invoice:', {
            id: inv._id,
            customerId: inv.customerId,
            planId: inv.planId,
            balanceAmount: inv.balanceAmount,
            receivedAmount: inv.receivedAmount,
            createdAt: inv.createdAt
          });
        });
        
        if (userInvoices.length > 0) {
          // Sort invoices by creation date (newest first)
          const sortedInvoices = userInvoices.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          
          const latestInvoice = sortedInvoices[0];
          
          // Use the latest invoice's balance amount as pending amount
          pendingAmount = typeof latestInvoice.balanceAmount === 'number' ? latestInvoice.balanceAmount : 0;
          
          // Calculate total paid from all invoices' received amounts
          totalPaidFromInvoices = sortedInvoices.reduce((sum, inv) => 
            sum + (typeof inv.receivedAmount === 'number' ? inv.receivedAmount : 0), 0
          );
          
          // Use the latest invoice's creation date as last payment date
          lastInvoiceDate = latestInvoice.createdAt;
          
          console.log('Using invoice data:', {
            pendingAmount,
            totalPaidFromInvoices,
            lastInvoiceDate,
            latestInvoiceId: latestInvoice.invoiceId
          });
        } else {
          // Fallback if no invoices found
          const totalPlanAmount = activeEnrollment.planId.totalAmount || 0;
          pendingAmount = Math.max(0, totalPlanAmount - totalPaid);
          totalPaidFromInvoices = totalPaid;
          console.log('Using fallback data:', { pendingAmount, totalPaidFromInvoices });
        }
      }

      // Calculate next due date (30 days from last payment or enrollment date)
      const referenceDate = lastInvoiceDate || lastPayment?.paymentDate || activeEnrollment?.enrollmentDate || userData.createdAt;
      const nextDue = new Date(new Date(referenceDate).getTime() + 30 * 24 * 60 * 60 * 1000);

      console.log('Customer object:', {
        _id: userData._id,
        name: userData.name,
        pendingAmount,
        totalPaidFromInvoices,
        planName,
        lastInvoiceDate
      });
      
      return {
        _id: userData._id,
        userId: userData.userId, // Include custom userId for enrollment lookup
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        address: typeof userData.address === 'object'
          ? `${userData.address.street || ''}, ${userData.address.city || ''}, ${userData.address.state || ''} - ${userData.address.pincode || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '')
          : userData.address || 'Address not provided',
        dob: userData.dateOfBirth || null, // Map dateOfBirth to dob
        weddingDate: userData.weddingDate || null, // Include wedding date
        planId: activeEnrollment?.planId?._id || null,
        planName,
        joinDate: userData.createdAt,
        status: activeEnrollment?.status || 'inactive',
        totalPaid: totalPaidFromInvoices,
        pendingAmount,
        lastPayment: lastInvoiceDate || lastPayment?.paymentDate || null,
        nextDue: nextDue.toISOString(),
        paymentHistory: userPayments.length,
        role: userData.role,
        createdBy: userData.createdBy ? {
          _id: userData.createdBy._id,
          name: userData.createdBy.name,
          role: userData.createdBy.role
        } : { name: 'Admin', role: 'admin' } // Default for users without createdBy
      };
    }));

    // Calculate statistics
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    const stats = {
      totalUsers: customers.length,
      activeUsers: customers.filter(c => c.status === 'active').length,
      inactiveUsers: customers.filter(c => c.status === 'inactive').length,
      suspendedUsers: customers.filter(c => c.status === 'suspended').length,
      newUsersThisMonth: customers.filter(c => new Date(c.joinDate) >= firstDayOfMonth).length,
      totalRevenue: customers.reduce((sum, c) => sum + c.totalPaid, 0)
    };

    return NextResponse.json({
      success: true,
      customers,
      stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
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

// Update user information
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, userData } = await request.json();
    
    console.log('📝 PUT /api/admin/users - Received data:', {
      userId,
      userData,
      hasDob: !!userData.dob,
      hasWeddingDate: !!userData.weddingDate
    });
    
    if (!userId || !userData) {
      return NextResponse.json(
        { success: false, error: 'User ID and user data are required' },
        { status: 400 }
      );
    }

    // Update user in database
    // Map dob to dateOfBirth for database storage
    const updateData: any = {
      ...userData,
      updatedAt: new Date()
    };
    
    // Convert dob to dateOfBirth if present
    if (userData.dob) {
      updateData.dateOfBirth = new Date(userData.dob);
      delete updateData.dob; // Remove dob as it's not a DB field
      console.log('✅ Converted dob to dateOfBirth:', updateData.dateOfBirth);
    }
    
    // Convert weddingDate to Date object if present
    if (userData.weddingDate) {
      updateData.weddingDate = new Date(userData.weddingDate);
      console.log('✅ Converted weddingDate:', updateData.weddingDate);
    }
    
    console.log('💾 Updating user with data:', updateData);
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).populate('createdBy', 'name role');

    console.log('✅ User updated successfully:', {
      userId: updatedUser._id,
      dateOfBirth: updatedUser.dateOfBirth,
      weddingDate: updatedUser.weddingDate
    });

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        role: updatedUser.role,
        createdBy: updatedUser.createdBy ? {
          _id: updatedUser.createdBy._id,
          name: updatedUser.createdBy.name,
          role: updatedUser.createdBy.role
        } : { name: 'Admin', role: 'admin' }
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update user' 
      },
      { status: 500 }
    );
  }
}