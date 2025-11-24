// scripts/fix_missing_member_numbers.js
// Run this script with: node scripts/fix_missing_member_numbers.js

const mongoose = require('mongoose');
const User = require('../models/User').default || require('../models/User');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Error: MONGO_URI environment variable is not set.');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const users = await User.find({ memberNumber: { $in: [null, '', undefined] } });
  console.log(`Found ${users.length} users missing memberNumber.`);

  let updated = 0;
  for (const user of users) {
    // Trigger pre-save hook to auto-generate memberNumber
    await user.save();
    updated++;
    console.log(`Updated user ${user._id} with memberNumber: ${user.memberNumber}`);
  }

  console.log(`Done. Updated ${updated} users.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error running migration:', err);
  process.exit(1);
});
