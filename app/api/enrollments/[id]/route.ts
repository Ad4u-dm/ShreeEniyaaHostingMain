import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import Plan from '@/models/Plan';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

  const user = getUserFromRequest(req);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

  const { id } = await params;
    const { planId, startDate, memberNumber } = await req.json();

    console.log('Updating enrollment:', id);
    console.log('New plan ID:', planId);
    console.log('New start date:', startDate);

    // Find the existing enrollment
    const existingEnrollment = await Enrollment.findById(id);
    if (!existingEnrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    console.log('Existing enrollment found:', existingEnrollment);

    // Validate memberNumber if provided
    if (memberNumber !== undefined) {
      if (!memberNumber || memberNumber.trim() === '') {
        return NextResponse.json(
          { error: 'Member number cannot be empty' },
          { status: 400 }
        );
      }

      // Check if memberNumber already exists (excluding current enrollment)
      const existingMemberNumber = await Enrollment.findOne({
        memberNumber: memberNumber.trim(),
        _id: { $ne: id }
      });
      if (existingMemberNumber) {
        return NextResponse.json(
          { error: `Member number '${memberNumber}' is already in use. Please choose a different number.` },
          { status: 400 }
        );
      }
    }

    // Verify new plan exists
    const plan = await Plan.findById(planId);
    if (!plan) {
      return NextResponse.json(
        { error: `Plan not found with ID: ${planId}` },
        { status: 404 }
      );
    }

    console.log('New plan found:', plan.planName);

    // Calculate new end date based on new plan
    const start = new Date(startDate);
    const end = new Date(start);

    if (plan.planType === 'monthly') {
      end.setMonth(end.getMonth() + plan.duration);
    } else if (plan.planType === 'weekly') {
      end.setDate(end.getDate() + (plan.duration * 7));
    } else if (plan.planType === 'daily') {
      end.setDate(end.getDate() + plan.duration);
    }

    // Update enrollment
    existingEnrollment.planId = planId;
    existingEnrollment.startDate = start;
    existingEnrollment.endDate = end;
    existingEnrollment.totalDue = plan.totalAmount;
    if (memberNumber !== undefined) {
      existingEnrollment.memberNumber = memberNumber.trim();
    }
    existingEnrollment.updatedAt = new Date();

    await existingEnrollment.save();

    // Populate the response
    const populatedEnrollment = await Enrollment.findById(existingEnrollment._id)
      .populate('planId', 'planName totalAmount installmentAmount duration monthlyAmount');

    console.log('Enrollment updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Enrollment updated successfully',
      enrollment: populatedEnrollment
    });

  } catch (error) {
    console.error('Update enrollment error:', error);
    return NextResponse.json(
      { error: 'Failed to update enrollment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

  const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    console.log('Deleting enrollment:', id);

    // Find and delete the enrollment
    const deletedEnrollment = await Enrollment.findByIdAndDelete(id);

    if (!deletedEnrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    console.log('Enrollment deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Enrollment deleted successfully'
    });

  } catch (error) {
    console.error('Delete enrollment error:', error);
    return NextResponse.json(
      { error: 'Failed to delete enrollment' },
      { status: 500 }
    );
  }
}
