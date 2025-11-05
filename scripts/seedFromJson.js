const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Define Plan schema directly
const planSchema = new mongoose.Schema({
  plan_name: { type: String, required: true, trim: true },
  total_value: { type: Number, required: true, min: 0 },
  months: { type: Number, required: true, min: 1 },
  data: [{
    month_number: { type: Number, required: true, min: 1 },
    installment_amount: { type: Number, required: true, min: 0 },
    dividend: { type: Number, required: true, min: 0 },
    payable_amount: { type: Number, required: true, min: 0 }
  }]
}, { timestamps: true });

const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema);

// Database connection
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://nick:password01@cluster0.alwoity.mongodb.net/invoify');
    console.log('MongoDB connected for seeding');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function seedFromJson() {
  try {
    await connectDB();
    
    // Read plans from JSON file
    const jsonPath = path.join(__dirname, '..', 'plans.json');
    const jsonData = fs.readFileSync(jsonPath, 'utf8');
    const plansFromJson = JSON.parse(jsonData);
    
    console.log(`Found ${plansFromJson.length} plans in plans.json`);
    
    // Clear existing plans
    await Plan.deleteMany({});
    console.log('Existing plans cleared from MongoDB');
    
    // Insert plans from JSON
    const insertedPlans = await Plan.insertMany(plansFromJson);
    console.log(`${insertedPlans.length} plans seeded successfully from plans.json`);
    
    // Display inserted plans
    insertedPlans.forEach(plan => {
      console.log(`- ${plan.plan_name}: ${plan.months} months, ₹${plan.total_value.toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('Error seeding plans:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

seedFromJson();
