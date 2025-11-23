/**
 * Migration Script: Update Invoices with enrollmentId and monthlyAmount-based dueAmount
 *
 * This script:
 * 1. Finds invoices without enrollmentId
 * 2. Matches them with enrollments based on customerId + planId
 * 3. Sets the enrollmentId field
 * 4. Calculates dueAmount from plan.monthlyAmount[dueNumber - 1]
 * 5. Recalculates balanceAmount = dueAmount - receivedAmount
 */

import mongoose from 'mongoose';
import connectDB from '../lib/mongodb';
import Invoice from '../models/Invoice';
import Enrollment from '../models/Enrollment';
import Plan from '../models/Plan';
import User from '../models/User';

interface MigrationStats {
  totalInvoices: number;
  updated: number;
  skipped: number;
  noEnrollmentFound: number;
  errors: number;
  errorDetails: Array<{
    invoiceId: string;
    error: string;
  }>;
}

async function migrateInvoicesWithEnrollment() {
  try {
    console.log('🚀 Starting invoice migration...\n');

    await connectDB();

    const stats: MigrationStats = {
      totalInvoices: 0,
      updated: 0,
      skipped: 0,
      noEnrollmentFound: 0,
      errors: 0,
      errorDetails: []
    };

    // Find all invoices
    const invoices = await Invoice.find({}).lean();
    stats.totalInvoices = invoices.length;

    console.log(`📊 Found ${stats.totalInvoices} invoices to process\n`);

    for (const invoice of invoices) {
      try {
        const invoiceId = invoice.invoiceId || invoice._id.toString();
        console.log(`\n📝 Processing invoice: ${invoiceId}`);

        // Skip if already has enrollmentId
        if (invoice.enrollmentId) {
          console.log(`  ⏭️  Already has enrollmentId, skipping...`);
          stats.skipped++;
          continue;
        }

        // Find matching enrollment
        // Match: enrollment.userId == invoice.customerId AND enrollment.planId == invoice.planId
        const enrollment = await Enrollment.findOne({
          userId: invoice.customerId,
          planId: invoice.planId
        }).lean();

        if (!enrollment) {
          console.log(`  ⚠️  No enrollment found for customerId: ${invoice.customerId}, planId: ${invoice.planId}`);
          stats.noEnrollmentFound++;
          stats.errorDetails.push({
            invoiceId,
            error: 'No matching enrollment found'
          });
          continue;
        }

        console.log(`  ✅ Found enrollment: ${enrollment.enrollmentId || enrollment._id}`);

        // Fetch the plan to get monthlyAmount array
        const plan = await Plan.findById(invoice.planId).lean();

        if (!plan) {
          console.log(`  ⚠️  Plan not found: ${invoice.planId}`);
          stats.errors++;
          stats.errorDetails.push({
            invoiceId,
            error: 'Plan not found'
          });
          continue;
        }

        // Calculate dueAmount from monthlyAmount array
        let newDueAmount = invoice.dueAmount || 0;
        const dueNumber = invoice.dueNumber ? parseInt(invoice.dueNumber.toString()) : 1;

        if (plan.monthlyAmount && Array.isArray(plan.monthlyAmount) && plan.monthlyAmount.length > 0) {
          const index = dueNumber - 1;
          if (index >= 0 && index < plan.monthlyAmount.length) {
            newDueAmount = plan.monthlyAmount[index];
            console.log(`  💰 Calculated dueAmount from monthlyAmount[${index}]: ${newDueAmount}`);
          } else {
            // Use last month's amount if dueNumber exceeds array
            newDueAmount = plan.monthlyAmount[plan.monthlyAmount.length - 1];
            console.log(`  💰 Using last monthlyAmount (out of range): ${newDueAmount}`);
          }
        } else if (plan.monthlyData && plan.monthlyData.length > 0) {
          // Fallback: use monthlyData
          const monthData = plan.monthlyData.find((m: any) => m.monthNumber === dueNumber);
          if (monthData) {
            newDueAmount = monthData.payableAmount;
            console.log(`  💰 Calculated dueAmount from monthlyData: ${newDueAmount}`);
          }
        } else if (invoice.dueAmount) {
          // Keep existing dueAmount
          console.log(`  💰 Keeping existing dueAmount: ${newDueAmount}`);
        } else {
          // Calculate from plan average
          newDueAmount = plan.averageMonthlyAmount || (plan.totalAmount / plan.duration);
          console.log(`  💰 Calculated dueAmount from average: ${newDueAmount}`);
        }

        // Recalculate balanceAmount = dueAmount - receivedAmount
        const receivedAmount = invoice.receivedAmount || 0;
        const newBalanceAmount = newDueAmount - receivedAmount;

        // Update the invoice
        await Invoice.findByIdAndUpdate(invoice._id, {
          $set: {
            enrollmentId: enrollment._id,
            dueAmount: newDueAmount,
            balanceAmount: newBalanceAmount
          }
        });

        console.log(`  ✅ Updated invoice successfully`);
        console.log(`     - enrollmentId: ${enrollment._id}`);
        console.log(`     - dueAmount: ${newDueAmount}`);
        console.log(`     - balanceAmount: ${newBalanceAmount}`);

        stats.updated++;

      } catch (error: any) {
        console.error(`  ❌ Error processing invoice ${invoice.invoiceId || invoice._id}:`, error.message);
        stats.errors++;
        stats.errorDetails.push({
          invoiceId: invoice.invoiceId || invoice._id.toString(),
          error: error.message
        });
      }
    }

    // Print final statistics
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Invoices:       ${stats.totalInvoices}`);
    console.log(`✅ Updated:           ${stats.updated}`);
    console.log(`⏭️  Skipped:           ${stats.skipped}`);
    console.log(`⚠️  No Enrollment:     ${stats.noEnrollmentFound}`);
    console.log(`❌ Errors:            ${stats.errors}`);
    console.log('='.repeat(60));

    if (stats.errorDetails.length > 0) {
      console.log('\n❌ Error Details:');
      stats.errorDetails.forEach((detail, index) => {
        console.log(`  ${index + 1}. Invoice ${detail.invoiceId}: ${detail.error}`);
      });
    }

    console.log('\n✅ Migration completed!\n');

    // Disconnect
    await mongoose.disconnect();

    return stats;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    await mongoose.disconnect();
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateInvoicesWithEnrollment()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default migrateInvoicesWithEnrollment;
