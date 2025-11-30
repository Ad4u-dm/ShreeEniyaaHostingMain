import connectDB from '../lib/mongodb';
import Enrollment from '../models/Enrollment';
import Plan from '../models/Plan';

async function main() {
  try {
    await connectDB();

    console.log('Scanning enrollments to fix end dates...');

    // Load enrollments and populate plan info
    const enrollments = await Enrollment.find({}).populate('planId');

    let updated = 0;

    for (const e of enrollments) {
      const plan: any = (e as any).planId;
      if (!plan) continue;

      // Only adjust monthly plans
      if (plan.planType !== 'monthly') continue;

      const start = e.startDate || e.enrollmentDate || e.createdAt;
      if (!start) continue;

      const expectedEnd = new Date(start);
      expectedEnd.setMonth(expectedEnd.getMonth() + (plan.duration || 0));
      expectedEnd.setDate(20);

      const currentEnd = e.endDate ? new Date(e.endDate) : null;

      const different = !currentEnd || currentEnd.getFullYear() !== expectedEnd.getFullYear() || currentEnd.getMonth() !== expectedEnd.getMonth() || currentEnd.getDate() !== expectedEnd.getDate();

      if (different) {
        console.log(`Updating enrollment ${e._id} (userId=${e.userId}) endDate from ${currentEnd?.toISOString() || 'null'} to ${expectedEnd.toISOString()}`);
        e.endDate = expectedEnd;
        await e.save();
        updated++;
      }
    }

    console.log(`Completed. Enrollments updated: ${updated}`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main();
