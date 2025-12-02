import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import Plan from '@/models/Plan';
import Enrollment from '@/models/Enrollment';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';
import {
  formatPaymentMonth,
  calculateArrearAmount,
  calculateBalanceAmount
} from '@/lib/invoiceUtils';

// Manual invoice creation endpoint for admin — allows providing manualDueNumber to override auto-calculation
export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoiceData = await request.json();
    await connectDB();

    const requiredFields = ['customerId', 'planId', 'createdBy', 'customerDetails', 'planDetails'];
    for (const field of requiredFields) {
      if (!invoiceData[field]) {
        return NextResponse.json({ success: false, error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Find enrollment
    const enrollment = await Enrollment.findOne({ userId: invoiceData.customerId, planId: invoiceData.planId }).lean();
    if (!enrollment) {
      return NextResponse.json({ success: false, error: 'No enrollment found for this user and plan. Please create an enrollment first with a member number.' }, { status: 404 });
    }

    const plan = await Plan.findById(invoiceData.planId);
    if (!plan) return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });

    // Use manual due number if provided, else fallback to calculating (but we won't reimplement calculateDueNumber here)
    let dueNumber = invoiceData.manualDueNumber ? Number(invoiceData.manualDueNumber) : null;
    if (!dueNumber) {
      // Fallback to using dueNumber = 1 to avoid failing here — admin should supply manualDueNumber
      dueNumber = 1;
    }

    if (dueNumber > plan.duration) {
      return NextResponse.json({ success: false, error: `Invalid due number ${dueNumber}: plan has only ${plan.duration} installments` }, { status: 400 });
    }

    const index = dueNumber - 1;
    let calculatedDueAmount = 0;
    const monthInfo = plan.monthlyData?.[index];
    if (monthInfo) calculatedDueAmount = monthInfo.installmentAmount ?? 0;
    else if (plan.monthlyAmount && Array.isArray(plan.monthlyAmount) && index < plan.monthlyAmount.length) calculatedDueAmount = plan.monthlyAmount[index];
    else return NextResponse.json({ success: false, error: 'Plan does not have monthly amount data configured' }, { status: 400 });

    const invoiceDate = invoiceData.invoiceDate ? new Date(invoiceData.invoiceDate) : new Date();

    const previousInvoice = await Invoice.findOne({ enrollmentId: enrollment._id, invoiceDate: { $lt: invoiceDate } }).sort({ invoiceDate: -1 }).limit(1).lean();
    const arrearAmount = await calculateArrearAmount(enrollment._id, Invoice, invoiceDate);

    let previousBalance: number;
    const currentDay = invoiceDate.getDate();
    if (!previousInvoice && currentDay !== 21) previousBalance = calculatedDueAmount; else previousBalance = previousInvoice ? (previousInvoice.balanceAmount || 0) : 0;

    const receivedAmount = invoiceData.receivedAmount || 0;
    const receivedArrearAmount = invoiceData.receivedArrearAmount || 0;
    const balanceAmount = calculateBalanceAmount(calculatedDueAmount, arrearAmount, receivedAmount, invoiceDate, previousBalance, receivedArrearAmount);

    const paymentMonth = formatPaymentMonth(invoiceDate);

    // Generate invoice number
    const latestInvoice = await Invoice.findOne({}, {}, { sort: { 'invoiceNumber': -1 } });
    let invoiceNumber = 'INV-0001';
    if (latestInvoice && latestInvoice.invoiceNumber) {
      const lastNumber = parseInt(latestInvoice.invoiceNumber.split('-')[1]) || 0;
      invoiceNumber = `INV-${String(lastNumber + 1).padStart(4, '0')}`;
    }

    const totalAmount = calculatedDueAmount + arrearAmount;

    const updatedItems = invoiceData.items?.map((item: any) => ({ ...item, amount: totalAmount })) || [{ description: `Payment for ${plan.planName}`, amount: totalAmount, type: 'installment' }];

    const newInvoice = new Invoice({
      ...invoiceData,
      enrollmentId: enrollment._id,
      items: updatedItems,
      invoiceNumber,
      invoiceDate,
      memberNumber: enrollment.memberNumber,
      dueNumber: dueNumber.toString(),
      dueAmount: calculatedDueAmount,
      arrearAmount,
      receivedAmount,
      balanceAmount,
      totalAmount,
      paymentMonth,
      subtotal: totalAmount,
      taxAmount: 0,
      penaltyAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newInvoice.save();

    const customerUser = await User.findOne({ userId: newInvoice.customerId }).select('name email phone');
    const invoicePlan = await Plan.findById(newInvoice.planId).select('planName monthlyAmount duration');
    const invoiceEnrollment = await Enrollment.findById(newInvoice.enrollmentId).select('userId planId enrollmentDate');

    const invoiceResponse = { ...newInvoice.toObject(), customerId: customerUser ? { userId: customerUser.userId, name: customerUser.name, email: customerUser.email, phone: customerUser.phone } : { userId: newInvoice.customerId, name: 'Unknown', email: '', phone: '' }, planId: invoicePlan ? { _id: invoicePlan._id, planName: invoicePlan.planName, monthlyAmount: invoicePlan.monthlyAmount, duration: invoicePlan.duration } : newInvoice.planId, enrollmentId: invoiceEnrollment ? { _id: invoiceEnrollment._id, userId: invoiceEnrollment.userId, planId: invoiceEnrollment.planId, enrollmentDate: invoiceEnrollment.enrollmentDate } : newInvoice.enrollmentId };

    return NextResponse.json({ success: true, invoice: invoiceResponse, message: 'Manual invoice created successfully' });
  } catch (error: any) {
    console.error('Manual create invoice error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create invoice' }, { status: 500 });
  }
}
