const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Define schemas
const PaymentSchema = new mongoose.Schema({}, { collection: 'payments' });
const EnrollmentSchema = new mongoose.Schema({}, { collection: 'enrollments' });

const Payment = mongoose.model('Payment', PaymentSchema);
const Enrollment = mongoose.model('Enrollment', EnrollmentSchema);

async function cleanSeedData() {
  try {
    console.log('Starting cleanup of seeded payment data...\n');
    
    // Count existing data
    const paymentCount = await Payment.countDocuments({});
    const enrollmentCount = await Enrollment.countDocuments({});
    
    console.log(`Found ${paymentCount} payments and ${enrollmentCount} enrollments`);
    
    // Ask for confirmation (in real script, you'd want user input)
    console.log('\nThis will:');
    console.log('1. Delete ALL payment records (seeded data)');
    console.log('2. Reset totalPaid and totalDue in enrollments to proper values');
    
    // For now, let's just show what would be deleted
    console.log('\nPayments that would be deleted:');
    const payments = await Payment.find({}).limit(10);
    payments.forEach(payment => {
      console.log(`- Payment ID: ${payment._id}, Amount: ₹${payment.amount}, User: ${payment.userId}`);
    });
    
    if (paymentCount > 10) {
      console.log(`... and ${paymentCount - 10} more payments`);
    }
    
    // Uncomment these lines to actually perform the cleanup:
    /*
    console.log('\nDeleting all payments...');
    const deleteResult = await Payment.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} payments`);
    
    console.log('\nResetting enrollment totals...');
    const updateResult = await Enrollment.updateMany(
      {},
      { 
        $set: { 
          totalPaid: 0,
          totalDue: '$planId.totalAmount' // This would need proper aggregation
        }
      }
    );
    console.log(`Updated ${updateResult.modifiedCount} enrollments`);
    */
    
    console.log('\n⚠️  To actually perform the cleanup, uncomment the deletion code in the script.');
    console.log('⚠️  This will permanently delete all payment records!');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

async function main() {
  await connectDB();
  await cleanSeedData();
  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
}

main().catch(console.error);