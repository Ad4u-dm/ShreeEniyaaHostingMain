import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import Invoice from '@/models/Invoice';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

/**
 * Update member number for a user across all their enrollments and invoices
 *
 * This endpoint allows updating a member number for a user, ensuring consistency
 * across all their enrollments and invoices.
 */
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { userId, newMemberNumber } = await request.json();

    // Validate inputs
    if (!userId || !newMemberNumber) {
      return NextResponse.json(
        { error: 'User ID and new member number are required' },
        { status: 400 }
      );
    }

    const trimmedMemberNumber = newMemberNumber.trim();

    if (trimmedMemberNumber === '') {
      return NextResponse.json(
        { error: 'Member number cannot be empty' },
        { status: 400 }
      );
    }

    console.log('Updating member number for userId:', userId, 'to:', trimmedMemberNumber);

    // Check if the new member number is already in use by a DIFFERENT user
    const existingEnrollmentWithNumber = await Enrollment.findOne({
      memberNumber: trimmedMemberNumber
    });

    if (existingEnrollmentWithNumber && existingEnrollmentWithNumber.userId !== userId) {
      return NextResponse.json(
        {
          error: `Member number '${trimmedMemberNumber}' is already in use by another user. Please choose a different number.`
        },
        { status: 400 }
      );
    }

    // Get all enrollments for this user
    const userEnrollments = await Enrollment.find({ userId });

    if (userEnrollments.length === 0) {
      return NextResponse.json(
        { error: 'No enrollments found for this user' },
        { status: 404 }
      );
    }

    console.log(`Found ${userEnrollments.length} enrollments for user ${userId}`);

    // Get the old member number (from first enrollment)
    const oldMemberNumber = userEnrollments[0].memberNumber;

    // If the new number is the same as old, no update needed
    if (oldMemberNumber === trimmedMemberNumber) {
      return NextResponse.json({
        success: true,
        message: 'Member number is already set to this value',
        enrollmentsUpdated: 0,
        invoicesUpdated: 0
      });
    }

    console.log(`Changing member number from '${oldMemberNumber}' to '${trimmedMemberNumber}'`);

    // Update all enrollments for this user
    const enrollmentUpdateResult = await Enrollment.updateMany(
      { userId },
      { $set: { memberNumber: trimmedMemberNumber } }
    );

    console.log(`Updated ${enrollmentUpdateResult.modifiedCount} enrollments`);

    // Get all enrollment IDs for this user
    const enrollmentIds = userEnrollments.map(e => e._id);

    // Update all invoices for these enrollments
    const invoiceUpdateResult = await Invoice.updateMany(
      { enrollmentId: { $in: enrollmentIds } },
      { $set: { memberNumber: trimmedMemberNumber } }
    );

    console.log(`Updated ${invoiceUpdateResult.modifiedCount} invoices`);

    return NextResponse.json({
      success: true,
      message: 'Member number updated successfully across all enrollments and invoices',
      enrollmentsUpdated: enrollmentUpdateResult.modifiedCount,
      invoicesUpdated: invoiceUpdateResult.modifiedCount,
      oldMemberNumber,
      newMemberNumber: trimmedMemberNumber
    });

  } catch (error: any) {
    console.error('Update member number error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update member number'
      },
      { status: 500 }
    );
  }
}
