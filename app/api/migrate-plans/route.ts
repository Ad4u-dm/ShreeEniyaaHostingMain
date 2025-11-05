import { NextRequest, NextResponse } from 'next/server';
import getMongoURI from '@/lib/mongodb';
import mongoose from 'mongoose';
import Plan from '@/models/Plan';

export async function POST(request: NextRequest) {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chitfund';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoURI);
    }

    // Get old format plans
    const OldPlan = mongoose.model('OldPlan', new mongoose.Schema({}, { strict: false }), 'plans');
    const oldPlans = await OldPlan.find({});

    console.log(`Found ${oldPlans.length} old format plans to migrate`);

    const migratedPlans = [];

    for (const oldPlan of oldPlans) {
      // Convert old format to new format
      const monthlyData = oldPlan.data.map((monthData: any) => ({
        monthNumber: monthData.month_number,
        installmentAmount: monthData.installment_amount,
        dividend: monthData.dividend,
        payableAmount: monthData.payable_amount
      }));

      // Calculate average monthly amount
      const totalPayable = monthlyData.reduce((sum: number, month: any) => sum + month.payableAmount, 0);
      const monthlyAmount = Math.round(totalPayable / monthlyData.length);

      const newPlan = {
        planName: oldPlan.plan_name,
        totalAmount: oldPlan.total_value,
        duration: oldPlan.months,
        monthlyData: monthlyData,
        monthlyAmount: monthlyAmount,
        planType: oldPlan.planType || 'monthly',
        totalMembers: oldPlan.totalMembers || 20,
        commissionRate: oldPlan.commissionRate || 5,
        processingFee: oldPlan.processingFee || 0,
        status: oldPlan.status || 'active',
        auctionDay: oldPlan.auctionDay || 1,
        auctionTime: oldPlan.auctionTime || '10:00',
        description: `Migrated from old format: ${oldPlan.plan_name}`,
        createdBy: null // Will be null for migrated plans
      };

      // Check if plan already exists in new format
      const existingPlan = await Plan.findOne({ planName: newPlan.planName });
      if (!existingPlan) {
        const savedPlan = new Plan(newPlan);
        await savedPlan.save();
        migratedPlans.push(newPlan.planName);
        console.log(`Migrated: ${newPlan.planName}`);
      } else {
        console.log(`Skipped (already exists): ${newPlan.planName}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed successfully`,
      migratedPlans: migratedPlans,
      totalMigrated: migratedPlans.length
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}