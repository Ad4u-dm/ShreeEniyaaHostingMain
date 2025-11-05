import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import ChitPlan from '@/models/ChitPlan';

export async function GET() {
  try {
    await connectDB();
    
    // Get sample data for testing the invoice system
    const enrollments = await Enrollment.find({
      assignedStaff: 'staff_001' // Simulated staff ID
    })
    .populate('userId')
    .populate('planId')
    .limit(10);

    const invoiceTestData = enrollments.map(enrollment => ({
      enrollmentId: enrollment._id,
      customerName: enrollment.userId?.name || 'Unknown',
      customerEmail: enrollment.userId?.email || 'no-email@example.com',
      planName: enrollment.planId?.planName || 'Unknown Plan',
      monthlyAmount: enrollment.planId?.monthlyAmount || 0,
      memberNumber: enrollment.memberNumber,
      status: enrollment.status,
      totalPaid: enrollment.totalPaid
    }));

    return NextResponse.json({
      success: true,
      message: 'ChitFund Invoice Integration Test Data',
      testData: invoiceTestData,
      instructions: {
        step1: 'Use the enrollmentId to create an invoice via POST /api/chitfund/invoice',
        step2: 'Set action: "create" in the request body',
        step3: 'Use action: "generate_pdf" to download PDF',
        step4: 'Use action: "send_email" to send via email',
        step5: 'Use action: "bulk_create" for multiple invoices'
      },
      sampleRequest: {
        method: 'POST',
        url: '/api/chitfund/invoice',
        body: {
          enrollmentId: invoiceTestData[0]?.enrollmentId,
          action: 'create',
          options: {
            includeLateFee: true,
            notes: 'Test invoice'
          }
        }
      }
    });

  } catch (error) {
    console.error('Test data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test data' },
      { status: 500 }
    );
  }
}