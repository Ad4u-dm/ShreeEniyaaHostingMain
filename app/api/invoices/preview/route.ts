import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import Enrollment from '@/models/Enrollment';
import Plan from '@/models/Plan';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';
import {
  calculateDueNumber,
  calculateArrearAmount,
  calculateBalanceAmount
} from '@/lib/invoiceUtils';

/**
 * GET /api/invoices/preview
 * Calculate invoice preview values using the same logic as invoice creation
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get user from token
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user has minimum role (staff)
    if (!hasMinimumRole(user, "staff")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");
    const planId = searchParams.get("planId");
    const receivedAmountStr = searchParams.get("receivedAmount");
    const invoiceDateStr = searchParams.get("invoiceDate");

    if (!customerId || !planId) {
      return NextResponse.json(
        { error: "customerId and planId are required" },
        { status: 400 }
      );
    }

    const receivedAmount = receivedAmountStr ? parseFloat(receivedAmountStr) : 0;
    const invoiceDate = invoiceDateStr ? new Date(invoiceDateStr) : new Date();

    // Find enrollment
    const enrollment = await Enrollment.findOne({
      customer: customerId,
      plan: planId,
      status: "active",
    }).populate("plan");

    if (!enrollment) {
      return NextResponse.json(
        { error: "No active enrollment found for this customer and plan" },
        { status: 404 }
      );
    }

    const plan = enrollment.plan as any;

    // STEP 1: Calculate due number using the same logic as invoice creation
    const enrollmentDate = new Date(enrollment.enrollmentDate);
    let dueNumber: number;
    
    try {
      dueNumber = calculateDueNumber(enrollmentDate, invoiceDate, plan.duration);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // STEP 2: Calculate due amount from monthlyData based on dueNumber
    const index = dueNumber - 1;
    let calculatedDueAmount = 0;

    const monthInfo = plan.monthlyData?.[index];
    if (monthInfo) {
      calculatedDueAmount = monthInfo.installmentAmount ?? 0;
    } else if (plan.monthlyAmount) {
      if (Array.isArray(plan.monthlyAmount) && index < plan.monthlyAmount.length) {
        calculatedDueAmount = plan.monthlyAmount[index];
      } else if (typeof plan.monthlyAmount === "number") {
        calculatedDueAmount = plan.monthlyAmount;
      }
    }

    // STEP 3: Calculate arrear amount using helper function
    const arrearAmount = await calculateArrearAmount(enrollment._id, Invoice, invoiceDate);

    // STEP 4: Get previous invoice for balance calculation
    const currentDay = invoiceDate.getDate();
    const previousInvoice = await Invoice.findOne({
      enrollmentId: enrollment._id,
      invoiceDate: { $lt: invoiceDate }
    })
      .sort({ invoiceDate: -1 })
      .limit(1)
      .lean();

    // For first invoice on non-21st day, use due amount as the starting balance
    let previousBalance: number;
    if (!previousInvoice && currentDay !== 21) {
      previousBalance = calculatedDueAmount;
    } else {
      previousBalance = previousInvoice ? (previousInvoice.balanceAmount || 0) : 0;
    }

    // STEP 5: Calculate balance amount using helper function
    const balanceAmount = calculateBalanceAmount(
      calculatedDueAmount,
      arrearAmount,
      receivedAmount,
      invoiceDate,
      previousBalance
    );

    const totalDue = calculatedDueAmount + arrearAmount;

    return NextResponse.json({
      success: true,
      preview: {
        dueNumber,
        dueAmount: calculatedDueAmount,
        arrearAmount,
        totalDue,
        receivedAmount,
        balanceAmount,
      },
    });
  } catch (error: any) {
    console.error("Error calculating invoice preview:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate preview" },
      { status: 500 }
    );
  }
}
