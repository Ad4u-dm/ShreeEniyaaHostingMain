/**
 * API Route: Update Arrears on 21st
 * 
 * POST /api/admin/update-arrears
 * 
 * This endpoint updates arrears for all active enrollments based on their previous invoice balance.
 * Should be called on the 21st of every month (can be automated with a cron job).
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

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    console.log(`\n🔄 Running arrear update for ${today.toISOString().split('T')[0]}`);
    console.log('='.repeat(60));

    // Optional: Allow override for testing, but warn if not appropriate day
    const { force } = await request.json().catch(() => ({}));
    
    // Check if today is valid for arrear update:
    // 1. 21st of any month (for Due 2+)
    // 2. Last day of any month (for Due 1)
    const isLastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate() === currentDay;
    const is21st = currentDay === 21;
    const isValidDay = is21st || isLastDayOfMonth;

    if (!isValidDay && !force) {
      return NextResponse.json(
        {
          error: `This should run on the 21st (for Due 2+) or last day of month (for Due 1). Today is ${currentDay}th.`,
          hint: 'Add { "force": true } to run anyway for testing.',
          validDays: ['21st of any month', 'Last day of any month']
        },
        { status: 400 }
      );
    }

    // Find all active enrollments
    const activeEnrollments = await Enrollment.find({ status: 'active' })
      .populate('userId')
      .populate('planId')
      .lean();

    console.log(`📊 Found ${activeEnrollments.length} active enrollments`);

    const results = {
      updated: [] as any[],
      skipped: [] as any[],
      errors: [] as any[]
    };

    for (const enrollment of activeEnrollments) {
      try {
        // Find the most recent invoice for this enrollment
        const lastInvoice = await Invoice.findOne({
          enrollmentId: enrollment._id
        })
          .sort({ invoiceDate: -1 })
          .limit(1)
          .lean();

        let newArrear = 0;
        let dueNumber = '1';
        let isDue1 = true;
        let previousBalance = 0;
        let updateSource = '';

        if (!lastInvoice) {
          // No invoice found - First invoice has NO arrear
          // Arrear only comes from PREVIOUS invoices, not plan amounts
          newArrear = 0;
          dueNumber = '1';
          isDue1 = true;
          previousBalance = 0;
          updateSource = 'First invoice (no arrear)';
        } else {
          // Invoice found - Use previous invoice's balance
          dueNumber = String(lastInvoice.receiptDetails?.dueNo || '1');
          isDue1 = dueNumber === '1';
          newArrear = lastInvoice.balanceAmount || 0;
          previousBalance = lastInvoice.balanceAmount || 0;
          updateSource = 'Previous invoice balance';
        }

        // Check if today is the right day for this enrollment
        let shouldUpdate = false;
        let updateReason = '';

        if (isDue1 && isLastDayOfMonth) {
          // Due 1: Update on last day of month
          shouldUpdate = true;
          updateReason = 'Due 1 - Last day of month';
        } else if (!isDue1 && is21st) {
          // Due 2+: Update on 21st
          shouldUpdate = true;
          updateReason = 'Due 2+ - 21st of month';
        } else if (force) {
          // Forced update for testing
          shouldUpdate = true;
          updateReason = 'Forced update (testing)';
        }

        if (!shouldUpdate) {
          results.skipped.push({
            enrollmentId: enrollment._id,
            userId: enrollment.userId,
            dueNumber: dueNumber,
            reason: isDue1 
              ? 'Due 1 - Wait for last day of month' 
              : 'Due 2+ - Wait for 21st'
          });
          continue;
        }

        // Calculate previous arrear
        const previousArrear = lastInvoice ? (lastInvoice.arrearAmount || 0) : 0;

        // SAVE the arrear to enrollment.currentArrear
        await Enrollment.updateOne(
          { _id: enrollment._id },
          { 
            $set: { 
              currentArrear: newArrear,
              arrearLastUpdated: new Date()
            }
          }
        );

        results.updated.push({
          enrollmentId: enrollment._id,
          userId: enrollment.userId,
          dueNumber: dueNumber,
          lastInvoiceDate: lastInvoice ? lastInvoice.invoiceDate : null,
          previousBalance: previousBalance,
          previousArrear: previousArrear,
          newArrear: newArrear,
          change: newArrear - previousArrear,
          updateReason: updateReason,
          source: updateSource,
          saved: true // Indicate that it was saved to database
        });

        console.log(`  ✅ ${enrollment.userId} (Due ${dueNumber}):`);
        console.log(`     Reason: ${updateReason}`);
        console.log(`     Source: ${updateSource}`);
        if (lastInvoice) {
          console.log(`     Last invoice: ${new Date(lastInvoice.invoiceDate).toISOString().split('T')[0]}`);
        }
        console.log(`     Previous balance: ₹${previousBalance}`);
        console.log(`     New arrear (SAVED): ₹${newArrear}`);

      } catch (error) {
        console.error(`  ❌ Error processing enrollment ${enrollment._id}:`, error);
        results.errors.push({
          enrollmentId: enrollment._id,
          userId: enrollment.userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Summary:');
    console.log(`  ✅ Updated: ${results.updated.length}`);
    console.log(`  ⏭️  Skipped: ${results.skipped.length}`);
    console.log(`  ❌ Errors: ${results.errors.length}`);
    console.log('='.repeat(60));

    return NextResponse.json({
      success: true,
      message: `Arrear calculation completed for ${today.toISOString().split('T')[0]}`,
      summary: {
        total: activeEnrollments.length,
        updated: results.updated.length,
        skipped: results.skipped.length,
        errors: results.errors.length
      },
      details: results,
      note: 'Arrears will be automatically applied when creating the next invoice for each customer.'
    });

  } catch (error) {
    console.error('❌ Error updating arrears:', error);
    return NextResponse.json(
      {
        error: 'Failed to update arrears',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
