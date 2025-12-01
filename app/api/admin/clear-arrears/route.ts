/**
 * API Route: Clear Arrears
 * 
 * POST /api/admin/clear-arrears
 * 
 * Manually clear arrears for specific enrollments or all enrollments.
 * Sets currentArrear to 0.
 * 
 * Auth: Admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    await connectDB();

    const { enrollmentIds, clearAll } = await request.json();

    console.log(`\n🧹 Clearing arrears...`);
    console.log('='.repeat(60));

    let query: any = {};
    
    if (clearAll) {
      // Clear all active enrollments
      query = { status: 'active' };
    } else if (enrollmentIds && Array.isArray(enrollmentIds) && enrollmentIds.length > 0) {
      // Clear specific enrollments
      query = { _id: { $in: enrollmentIds } };
    } else {
      return NextResponse.json(
        { error: 'Must provide either enrollmentIds array or clearAll: true' },
        { status: 400 }
      );
    }

    // Update arrears to 0
    const result = await Enrollment.updateMany(
      query,
      { 
        $set: { 
          currentArrear: 0,
          arrearLastUpdated: new Date()
        }
      }
    );

    console.log(`✅ Cleared arrears for ${result.modifiedCount} enrollments`);
    console.log('='.repeat(60));

    return NextResponse.json({
      success: true,
      message: `Cleared arrears for ${result.modifiedCount} enrollments`,
      clearedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('❌ Error clearing arrears:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear arrears',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
