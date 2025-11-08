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

// Define User schema (simplified)
const UserSchema = new mongoose.Schema({
  userId: String,
  name: String,
  role: String,
  createdBy: mongoose.Schema.Types.Mixed // Mixed type to handle both string and ObjectId
}, { collection: 'users' });

const User = mongoose.model('User', UserSchema);

async function fixCreatedByReferences() {
  try {
    console.log('Starting createdBy reference fix...');
    
    // Find all users with string createdBy values
    const usersWithStringCreatedBy = await User.find({
      createdBy: { $type: 'string' }
    });
    
    console.log(`Found ${usersWithStringCreatedBy.length} users with string createdBy values`);
    
    let fixed = 0;
    let notFound = 0;
    
    for (const user of usersWithStringCreatedBy) {
      const createdByUserId = user.createdBy;
      
      // Find the creator user by userId
      const creatorUser = await User.findOne({ userId: createdByUserId });
      
      if (creatorUser) {
        // Update createdBy to ObjectId
        await User.updateOne(
          { _id: user._id },
          { createdBy: creatorUser._id }
        );
        console.log(`Fixed user ${user.userId || user._id}: createdBy ${createdByUserId} -> ${creatorUser._id}`);
        fixed++;
      } else {
        // Creator not found, set to null
        await User.updateOne(
          { _id: user._id },
          { createdBy: null }
        );
        console.log(`User ${user.userId || user._id}: creator ${createdByUserId} not found, set to null`);
        notFound++;
      }
    }
    
    console.log(`\nMigration completed:`);
    console.log(`- Fixed: ${fixed} users`);
    console.log(`- Not found (set to null): ${notFound} users`);
    
  } catch (error) {
    console.error('Error fixing createdBy references:', error);
  }
}

async function main() {
  await connectDB();
  await fixCreatedByReferences();
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

main().catch(console.error);