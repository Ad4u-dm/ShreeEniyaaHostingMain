/**
 * Invoice utility functions
 * Handles dueNumber calculation with 20th cut-off rule
 */

/**
 * Calculate dueNumber based on enrollment date and invoice date
 * Special rule for due 1: cutoff is last day of enrollment month
 * For due 2+: cutoff is 20th of each month
 *
 * @param enrollmentDate - Date when user enrolled in the plan
 * @param invoiceDate - Date of the invoice (when admin creates it)
 * @param planDuration - Total duration of the plan in months
 * @returns dueNumber (1-based index)
 * @throws Error if dueNumber is invalid
 */
export function calculateDueNumber(
  enrollmentDate: Date,
  invoiceDate: Date,
  planDuration: number
): number {
  // Normalize dates to start of day for consistent comparison
  // Handle timezone issues by ensuring we work with local dates
  const enrollment = new Date(enrollmentDate);
  const enrollmentLocal = new Date(
    enrollment.getFullYear(),
    enrollment.getMonth(),
    enrollment.getDate(),
    0, 0, 0, 0
  );

  const invoice = new Date(invoiceDate);
  const invoiceLocal = new Date(
    invoice.getFullYear(),
    invoice.getMonth(),
    invoice.getDate(),
    0, 0, 0, 0
  );

  // Step 1: Check if this is in the same month as enrollment (potential due 1)
  const enrollYear = enrollmentLocal.getFullYear();
  const enrollMonth = enrollmentLocal.getMonth();
  const invoiceYear = invoiceLocal.getFullYear();
  const invoiceMonth = invoiceLocal.getMonth();

  const isSameMonthAsEnrollment = (enrollYear === invoiceYear && enrollMonth === invoiceMonth);

  // Step 2: Determine effective billing month based on cutoff rules
  let effectiveDate = new Date(invoiceLocal);

  if (isSameMonthAsEnrollment) {
    // Special case: First month (due 1)
    // Cutoff is last day of enrollment month
    const lastDayOfEnrollmentMonth = new Date(enrollYear, enrollMonth + 1, 0).getDate();
    
    if (invoiceLocal.getDate() > lastDayOfEnrollmentMonth) {
      // After last day, count as next month
      effectiveDate.setMonth(effectiveDate.getMonth() + 1);
      effectiveDate.setDate(1);
    }
    // Otherwise, stays as enrollment month (due 1)
  } else {
    // Standard case: Due 2 onwards
    // Cutoff is 20th of the month
    if (invoiceLocal.getDate() > 20) {
      // After 20th, count as next month's installment
      effectiveDate.setMonth(effectiveDate.getMonth() + 1);
      effectiveDate.setDate(1);
    }
  }

  // Step 3: Calculate months difference
  const effectiveYear = effectiveDate.getFullYear();
  const effectiveMonth = effectiveDate.getMonth();

  const monthsDiff = (effectiveYear - enrollYear) * 12 + (effectiveMonth - enrollMonth);

  // Step 4: Calculate dueNumber (1-based)
  const dueNumber = monthsDiff + 1;

  // Step 4: Validate dueNumber
  if (dueNumber < 1) {
    const enrollDateStr = `${enrollmentLocal.getFullYear()}-${String(enrollmentLocal.getMonth() + 1).padStart(2, '0')}-${String(enrollmentLocal.getDate()).padStart(2, '0')}`;
    const invoiceDateStr = `${invoiceLocal.getFullYear()}-${String(invoiceLocal.getMonth() + 1).padStart(2, '0')}-${String(invoiceLocal.getDate()).padStart(2, '0')}`;
    throw new Error(
      `Invalid due number: ${dueNumber}. Invoice date (${invoiceDateStr}) ` +
      `cannot be before enrollment date (${enrollDateStr})`
    );
  }

  if (dueNumber > planDuration) {
    throw new Error(
      `Installment number (${dueNumber}) exceeds plan duration (${planDuration} months). ` +
      `This plan has completed all installments.`
    );
  }

  const enrollDateStr = `${enrollmentLocal.getFullYear()}-${String(enrollmentLocal.getMonth() + 1).padStart(2, '0')}-${String(enrollmentLocal.getDate()).padStart(2, '0')}`;
  const invoiceDateStr = `${invoiceLocal.getFullYear()}-${String(invoiceLocal.getMonth() + 1).padStart(2, '0')}-${String(invoiceLocal.getDate()).padStart(2, '0')}`;
  const effectiveDateStr = `${effectiveDate.getFullYear()}-${String(effectiveDate.getMonth() + 1).padStart(2, '0')}-${String(effectiveDate.getDate()).padStart(2, '0')}`;
  
  console.log('DueNumber calculation:', {
    enrollmentDate: enrollDateStr,
    invoiceDate: invoiceDateStr,
    invoiceDateDay: invoiceLocal.getDate(),
    isSameMonthAsEnrollment,
    cutoffRule: isSameMonthAsEnrollment ? 'Last day of month (due 1)' : '20th of month (due 2+)',
    effectiveDate: effectiveDateStr,
    monthsDiff,
    dueNumber,
    planDuration
  });

  return dueNumber;
}

/**
 * Format payment month from invoice date
 * Returns format like "January 2025"
 */
export function formatPaymentMonth(invoiceDate: Date): string {
  const date = new Date(invoiceDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // If invoice is after 20th, payment is for next month
  if (date.getDate() > 20) {
    date.setMonth(date.getMonth() + 1);
  }

  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Calculate arrear amount from previous invoice for the same enrollment
 *
 * Priority Logic:
 * 1. Check enrollment.currentArrear (manually updated via "Update Arrears" button)
 * 2. Check previous invoice balance (automatic calculation)
 * 3. Return 0 if no previous invoice
 *
 * On 21st: arrear = previous invoice's balance
 * On other days: arrear = previous invoice's arrear
 */
export async function calculateArrearAmount(
  enrollmentId: string,
  InvoiceModel: any,
  currentInvoiceDate: Date,
  enrollment?: any // Optional: pass enrollment to check currentArrear
): Promise<number> {
  
  console.log('🔍 calculateArrearAmount called with:', {
    enrollmentId,
    hasEnrollment: !!enrollment,
    enrollmentCurrentArrear: enrollment?.currentArrear,
    enrollmentArrearLastUpdated: enrollment?.arrearLastUpdated
  });

  // PRIORITY 1: Check manually updated arrear (from "Update Arrears" button or "Clear Arrear" button)
  // If arrearLastUpdated exists, it means the arrear was manually set (even if set to 0)
  if (enrollment?.arrearLastUpdated) {
    console.log('✅ Arrear calculation (Manual Update - Priority 1):', {
      enrollmentId,
      currentArrear: enrollment.currentArrear || 0,
      lastUpdated: enrollment.arrearLastUpdated,
      source: 'Manual update via Update Arrears or Clear Arrear button'
    });
    return enrollment.currentArrear || 0;
  }

  // PRIORITY 2: Check previous invoice (existing automatic logic)
  const currentDay = currentInvoiceDate.getDate();

  // Find the most recent previous invoice for this enrollment before current invoice date
  const previousInvoice = await InvoiceModel.findOne({
    enrollmentId: enrollmentId,
    invoiceDate: { $lt: currentInvoiceDate }
  })
    .sort({ invoiceDate: -1 })
    .limit(1)
    .lean();

  if (!previousInvoice) {
    console.log('Arrear calculation: No previous invoice found, arrear = 0');
    return 0;
  }

  let arrearAmount: number;

  // On 21st: Reset arrear from previous balance
  if (currentDay === 21) {
    arrearAmount = previousInvoice.balanceAmount || 0;
    console.log('Arrear calculation (21st - Reset from balance):', {
      enrollmentId,
      currentInvoiceDate: currentInvoiceDate.toISOString().split('T')[0],
      previousInvoiceDate: new Date(previousInvoice.invoiceDate).toISOString().split('T')[0],
      previousBalance: previousInvoice.balanceAmount || 0,
      arrearAmount,
      formula: 'arrear = previous.balance'
    });
  }
  // On other days: Carry forward previous arrear
  else {
    arrearAmount = previousInvoice.arrearAmount || 0;
    console.log('Arrear calculation (Other days - Carry forward):', {
      enrollmentId,
      currentInvoiceDate: currentInvoiceDate.toISOString().split('T')[0],
      previousInvoiceDate: new Date(previousInvoice.invoiceDate).toISOString().split('T')[0],
      previousArrear: previousInvoice.arrearAmount || 0,
      arrearAmount,
      formula: 'arrear = previous.arrear'
    });
  }

  return arrearAmount;
}

/**
 * Calculate balance amount based on invoice date (21st rule)
 *
 * On 21st of every month:
 *   Balance = (Monthly Due + Arrear) - Received Amount
 *
 * On other days (1st-20th, 22nd-31st):
 *   Balance = Previous Balance - Received Amount
 *   (Note: For first invoice, previousBalance starts at 0, so balance = 0 - received,
 *    but the due amount is used as the starting balance in the UI)
 */
export function calculateBalanceAmount(
  dueAmount: number,
  arrearAmount: number,
  receivedAmount: number,
  invoiceDate: Date,
  previousBalance: number = 0
): number {
  const currentDay = invoiceDate.getDate();
  let balanceAmount: number;

  // On 21st: Reset balance with new monthly due + arrear
  if (currentDay === 21) {
    balanceAmount = (dueAmount + arrearAmount) - receivedAmount;
    console.log('Balance calculation (21st - Reset):', {
      dueAmount,
      arrearAmount,
      receivedAmount,
      balanceAmount,
      formula: '(dueAmount + arrearAmount) - receivedAmount'
    });
  }
  // On other days (1st-20th, 22nd-31st): Use previous balance
  else {
    balanceAmount = previousBalance - receivedAmount;
    console.log('Balance calculation (Other days):', {
      previousBalance,
      receivedAmount,
      balanceAmount,
      formula: 'previousBalance - receivedAmount'
    });
  }

  return balanceAmount;
}
