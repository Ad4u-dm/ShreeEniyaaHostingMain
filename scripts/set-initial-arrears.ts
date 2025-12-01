/**
 * One-time Script: Set Initial Arrears
 * 
 * Sets currentArrear to the 1st monthly amount for all active enrollments
 * that don't have any invoices yet.
 * 
 * Usage: npx ts-node scripts/set-initial-arrears.ts
 */

import mongoose from 'mongoose';
import Enrollment from '../models/Enrollment';
import Invoice from '../models/Invoice';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chitfund';

async function setInitialArrears() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔄 Setting initial arrears for enrollments without invoices...');
    console.log('='.repeat(70));

    // Find all active enrollments
    const activeEnrollments = await Enrollment.find({ status: 'active' })
      .populate('planId')
      .lean();

    console.log(`\n📊 Found ${activeEnrollments.length} active enrollments\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const enrollment of activeEnrollments) {
      try {
        // Check if enrollment has any invoices
        const hasInvoice = await Invoice.findOne({
          enrollmentId: enrollment._id
        }).lean();

        if (hasInvoice) {
          console.log(`  ⏭️  ${enrollment.userId} - Already has invoice, skipping`);
          skippedCount++;
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
          console.log(`  ⚠️  ${enrollment.userId} - No monthly amount found, skipping`);
          skippedCount++;
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

        console.log(`  ✅ ${enrollment.userId} - Set arrear to ₹${firstMonthAmount.toLocaleString('en-IN')}`);
        updatedCount++;

      } catch (error) {
        console.error(`  ❌ Error processing ${enrollment.userId}:`, error);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📈 Summary:');
    console.log(`  ✅ Updated: ${updatedCount}`);
    console.log(`  ⏭️  Skipped: ${skippedCount}`);
    console.log(`  📊 Total: ${activeEnrollments.length}`);
    console.log('='.repeat(70));

    console.log('\n✅ Initial arrears set successfully!');

  } catch (error) {
    console.error('❌ Error setting initial arrears:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
setInitialArrears();
