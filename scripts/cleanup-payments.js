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

async function cleanupSeedData() {
  try {
    console.log('🧹 Cleaning up seeded payment data...\n');
    
    // Count existing data
    const paymentCount = await mongoose.connection.collection('payments').countDocuments({});
    const enrollmentCount = await mongoose.connection.collection('enrollments').countDocuments({});
    
    console.log(`Found ${paymentCount} payments and ${enrollmentCount} enrollments`);
    
    // Delete all payments (since they're all from seeding)
    console.log('\n🗑️  Deleting all seeded payment records...');
    const deleteResult = await mongoose.connection.collection('payments').deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} payment records`);
    
    // Reset enrollment totals
    console.log('\n🔄 Resetting enrollment payment totals...');
    const updateResult = await mongoose.connection.collection('enrollments').updateMany(
      {},
      { 
        $set: { 
          totalPaid: 0,
        },
        $unset: {
          totalDue: ""
        }
      }
    );
    console.log(`✅ Reset ${updateResult.modifiedCount} enrollment records`);
    
    // Verify cleanup
    const remainingPayments = await mongoose.connection.collection('payments').countDocuments({});
    console.log(`\n✅ Cleanup complete! Remaining payments: ${remainingPayments}`);
    
    console.log('\n📋 Summary:');
    console.log(`- Removed ${deleteResult.deletedCount} fake payment records`);
    console.log(`- Reset ${updateResult.modifiedCount} enrollment payment totals`);
    console.log('- New user enrollments will now show correct payment status (₹0 paid, no payments made)');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

async function main() {
  await connectDB();
  await cleanupSeedData();
  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
}

main().catch(console.error);