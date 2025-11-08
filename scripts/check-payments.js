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
const PaymentSchema = new mongoose.Schema({
  userId: String,
  amount: Number,
  paymentDate: Date,
  status: String,
  paymentMethod: String,
  installmentNumber: Number
}, { collection: 'payments' });

const UserSchema = new mongoose.Schema({
  userId: String,
  name: String,
  email: String
}, { collection: 'users' });

const Payment = mongoose.model('Payment', PaymentSchema);
const User = mongoose.model('User', UserSchema);

async function checkPaymentsData() {
  try {
    console.log('Checking payments data...\n');
    
    // Get all payments
    const payments = await Payment.find({}).lean();
    console.log(`Total payments in database: ${payments.length}`);
    
    if (payments.length > 0) {
      // Group payments by user
      const paymentsByUser = {};
      
      for (const payment of payments) {
        if (!paymentsByUser[payment.userId]) {
          paymentsByUser[payment.userId] = [];
        }
        paymentsByUser[payment.userId].push(payment);
      }
      
      console.log('\nPayments by user:');
      for (const [userId, userPayments] of Object.entries(paymentsByUser)) {
        const user = await User.findOne({ 
          $or: [
            { userId: userId },
            { _id: userId }
          ]
        }).lean();
        
        const totalAmount = userPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const userName = user ? user.name : 'Unknown User';
        
        console.log(`- ${userName} (${userId}): ${userPayments.length} payments, Total: ₹${totalAmount.toLocaleString('en-IN')}`);
        
        // Show recent payments
        const recentPayments = userPayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).slice(0, 3);
        recentPayments.forEach(p => {
          console.log(`  - ₹${p.amount} on ${new Date(p.paymentDate).toLocaleDateString('en-IN')} (${p.paymentMethod || 'unknown'})`);
        });
        console.log('');
      }
    }
    
    // Check for any payments created recently
    const recentPayments = await Payment.find({
      paymentDate: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).lean();
    
    console.log(`\nPayments created in last 24 hours: ${recentPayments.length}`);
    
  } catch (error) {
    console.error('Error checking payments:', error);
  }
}

async function main() {
  await connectDB();
  await checkPaymentsData();
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

main().catch(console.error);