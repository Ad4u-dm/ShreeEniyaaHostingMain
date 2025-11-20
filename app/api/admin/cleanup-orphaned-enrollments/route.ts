import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    // Get all enrollments
    const allEnrollments = await Enrollment.find({}).lean();
    console.log(`Found ${allEnrollments.length} total enrollments`);

    // Get all existing userIds
    const allUsers = await User.find({}).select('userId').lean();
    const existingUserIds = new Set(allUsers.map(u => u.userId));
    console.log(`Found ${existingUserIds.size} existing users`);

    // Find orphaned enrollments (enrollments where userId doesn't exist in users)
    const orphanedEnrollments = allEnrollments.filter(
      enrollment => !existingUserIds.has(enrollment.userId)
    );

    console.log(`Found ${orphanedEnrollments.length} orphaned enrollments`);

    if (orphanedEnrollments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orphaned enrollments found',
        orphanedCount: 0
      });
    }

    // Delete orphaned enrollments
    const orphanedIds = orphanedEnrollments.map(e => e._id);
    const deleteResult = await Enrollment.deleteMany({
      _id: { $in: orphanedIds }
    });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deleteResult.deletedCount} orphaned enrollments`,
      orphanedEnrollments: orphanedEnrollments.map(e => ({
        enrollmentId: e.enrollmentId,
        userId: e.userId,
        planId: e.planId,
        createdAt: e.createdAt
      })),
      deletedCount: deleteResult.deletedCount
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup orphaned enrollments' },
      { status: 500 }
    );
  }
}
