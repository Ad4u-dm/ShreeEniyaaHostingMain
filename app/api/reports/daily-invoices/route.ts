import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // Format: YYYY-MM-DD
    if (!date) {
      return NextResponse.json({ success: false, error: 'Date is required (YYYY-MM-DD)' }, { status: 400 });
    }
    // Get start and end of the day
    const startDate = new Date(date + 'T00:00:00.000Z');
    const endDate = new Date(date + 'T23:59:59.999Z');

    // Find all invoices created on this date and populate planId
    const invoices = await Invoice.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('planId', 'planName').lean();

    // Collect all userIds and staffIds
    const userIds = invoices.map(inv => inv.customerId);
    const staffIds = invoices.map(inv => inv.createdBy);

    // Fetch user and staff details
    const users = await User.find({ userId: { $in: userIds } }).select('userId name');
    const staffs = await User.find({ userId: { $in: staffIds } }).select('userId name');
    const userMap = new Map(users.map(u => [u.userId, u.name]));
    const staffMap = new Map(staffs.map(s => [s.userId, s.name]));

    // Build report rows
    const report = invoices.map(inv => ({
      userName: userMap.get(inv.customerId) || inv.customerDetails?.name || 'Unknown',
      paymentMade: inv.receivedAmount || inv.totalAmount || 0,
      staffName: staffMap.get(inv.createdBy) || 'Unknown',
      invoiceNumber: inv.invoiceNumber || inv.receiptNo || 'N/A',
      groupName: (inv.planId && typeof inv.planId === 'object' && inv.planId.planName)
        ? inv.planId.planName
        : (inv.planDetails?.planName || 'N/A')
    }));

    return NextResponse.json({ success: true, date, report });
  } catch (error) {
    console.error('Daily invoice report error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 });
  }
}
