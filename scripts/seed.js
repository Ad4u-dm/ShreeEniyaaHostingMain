import connectDB from '../lib/mongodb';
import User from '../models/User';
import ChitPlan from '../models/ChitPlan';
import Enrollment from '../models/Enrollment';
import Payment from '../models/Payment';
import { hashPassword } from '../lib/auth';

async function seedDatabase() {
  try {
    await connectDB();
    
    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await ChitPlan.deleteMany({});
    await Enrollment.deleteMany({});
    await Payment.deleteMany({});
    
    // Create demo users
    console.log('Creating demo users...');
    
    const adminPassword = await hashPassword('admin123');
    const staffPassword = await hashPassword('staff123');
    const userPassword = await hashPassword('user123');
    
    const admin = new User({
      email: 'admin@chitfund.com',
      password: adminPassword,
      name: 'Admin User',
      phone: '+91-9876543210',
      role: 'admin',
      address: {
        street: '123 Admin Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001'
      }
    });
    await admin.save();
    
    const staff1 = new User({
      email: 'staff@chitfund.com',
      password: staffPassword,
      name: 'Rajesh Kumar',
      phone: '+91-9876543211',
      role: 'staff',
      employeeId: 'EMP001',
      assignedBy: admin._id,
      address: {
        street: '456 Staff Colony',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400002'
      }
    });
    await staff1.save();
    
    const staff2 = new User({
      email: 'staff2@chitfund.com',
      password: staffPassword,
      name: 'Priya Sharma',
      phone: '+91-9876543212',
      role: 'staff',
      employeeId: 'EMP002',
      assignedBy: admin._id,
      address: {
        street: '789 Staff Residency',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400003'
      }
    });
    await staff2.save();
    
    // Create demo customers
    const customers = [];
    for (let i = 1; i <= 10; i++) {
      const customer = new User({
        email: `user${i}@example.com`,
        password: userPassword,
        name: `Customer ${i}`,
        phone: `+91-987654321${i}`,
        role: 'user',
        address: {
          street: `${i}00 Customer Street`,
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: `40000${i}`
        }
      });
      await customer.save();
      customers.push(customer);
    }
    
    // Create main user account
    const mainUser = new User({
      email: 'user@chitfund.com',
      password: userPassword,
      name: 'John Doe',
      phone: '+91-9876543220',
      role: 'user',
      address: {
        street: '100 Main Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400010'
      }
    });
    await mainUser.save();
    customers.push(mainUser);
    
    console.log('Creating chit plans...');
    
    // Create demo chit plans
    const plans = [];
    
    const plan1 = new ChitPlan({
      planName: 'Monthly Savings Plan - 50K',
      planType: 'monthly',
      totalAmount: 50000,
      installmentAmount: 2500,
      duration: 20,
      totalMembers: 20,
      commissionRate: 5,
      processingFee: 500,
      auctionDay: 1,
      auctionTime: '10:00',
      description: 'Perfect for small savings with low monthly commitment',
      terms: 'Monthly payments required. Auction on 1st of every month.',
      createdBy: admin._id
    });
    await plan1.save();
    plans.push(plan1);
    
    const plan2 = new ChitPlan({
      planName: 'Premium Investment Plan - 1L',
      planType: 'monthly',
      totalAmount: 100000,
      installmentAmount: 5000,
      duration: 20,
      totalMembers: 20,
      commissionRate: 4,
      processingFee: 1000,
      auctionDay: 5,
      auctionTime: '11:00',
      description: 'Higher returns for serious investors',
      terms: 'Monthly payments required. Auction on 5th of every month.',
      createdBy: admin._id
    });
    await plan2.save();
    plans.push(plan2);
    
    const plan3 = new ChitPlan({
      planName: 'Quick Return Plan - 25K',
      planType: 'monthly',
      totalAmount: 25000,
      installmentAmount: 2500,
      duration: 10,
      totalMembers: 10,
      commissionRate: 6,
      processingFee: 250,
      auctionDay: 15,
      auctionTime: '14:00',
      description: 'Short-term plan with quick returns',
      terms: 'Monthly payments required. Auction on 15th of every month.',
      createdBy: admin._id
    });
    await plan3.save();
    plans.push(plan3);
    
    console.log('Creating enrollments...');
    
    // Create demo enrollments
    const enrollments = [];
    
    // Enroll customers in different plans
    for (let i = 0; i < customers.length && i < 15; i++) {
      const customer = customers[i];
      const plan = plans[i % plans.length];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (30 * (i % 3))); // Stagger start dates
      
      const endDate = new Date(startDate);
      if (plan.planType === 'monthly') {
        endDate.setMonth(endDate.getMonth() + plan.duration);
      }
      
      const enrollment = new Enrollment({
        userId: customer._id,
        planId: plan._id,
        startDate,
        endDate,
        memberNumber: (i % 20) + 1,
        totalDue: plan.totalAmount,
        nextDueDate: new Date(startDate.getFullYear(), startDate.getMonth() + 1, plan.auctionDay),
        assignedStaff: i % 2 === 0 ? staff1._id : staff2._id
      });
      
      await enrollment.save();
      enrollments.push(enrollment);
    }
    
    console.log('Creating demo payments...');
    
    // Create demo payments for some enrollments
    for (let i = 0; i < enrollments.length && i < 8; i++) {
      const enrollment = enrollments[i];
      const plan = plans.find(p => p._id.equals(enrollment.planId));
      
      if (plan) {
        // Create 1-3 payments per enrollment
        const paymentCount = Math.floor(Math.random() * 3) + 1;
        
        for (let j = 0; j < paymentCount; j++) {
          const paymentDate = new Date();
          paymentDate.setDate(paymentDate.getDate() - (30 * j) - Math.floor(Math.random() * 10));
          
          const payment = new Payment({
            enrollmentId: enrollment._id,
            userId: enrollment.userId,
            planId: enrollment.planId,
            amount: plan.installmentAmount,
            paymentMethod: ['cash', 'online', 'upi'][Math.floor(Math.random() * 3)],
            paymentType: 'installment',
            installmentNumber: j + 1,
            paidDate: paymentDate,
            collectedBy: enrollment.assignedStaff,
            collectionMethod: ['office', 'field'][Math.floor(Math.random() * 2)]
          });
          
          await payment.save();
          
          // Update enrollment totals
          enrollment.totalPaid += plan.installmentAmount;
          enrollment.totalDue -= plan.installmentAmount;
        }
        
        await enrollment.save();
      }
    }
    
    console.log('✅ Database seeded successfully!');
    console.log('Demo accounts created:');
    console.log('Admin: admin@chitfund.com / admin123');
    console.log('Staff: staff@chitfund.com / staff123');
    console.log('User: user@chitfund.com / user123');
    console.log(`Created ${customers.length} customers`);
    console.log(`Created ${plans.length} plans`);
    console.log(`Created ${enrollments.length} enrollments`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    process.exit(0);
  }
}

// Run the seed function
seedDatabase();