import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';

export async function POST(request: NextRequest) {
  try {
    const authToken = request.headers.get('authorization');
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await clientPromise;

    const body = await request.json();
    const { customerId, planId } = body;

    if (!customerId || !planId) {
      return NextResponse.json(
        { error: 'Customer ID and Plan ID are required' },
        { status: 400 }
      );
    }

    // Find the enrollment
    const enrollment = await Enrollment.findOne({
      userId: customerId,
      planId: planId
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found for this customer and plan' },
        { status: 404 }
      );
    }

    console.log('🧹 BEFORE Clear Arrear Timestamp:', {
      enrollmentId: enrollment._id,
      currentArrear: enrollment.currentArrear,
      arrearLastUpdated: enrollment.arrearLastUpdated
    });

    // Clear the arrearLastUpdated timestamp
    // This allows the system to auto-calculate arrear again from previous invoices
    enrollment.arrearLastUpdated = undefined;
    const savedEnrollment = await enrollment.save();

    console.log('✅ AFTER Clear Arrear Timestamp:', {
      enrollmentId: savedEnrollment._id,
      currentArrear: savedEnrollment.currentArrear,
      arrearLastUpdated: savedEnrollment.arrearLastUpdated
    });

    return NextResponse.json({
      success: true,
      message: 'Arrear timestamp cleared successfully',
      enrollment: {
        _id: enrollment._id,
        userId: enrollment.userId,
        planId: enrollment.planId,
        currentArrear: enrollment.currentArrear,
        arrearLastUpdated: enrollment.arrearLastUpdated
      }
    });
  } catch (error) {
    console.error('Error clearing arrear timestamp:', error);
    return NextResponse.json(
      { error: 'Failed to clear arrear timestamp' },
      { status: 500 }
    );
  }
}
