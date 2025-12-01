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

    // Clear the arrear amount
    enrollment.currentArrear = 0;
    await enrollment.save();

    return NextResponse.json({
      success: true,
      message: 'Arrear cleared successfully',
      enrollment: {
        _id: enrollment._id,
        userId: enrollment.userId,
        planId: enrollment.planId,
        currentArrear: enrollment.currentArrear
      }
    });
  } catch (error) {
    console.error('Error clearing arrear:', error);
    return NextResponse.json(
      { error: 'Failed to clear arrear' },
      { status: 500 }
    );
  }
}
