import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import ChitPlan from '@/models/ChitPlan';
import Payment from '@/models/Payment';
import User from '@/models/User';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'route'; // 'route', 'visits', 'locations'
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    switch (type) {
      case 'route':
        // Get today's collection route
        const todayStart = new Date(date);
        const todayEnd = new Date(date);
        todayEnd.setDate(todayEnd.getDate() + 1);

        const duePayments = await Payment.find({
          dueDate: {
            $gte: todayStart,
            $lt: todayEnd
          },
          status: 'pending'
        })
        .populate({
          path: 'enrollmentId',
          match: { assignedStaff: user.userId },
          populate: {
            path: 'userId',
            select: 'name phone address'
          }
        })
        .populate('planId', 'planName monthlyAmount')
        .sort({ 'enrollmentId.userId.address.pincode': 1 }); // Sort by area

        // Filter out payments where enrollment is not assigned to this staff
        const routePayments = duePayments.filter(payment => payment.enrollmentId);

        // Group by area/pincode for efficient routing
        const routeByArea = routePayments.reduce((acc, payment) => {
          const pincode = payment.enrollmentId.userId.address?.pincode || 'Unknown';
          if (!acc[pincode]) {
            acc[pincode] = [];
          }
          acc[pincode].push({
            paymentId: payment._id,
            customer: {
              name: payment.enrollmentId.userId.name,
              phone: payment.enrollmentId.userId.phone,
              address: payment.enrollmentId.userId.address
            },
            amount: payment.amount,
            planName: payment.planId.planName,
            enrollmentId: payment.enrollmentId.enrollmentId,
            priority: payment.daysPastDue > 0 ? 'high' : 'normal'
          });
          return acc;
        }, {});

        return NextResponse.json({
          route: routeByArea,
          totalCustomers: routePayments.length,
          totalAmount: routePayments.reduce((sum, p) => sum + p.amount, 0),
          areas: Object.keys(routeByArea).length
        });

      case 'visits':
        // Get staff's visit history
        const visits = await Payment.find({
          collectedBy: user.userId,
          collectionMethod: 'field',
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        })
        .populate('enrollmentId', 'enrollmentId')
        .populate('userId', 'name phone address')
        .sort({ createdAt: -1 });

        return NextResponse.json({
          visits: visits.map(visit => ({
            date: visit.createdAt,
            customer: visit.userId.name,
            amount: visit.amount,
            location: visit.userId.address,
            receiptNumber: visit.receiptNumber
          }))
        });

      case 'locations':
        // Get customer locations for mapping
        const enrollments = await Enrollment.find({
          assignedStaff: user.userId,
          status: 'active'
        })
        .populate('userId', 'name phone address')
        .populate('planId', 'planName');

        const locations = enrollments
          .filter(e => e.userId.address?.street)
          .map(enrollment => ({
            customerId: enrollment.userId._id,
            name: enrollment.userId.name,
            phone: enrollment.userId.phone,
            address: {
              street: enrollment.userId.address.street,
              city: enrollment.userId.address.city,
              state: enrollment.userId.address.state,
              pincode: enrollment.userId.address.pincode
            },
            planName: enrollment.planId.planName,
            enrollmentId: enrollment.enrollmentId,
            status: enrollment.status
          }));

        return NextResponse.json({ locations });

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

  } catch (error) {
    console.error('Field work error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch field work data' },
      { status: 500 }
    );
  }
}

// POST endpoint for recording field visits and activities
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data } = await request.json();

    switch (action) {
      case 'record_visit':
        // Record a customer visit
        const { customerId, visitType, notes, location } = data;
        
        const enrollment = await Enrollment.findOne({
          userId: customerId,
          assignedStaff: user.userId
        });

        if (!enrollment) {
          return NextResponse.json(
            { error: 'Customer not found or not assigned to you' },
            { status: 404 }
          );
        }

        // Add visit note to enrollment
        enrollment.notes.push({
          text: `Field visit - ${visitType}: ${notes}`,
          addedBy: user.userId,
          addedAt: new Date()
        });

        await enrollment.save();

        return NextResponse.json({
          success: true,
          message: 'Visit recorded successfully'
        });

      case 'update_location':
        // Update staff's current location
        const { latitude, longitude, address } = data;
        
        // In a real app, you might store this in a separate tracking table
        // For now, we'll just return success
        return NextResponse.json({
          success: true,
          message: 'Location updated successfully'
        });

      case 'field_payment':
        // Record a payment collected in the field  
        const {
          paymentId,
          amount,
          paymentMethod,
          transactionId,
          collectionNotes
        } = data;

        const payment = await Payment.findOne({ _id: paymentId })
          .populate({
            path: 'enrollmentId',
            match: { assignedStaff: user.userId }
          });

        if (!payment || !payment.enrollmentId) {
          return NextResponse.json(
            { error: 'Payment not found or not authorized' },
            { status: 404 }
          );
        }

        // Update payment with collection details
        payment.status = 'completed';
        payment.collectedBy = user.userId;
        payment.collectionMethod = 'field';
        payment.paymentMethod = paymentMethod;
        payment.transactionId = transactionId;
        payment.paidDate = new Date();
        
        if (collectionNotes) {
          payment.notes.push({
            text: `Field collection: ${collectionNotes}`,
            addedBy: user.userId,
            addedAt: new Date()
          });
        }

        await payment.save();

        // Update enrollment
        const enrollment2 = await Enrollment.findById(payment.enrollmentId);
        enrollment2.totalPaid += amount;
        enrollment2.totalDue = Math.max(0, enrollment2.totalDue - amount);
        await enrollment2.save();

        return NextResponse.json({
          success: true,
          payment: {
            receiptNumber: payment.receiptNumber,
            amount: payment.amount,
            collectedAt: payment.paidDate
          },
          message: 'Field payment recorded successfully'
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Field work action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform field work action' },
      { status: 500 }
    );
  }
}