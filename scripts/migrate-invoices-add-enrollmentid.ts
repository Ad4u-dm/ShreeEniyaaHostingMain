/**
 * Migration Script: Link existing invoices to enrollments
 *
 * This script:
 * 1. Finds invoices without enrollmentId (or with null enrollmentId)
 * 2. Matches them with enrollments based on customerId + planId
 * 3. Sets the enrollmentId field
 * 4. Does NOT modify dueAmount, arrearAmount, balanceAmount, or dueNumber
 */

import mongoose from 'mongoose';
import connectDB from '../lib/mongodb';
import Invoice from '../models/Invoice';
import Enrollment from '../models/Enrollment';

interface MigrationStats {
  totalInvoices: number;
  updated: number;
  skipped: number;
  noEnrollmentFound: number;
  alreadyLinked: number;
  errors: number;
  errorDetails: Array<{
    invoiceId: string;
    error: string;
  }>;
}

async function migrateInvoicesAddEnrollmentId() {
  try {
    console.log('🚀 Starting invoice-enrollment linking migration...\n');

    await connectDB();

    const stats: MigrationStats = {
      totalInvoices: 0,
      updated: 0,
      skipped: 0,
      noEnrollmentFound: 0,
      alreadyLinked: 0,
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
          console.log(`  ✅ Already linked to enrollment, skipping...`);
          stats.alreadyLinked++;
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

        // Update the invoice - ONLY set enrollmentId, do NOT touch other fields
        await Invoice.findByIdAndUpdate(invoice._id, {
          $set: {
            enrollmentId: enrollment._id
          }
        });

        console.log(`  ✅ Updated invoice successfully`);
        console.log(`     - enrollmentId: ${enrollment._id}`);

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
    console.log(`✅ Already Linked:    ${stats.alreadyLinked}`);
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
  migrateInvoicesAddEnrollmentId()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default migrateInvoicesAddEnrollmentId;
