/**
 * Migration: Link existing invoices to enrollments
 * -----------------------------------------------
 * This script:
 * 1) Finds invoices missing enrollmentId
 * 2) Finds matching enrollment using (customerId + planId)
 * 3) Sets invoice.enrollmentId = enrollment._id
 * 4) Does NOT change dueAmount, arrearAmount, balanceAmount, dueNumber or invoiceDate
 */

import dotenv from 'dotenv';
// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import mongoose from "mongoose";
import Invoice from "../models/Invoice";
import Enrollment from "../models/Enrollment";

const MONGO_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/invoify";

console.log("MONGO_URI:", MONGO_URI);
console.log("Starting migration...");

async function migrate() {
  await mongoose.connect(MONGO_URI);

  const invoices = await Invoice.find({
    $or: [
      { enrollmentId: { $exists: false } },
      { enrollmentId: null }
    ]
  });

  console.log(`Found ${invoices.length} invoices missing enrollmentId`);

  let success = 0;
  let failed = 0;

  for (const invoice of invoices) {
    try {
      const { customerId, planId } = invoice;

      if (!customerId || !planId) {
        console.log(`Skipping invoice ${invoice._id}: missing customerId or planId`);
        failed++;
        continue;
      }

      const enrollment = await Enrollment.findOne({
        userId: customerId,
        planId: planId
      });

      if (!enrollment) {
        console.log(`❌ No matching enrollment found for invoice ${invoice._id}`);
        failed++;
        continue;
      }

      invoice.enrollmentId = enrollment._id;
      await invoice.save();

      console.log(`✔ Linked invoice ${invoice._id} → enrollment ${enrollment._id}`);
      success++;

    } catch (err) {
      console.error(`Error updating invoice ${invoice._id}:`, err);
      failed++;
    }
  }

  console.log("\nMigration Summary:");
  console.log(`✔ Successfully linked: ${success}`);
  console.log(`⚠ Failed/skipped: ${failed}`);

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
