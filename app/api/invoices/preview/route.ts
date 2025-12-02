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

    // Find enrollment using correct field names (userId and planId)
    const enrollment = await Enrollment.findOne({
      userId: customerId,
      planId: planId,
      status: "active",
    }).populate("planId");

    if (!enrollment) {
      return NextResponse.json(
        { error: "No active enrollment found for this customer and plan" },
        { status: 404 }
      );
    }

    const plan = enrollment.planId as any;

    console.log('🔍 PREVIEW API - Enrollment Data:', {
      enrollmentId: enrollment._id,
      userId: enrollment.userId,
      planId: enrollment.planId._id,
      enrollmentDate: enrollment.enrollmentDate,
      startDate: enrollment.startDate,
      status: enrollment.status,
      currentArrear: enrollment.currentArrear,
      arrearLastUpdated: enrollment.arrearLastUpdated
    });

    // STEP 1: Calculate due number using the same logic as invoice creation
    // Use startDate (when plan starts) not enrollmentDate (when they signed up)
    const enrollmentDate = new Date(enrollment.startDate);
    
    console.log('🔍 PREVIEW API - Date Calculation:', {
      enrollmentStartDate: enrollment.startDate,
      enrollmentDateParsed: enrollmentDate.toISOString(),
      invoiceDate: invoiceDate.toISOString(),
      invoiceDateInput: invoiceDateStr
    });
    
    let dueNumber: number;
    
    try {
      dueNumber = calculateDueNumber(enrollmentDate, invoiceDate, plan.duration);
      console.log('🔍 PREVIEW API - Calculated Due Number:', dueNumber);
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
    // RE-FETCH enrollment to ensure we have the latest currentArrear value
    const freshEnrollment = await Enrollment.findById(enrollment._id);
    
    console.log('🔄 Preview API - Fresh Enrollment Data:', {
      enrollmentId: freshEnrollment?._id,
      currentArrear: freshEnrollment?.currentArrear,
      arrearLastUpdated: freshEnrollment?.arrearLastUpdated
    });
    
    // Pass fresh enrollment object to check currentArrear field (manual update or clear)
    const arrearAmount = await calculateArrearAmount(enrollment._id, Invoice, invoiceDate, freshEnrollment);

    // STEP 4: Get previous invoice for balance calculation
    const currentDay = invoiceDate.getDate();
    
    // Get the most recent invoice for this enrollment
    // Use createdAt for sorting to handle multiple invoices on same date
    const previousInvoice = await Invoice.findOne({
      enrollmentId: enrollment._id
    })
      .sort({ createdAt: -1 })
      .limit(1)
      .lean();

    console.log('📊 Preview API - Previous Invoice:', {
      found: !!previousInvoice,
      invoiceId: previousInvoice?.invoiceId,
      balanceAmount: previousInvoice?.balanceAmount,
      createdAt: previousInvoice?.createdAt
    });

    // For first invoice on non-21st day, use due amount as the starting balance
    let previousBalance: number;
    if (!previousInvoice && currentDay !== 21) {
      previousBalance = calculatedDueAmount;
    } else {
      previousBalance = previousInvoice ? (previousInvoice.balanceAmount || 0) : 0;
    }

    // STEP 5: Calculate balance amount using helper function
    const receivedArrearAmount = 0; // Preview doesn't have received arrear amount yet
    const balanceAmount = calculateBalanceAmount(
      calculatedDueAmount,
      arrearAmount,
      receivedAmount,
      invoiceDate,
      previousBalance,
      receivedArrearAmount
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
