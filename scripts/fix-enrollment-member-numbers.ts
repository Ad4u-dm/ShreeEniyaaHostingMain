/**
 * Migration Script: Fix Enrollment Member Numbers
 *
 * This script fixes enrollments that have missing or incorrect member numbers
 * by setting them to match the user's unique memberNumber from the User model.
 *
 * Run with: npx tsx scripts/fix-enrollment-member-numbers.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ Error: MONGO_URI or MONGODB_URI environment variable is not set.');
  process.exit(1);
}

// Define schemas
const UserSchema = new mongoose.Schema({
  userId: String,
  memberNumber: String,
  name: String,
  email: String,
  role: String
}, { collection: 'users' });

const EnrollmentSchema = new mongoose.Schema({
  enrollmentId: String,
  userId: String,
  planId: mongoose.Schema.Types.ObjectId,
  memberNumber: String,
  status: String,
  enrollmentDate: Date
}, { collection: 'enrollments' });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Enrollment = mongoose.models.Enrollment || mongoose.model('Enrollment', EnrollmentSchema);

async function fixEnrollmentMemberNumbers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all enrollments
    const enrollments = await Enrollment.find({}).lean();
    console.log(`\n📊 Found ${enrollments.length} total enrollments`);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const enrollment of enrollments) {
      try {
        // Find the user for this enrollment
        const user = await User.findOne({ userId: enrollment.userId }).lean();

        if (!user) {
          console.log(`⚠️  Skipping enrollment ${enrollment.enrollmentId}: User ${enrollment.userId} not found`);
          skippedCount++;
          errors.push(`Enrollment ${enrollment.enrollmentId}: User ${enrollment.userId} not found`);
          continue;
        }

        if (!user.memberNumber) {
          console.log(`⚠️  Skipping enrollment ${enrollment.enrollmentId}: User ${enrollment.userId} has no memberNumber`);
          skippedCount++;
          errors.push(`Enrollment ${enrollment.enrollmentId}: User ${enrollment.userId} (${user.name}) has no memberNumber`);
          continue;
        }

        // Check if member number needs updating
        if (enrollment.memberNumber === user.memberNumber) {
          // Already correct, skip
          continue;
        }

        // Update the enrollment's member number to match the user's
        await Enrollment.updateOne(
          { _id: enrollment._id },
          { $set: { memberNumber: user.memberNumber } }
        );

        console.log(`✅ Fixed enrollment ${enrollment.enrollmentId}: Set memberNumber to ${user.memberNumber} (User: ${user.name})`);
        fixedCount++;

      } catch (error: any) {
        console.error(`❌ Error processing enrollment ${enrollment.enrollmentId}:`, error.message);
        errorCount++;
        errors.push(`Enrollment ${enrollment.enrollmentId}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total enrollments:        ${enrollments.length}`);
    console.log(`✅ Fixed:                 ${fixedCount}`);
    console.log(`⏭️  Skipped (already ok):  ${enrollments.length - fixedCount - skippedCount - errorCount}`);
    console.log(`⚠️  Skipped (issues):      ${skippedCount}`);
    console.log(`❌ Errors:                ${errorCount}`);
    console.log('='.repeat(60));

    if (errors.length > 0) {
      console.log('\n⚠️  Issues encountered:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log('\n✨ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the migration
fixEnrollmentMemberNumbers();
