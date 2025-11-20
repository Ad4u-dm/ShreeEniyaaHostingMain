import dotenv from 'dotenv';
// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import connectDB from '../lib/mongodb';
import User from '../models/User';
import { hashPassword } from '../lib/auth';

async function addAdminUser() {
  try {
    await connectDB();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@chitfund.com' });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email: admin@chitfund.com');
      console.log('Password: admin123');
      return;
    }

    // Create admin user
    console.log('Creating admin user...');

    const adminPassword = await hashPassword('admin123');

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

    console.log('Admin user created successfully!');
    console.log('Email: admin@chitfund.com');
    console.log('Password: admin123');
    console.log('Role: admin');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    process.exit(0);
  }
}

addAdminUser();