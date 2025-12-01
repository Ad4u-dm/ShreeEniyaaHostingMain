/**
 * API Route: Set Initial Arrears
 * 
 * POST /api/admin/set-initial-arrears
 * 
 * One-time setup: Sets currentArrear to 1st monthly amount for all enrollments without invoices.
 * 
 * Auth: Admin only
 */

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import Invoice from '@/models/Invoice';
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

    console.log('\n🔄 Setting initial arrears for enrollments without invoices...');
    console.log('='.repeat(70));

    // Find all active enrollments
    const activeEnrollments = await Enrollment.find({ status: 'active' })
      .populate('planId')
      .lean();

    console.log(`📊 Found ${activeEnrollments.length} active enrollments`);

    const results = {
      updated: [] as any[],
      skipped: [] as any[]
    };

    for (const enrollment of activeEnrollments) {
      try {
        // Check if enrollment has any invoices
        const hasInvoice = await Invoice.findOne({
          enrollmentId: enrollment._id
        }).lean();

        if (hasInvoice) {
          results.skipped.push({
            userId: enrollment.userId,
            reason: 'Already has invoice'
          });
          continue;
        }

        // Get the plan
        const plan = enrollment.planId as any;
        
        // Get 1st monthly amount (index 0)
        let firstMonthAmount = 0;
        
        if (plan.monthlyData?.[0]) {
          firstMonthAmount = plan.monthlyData[0].installmentAmount || 0;
        } else if (plan.monthlyAmount) {
          if (Array.isArray(plan.monthlyAmount) && plan.monthlyAmount.length > 0) {
            firstMonthAmount = plan.monthlyAmount[0];
          } else if (typeof plan.monthlyAmount === 'number') {
            firstMonthAmount = plan.monthlyAmount;
          }
        }

        if (firstMonthAmount === 0) {
          results.skipped.push({
            userId: enrollment.userId,
            reason: 'No monthly amount found'
          });
          continue;
        }

        // Update currentArrear to 1st monthly amount
        await Enrollment.updateOne(
          { _id: enrollment._id },
          {
            $set: {
              currentArrear: firstMonthAmount,
              arrearLastUpdated: new Date()
            }
          }
        );

        results.updated.push({
          userId: enrollment.userId,
          dueNumber: '1',
          updateReason: 'Initial setup',
          source: 'First monthly amount from plan',
          previousBalance: 0,
          newArrear: firstMonthAmount,
          planName: plan.planName
        });

        console.log(`  ✅ ${enrollment.userId} - Set arrear to ₹${firstMonthAmount.toLocaleString('en-IN')}`);

      } catch (error) {
        console.error(`  ❌ Error processing ${enrollment.userId}:`, error);
        results.skipped.push({
          userId: enrollment.userId,
          reason: 'Error: ' + (error instanceof Error ? error.message : 'Unknown')
        });
      }
    }

    console.log('='.repeat(70));
    console.log('📈 Summary:');
    console.log(`  ✅ Updated: ${results.updated.length}`);
    console.log(`  ⏭️  Skipped: ${results.skipped.length}`);
    console.log('='.repeat(70));

    return NextResponse.json({
      success: true,
      message: `Set initial arrears for ${results.updated.length} enrollments`,
      summary: {
        total: activeEnrollments.length,
        updated: results.updated.length,
        skipped: results.skipped.length
      },
      details: results
    });

  } catch (error) {
    console.error('❌ Error setting initial arrears:', error);
    return NextResponse.json(
      {
        error: 'Failed to set initial arrears',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
