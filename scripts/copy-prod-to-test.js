const mongoose = require('mongoose');
require('dotenv').config();

// Database URIs
const PROD_URI = "mongodb+srv://user:password02@cluster0.lxwwhmj.mongodb.net/invoify";
const TEST_URI = "mongodb+srv://nick:password01@cluster0.alwoity.mongodb.net/invoify_dev";

async function copyDatabase() {
  console.log('🔄 Starting database copy from production to test...\n');
  
  try {
    // Connect to production database
    console.log('📡 Connecting to production database...');
    const prodConnection = await mongoose.createConnection(PROD_URI).asPromise();
    console.log('✅ Connected to production database: invoify\n');

    // Connect to test database
    console.log('📡 Connecting to test database...');
    const testConnection = await mongoose.createConnection(TEST_URI).asPromise();
    console.log('✅ Connected to test database: invoify_dev\n');

    // Get all collections from production
    const collections = await prodConnection.db.listCollections().toArray();
    console.log(`📚 Found ${collections.length} collections in production database\n`);

    // Copy each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`📋 Copying collection: ${collectionName}...`);
      
      try {
        // Get data from production
        const prodCollection = prodConnection.db.collection(collectionName);
        const documents = await prodCollection.find({}).toArray();
        
        if (documents.length === 0) {
          console.log(`   ℹ️  Collection ${collectionName} is empty - skipping\n`);
          continue;
        }

        // Get test collection (don't clear it, just add/update documents)
        const testCollection = testConnection.db.collection(collectionName);
        
        // Insert or update documents
        let insertedCount = 0;
        let updatedCount = 0;
        
        for (const doc of documents) {
          try {
            // Try to update first (if _id exists), otherwise insert
            const result = await testCollection.replaceOne(
              { _id: doc._id },
              doc,
              { upsert: true }
            );
            
            if (result.upsertedCount > 0) {
              insertedCount++;
            } else if (result.modifiedCount > 0) {
              updatedCount++;
            }
          } catch (err) {
            console.log(`   ⚠️  Error copying document in ${collectionName}:`, err.message);
          }
        }
        
        console.log(`   ✅ ${collectionName}: ${insertedCount} inserted, ${updatedCount} updated (${documents.length} total)\n`);
      } catch (err) {
        console.log(`   ❌ Error copying ${collectionName}:`, err.message, '\n');
      }
    }

    // Close connections
    await prodConnection.close();
    await testConnection.close();
    
    console.log('✅ Database copy completed successfully!');
    console.log('📊 Test database now contains production data (existing test data preserved)\n');
    
  } catch (error) {
    console.error('❌ Error during database copy:', error);
    process.exit(1);
  }
}

// Run the copy
copyDatabase()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
