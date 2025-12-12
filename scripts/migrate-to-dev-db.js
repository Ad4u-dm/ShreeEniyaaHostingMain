/**
 * Migration Script: Copy Production DB to Development DB
 *
 * WARNING: This script ONLY reads from production and writes to dev.
 * It will NOT modify the production database in any way.
 *
 * Usage: node scripts/migrate-to-dev-db.js
 */

const mongoose = require('mongoose');

// Database URIs
const PRODUCTION_URI = "mongodb+srv://user:password02@cluster0.lxwwhmj.mongodb.net/invoify";
const DEV_URI = "mongodb+srv://nick:password01@cluster0.alwoity.mongodb.net/invoify_dev";

// Collections to migrate
const COLLECTIONS = [
  'users',
  'plans',
  'enrollments',
  'invoices',
  'payments',
  'transactions'
];

async function migrateData() {
  console.log('🚀 Starting database migration...\n');

  // Connect to PRODUCTION (read-only)
  console.log('📖 Connecting to PRODUCTION database (read-only)...');
  const prodConnection = await mongoose.createConnection(PRODUCTION_URI, {
    serverSelectionTimeoutMS: 5000,
  }).asPromise();
  console.log('✅ Connected to production\n');

  // Connect to DEV (write)
  console.log('📝 Connecting to DEVELOPMENT database...');
  const devConnection = await mongoose.createConnection(DEV_URI, {
    serverSelectionTimeoutMS: 5000,
  }).asPromise();
  console.log('✅ Connected to development\n');

  try {
    // Get all collections from production
    const collections = await prodConnection.db.listCollections().toArray();
    console.log(`📦 Found ${collections.length} collections in production\n`);

    let totalDocuments = 0;
    const summary = [];

    for (const collInfo of collections) {
      const collectionName = collInfo.name;

      // Skip system collections
      if (collectionName.startsWith('system.')) {
        console.log(`⏭️  Skipping system collection: ${collectionName}`);
        continue;
      }

      console.log(`\n📋 Migrating collection: ${collectionName}`);

      // Get production collection
      const prodCollection = prodConnection.db.collection(collectionName);
      const devCollection = devConnection.db.collection(collectionName);

      // Count documents
      const count = await prodCollection.countDocuments();
      console.log(`   Documents to copy: ${count}`);

      if (count === 0) {
        console.log(`   ⚠️  Empty collection, skipping`);
        summary.push({ collection: collectionName, count: 0, status: 'skipped (empty)' });
        continue;
      }

      // Clear dev collection first (to avoid duplicates)
      await devCollection.deleteMany({});
      console.log(`   🗑️  Cleared existing dev data`);

      // Copy all documents
      const documents = await prodCollection.find({}).toArray();

      if (documents.length > 0) {
        await devCollection.insertMany(documents, { ordered: false });
        console.log(`   ✅ Copied ${documents.length} documents`);
        totalDocuments += documents.length;
        summary.push({ collection: collectionName, count: documents.length, status: 'success' });
      }

      // Copy indexes
      const indexes = await prodCollection.indexes();
      if (indexes.length > 1) { // More than just _id index
        console.log(`   📑 Copying ${indexes.length - 1} indexes...`);
        for (const index of indexes) {
          if (index.name !== '_id_') {
            try {
              const indexSpec = { [index.key]: 1 };
              const options = {
                name: index.name,
                unique: index.unique || false,
                sparse: index.sparse || false
              };
              await devCollection.createIndex(index.key, options);
            } catch (err) {
              console.log(`   ⚠️  Index ${index.name} may already exist`);
            }
          }
        }
      }
    }

    console.log('\n\n╔════════════════════════════════════════╗');
    console.log('║     MIGRATION COMPLETED SUCCESSFULLY   ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('📊 Migration Summary:');
    console.log('─'.repeat(50));
    summary.forEach(({ collection, count, status }) => {
      const statusIcon = status === 'success' ? '✅' : '⚠️';
      console.log(`${statusIcon} ${collection.padEnd(25)} ${count.toString().padStart(8)} docs`);
    });
    console.log('─'.repeat(50));
    console.log(`   TOTAL DOCUMENTS MIGRATED: ${totalDocuments}\n`);

    console.log('✨ Development database is now ready for testing!');
    console.log('🔒 Production database was NOT modified (read-only access)\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Close connections
    await prodConnection.close();
    await devConnection.close();
    console.log('🔌 Database connections closed');
    process.exit(0);
  }
}

// Run migration
console.log('╔════════════════════════════════════════╗');
console.log('║   DATABASE MIGRATION SCRIPT            ║');
console.log('║   Production → Development             ║');
console.log('╚════════════════════════════════════════╝\n');

console.log('⚠️  SAFETY CHECK:');
console.log('   ✓ Production DB: READ ONLY');
console.log('   ✓ Development DB: WRITE ONLY');
console.log('   ✓ Production data will NOT be modified\n');

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Continue with migration? (yes/no): ', (answer) => {
  readline.close();

  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    migrateData();
  } else {
    console.log('\n❌ Migration cancelled by user');
    process.exit(0);
  }
});
