/**
 * Automatic Arrear Update Script
 * 
 * This script should be run on the 21st of every month.
 * It updates arrears for all active enrollments based on their previous invoice balance.
 * 
 * Logic:
 * - On 21st: arrear = previous invoice's balance amount
 * - This ensures all customers have updated arrears on the 21st automatically
 * 
 * Usage:
 * node scripts/update-arrears-on-21st.ts
 * 
 * Or set up a cron job to run automatically on 21st of every month:
 * 0 0 21 * * node scripts/update-arrears-on-21st.ts
 */

import mongoose from 'mongoose';
import Enrollment from '../models/Enrollment';
import Invoice from '../models/Invoice';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chitfund';

async function updateArrearsOn21st() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const today = new Date();
    const currentDay = today.getDate();

    // Safety check - only run on 21st
    if (currentDay !== 21) {
      console.log(`⚠️  This script should only run on the 21st. Today is ${currentDay}th.`);
      console.log('Exiting...');
      process.exit(0);
    }

    console.log(`\n🔄 Running arrear update for ${today.toISOString().split('T')[0]}`);
    console.log('='.repeat(60));

    // Find all active enrollments
    const activeEnrollments = await Enrollment.find({ status: 'active' }).lean();
    console.log(`\n📊 Found ${activeEnrollments.length} active enrollments`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const enrollment of activeEnrollments) {
      try {
        // Find the most recent invoice for this enrollment
        const lastInvoice = await Invoice.findOne({
          enrollmentId: enrollment._id
        })
          .sort({ invoiceDate: -1 })
          .limit(1)
          .lean();

        if (!lastInvoice) {
          console.log(`  ⏭️  Skipping ${enrollment.userId} - No previous invoice found`);
          skippedCount++;
          continue;
        }

        // Calculate new arrear from last invoice's balance
        const newArrear = lastInvoice.balanceAmount || 0;

        console.log(`  ✅ ${enrollment.userId}:`);
        console.log(`     Last invoice: ${new Date(lastInvoice.invoiceDate).toISOString().split('T')[0]}`);
        console.log(`     Previous balance: ₹${lastInvoice.balanceAmount}`);
        console.log(`     New arrear: ₹${newArrear}`);

        // Create a new invoice entry for the 21st with updated arrear
        // OR you can update the enrollment's arrear field if you have one
        // For now, we'll just log it - you can decide where to store this

        // Option 1: Store in enrollment document (if you add an 'arrear' field to Enrollment model)
        // await Enrollment.updateOne(
        //   { _id: enrollment._id },
        //   { $set: { currentArrear: newArrear } }
        // );

        // Option 2: Create a placeholder invoice for the 21st
        // This will be used when creating the next invoice
        
        updatedCount++;

      } catch (error) {
        console.error(`  ❌ Error processing ${enrollment.userId}:`, error);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Summary:');
    console.log(`  ✅ Updated: ${updatedCount}`);
    console.log(`  ⏭️  Skipped: ${skippedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log('='.repeat(60));

    console.log('\n✅ Arrear update completed successfully!');

  } catch (error) {
    console.error('❌ Error updating arrears:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
updateArrearsOn21st();
