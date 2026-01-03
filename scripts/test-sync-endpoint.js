/**
 * Test script to verify sync endpoint
 * Run with: node scripts/test-sync-endpoint.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://nick:password01@cluster0.alwoity.mongodb.net/invoify_dev";

async function testSyncEndpoint() {
  console.log('🧪 Testing Sync Endpoint\n');
  
  try {
    // Test 1: Backend should be running
    console.log('1. Checking if backend is running...');
    const backendUrl = 'http://localhost:5000';
    
    try {
      const healthCheck = await fetch(`${backendUrl}/health`);
      if (healthCheck.ok) {
        console.log('   ✅ Backend is running\n');
      }
    } catch (error) {
      console.log('   ❌ Backend not running. Start it with: NODE_ENV=development node backend/server.js\n');
      return;
    }

    // Test 2: Check MongoDB has data
    console.log('2. Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('   ✅ Connected to MongoDB\n');

    const usersCount = await mongoose.connection.db.collection('users').countDocuments();
    const plansCount = await mongoose.connection.db.collection('plans').countDocuments();
    const invoicesCount = await mongoose.connection.db.collection('invoices').countDocuments();
    
    console.log(`   📊 Database stats:`);
    console.log(`      - Users: ${usersCount}`);
    console.log(`      - Plans: ${plansCount}`);
    console.log(`      - Invoices: ${invoicesCount}\n`);

    // Test 3: Get a sample user for auth
    console.log('3. Getting admin user token...');
    const adminUser = await mongoose.connection.db.collection('users').findOne({ role: 'admin' });
    
    if (!adminUser) {
      console.log('   ❌ No admin user found. Run: npm run seed-chitfund\n');
      await mongoose.disconnect();
      return;
    }
    
    console.log(`   ✅ Found admin: ${adminUser.email}\n`);

    // Test 4: Login to get token
    console.log('4. Logging in to get auth token...');
    const loginRes = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminUser.email,
        password: 'admin123' // Default password from seed
      })
    });

    if (!loginRes.ok) {
      console.log('   ❌ Login failed. Check credentials\n');
      await mongoose.disconnect();
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('   ✅ Got auth token\n');

    // Test 5: Test sync endpoint
    console.log('5. Testing sync endpoint...');
    const syncRes = await fetch(`${backendUrl}/api/sync/pull?since=2020-01-01T00:00:00Z&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!syncRes.ok) {
      console.log(`   ❌ Sync endpoint failed: ${syncRes.status} ${syncRes.statusText}\n`);
      const error = await syncRes.text();
      console.log('   Error:', error);
      await mongoose.disconnect();
      return;
    }

    const syncData = await syncRes.json();
    console.log('   ✅ Sync endpoint working!\n');
    console.log('   📦 Sync response:');
    console.log(`      - Success: ${syncData.success}`);
    console.log(`      - Changes received: ${syncData.count}`);
    console.log(`      - Server time: ${syncData.serverTime}`);
    console.log(`      - Has more: ${syncData.hasMore}\n`);

    if (syncData.changes && syncData.changes.length > 0) {
      console.log('   📝 Sample changes:');
      syncData.changes.slice(0, 3).forEach((change, i) => {
        console.log(`      ${i + 1}. ${change.type} ${change.collection} (${change.mongoId?.substring(0, 8)}...)`);
      });
      console.log('');
    }

    // Test 6: Test with recent timestamp
    console.log('6. Testing incremental sync (changes in last hour)...');
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const incrementalRes = await fetch(`${backendUrl}/api/sync/pull?since=${oneHourAgo}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const incrementalData = await incrementalRes.json();
    console.log(`   ✅ Incremental sync returned ${incrementalData.count} recent changes\n`);

    await mongoose.disconnect();
    console.log('✅ All tests passed! Sync system is working correctly.\n');
    console.log('Next steps:');
    console.log('  1. Test in Electron: npm run electron:dev');
    console.log('  2. Build EXE: npm run electron:build');
    console.log('  3. Read SYNC_IMPLEMENTATION.md for usage guide');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testSyncEndpoint();
