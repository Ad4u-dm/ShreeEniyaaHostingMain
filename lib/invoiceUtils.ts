/**
 * Invoice utility functions
 * Handles dueNumber calculation with 20th cut-off rule
 */

/**
 * Calculate dueNumber based on enrollment date and invoice date
 * Uses the 20th cut-off rule: after the 20th, consider it next month's installment
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
  const enrollment = new Date(enrollmentDate);
  enrollment.setHours(0, 0, 0, 0);

  const invoice = new Date(invoiceDate);
  invoice.setHours(0, 0, 0, 0);

  // Step 1: Determine effective billing month based on 20th cut-off
  let effectiveDate = new Date(invoice);

  if (invoice.getDate() > 20) {
    // After 20th, count as next month's installment
    // Set to first day of next month
    effectiveDate.setMonth(effectiveDate.getMonth() + 1);
    effectiveDate.setDate(1);
  }

  // Step 2: Calculate months difference
  const enrollYear = enrollment.getFullYear();
  const enrollMonth = enrollment.getMonth(); // 0-indexed (0 = January)

  const effectiveYear = effectiveDate.getFullYear();
  const effectiveMonth = effectiveDate.getMonth();

  const monthsDiff = (effectiveYear - enrollYear) * 12 + (effectiveMonth - enrollMonth);

  // Step 3: Calculate dueNumber (1-based)
  const dueNumber = monthsDiff + 1;

  // Step 4: Validate dueNumber
  if (dueNumber < 1) {
    throw new Error(
      `Invalid due number: ${dueNumber}. Invoice date (${invoice.toISOString().split('T')[0]}) ` +
      `cannot be before enrollment date (${enrollment.toISOString().split('T')[0]})`
    );
  }

  if (dueNumber > planDuration) {
    throw new Error(
      `Installment number (${dueNumber}) exceeds plan duration (${planDuration} months). ` +
      `This plan has completed all installments.`
    );
  }

  console.log('DueNumber calculation:', {
    enrollmentDate: enrollment.toISOString().split('T')[0],
    invoiceDate: invoice.toISOString().split('T')[0],
    invoiceDateDay: invoice.getDate(),
    effectiveDate: effectiveDate.toISOString().split('T')[0],
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
 * On 21st: arrear = previous invoice's balance
 * On other days: arrear = previous invoice's arrear
 */
export async function calculateArrearAmount(
  enrollmentId: string,
  InvoiceModel: any,
  currentInvoiceDate: Date
): Promise<number> {
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
