const mongoose = require('mongoose');
require('dotenv').config();

const TEST_URI = "mongodb+srv://nick:password01@cluster0.alwoity.mongodb.net/invoify_dev";

async function checkUserRoles() {
  try {
    console.log('🔗 Connecting to test database...');
    await mongoose.connect(TEST_URI);
    console.log('✅ Connected!\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Count users by role
    const roleStats = await usersCollection.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]).toArray();

    console.log('📊 User Role Statistics:');
    console.log('========================');
    roleStats.forEach(stat => {
      console.log(`${stat._id || 'null/undefined'}: ${stat.count} users`);
    });

    console.log('\n📋 Sample users with role="user":');
    const sampleUsers = await usersCollection.find({ role: 'user' }).limit(5).toArray();
    sampleUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.userId || user._id}) - ${user.email || user.phone}`);
    });

    console.log('\n✅ Total users in database:', await usersCollection.countDocuments());

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserRoles();
