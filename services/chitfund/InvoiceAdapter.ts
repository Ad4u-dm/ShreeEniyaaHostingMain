import { InvoiceType, ItemType } from '@/types';

/**
 * ChitFund to Invoify Data Adapter
 * Converts ChitFund customer/payment data to Invoify invoice format
 */

interface ChitFundCustomer {
  userId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
  };
  planId: {
    planName: string;
    monthlyAmount: number;
    totalAmount: number;
    duration: number;
  };
  enrollmentId: string;
  memberNumber: number;
  status: string;
  totalPaid: number;
  overdueAmount?: number;
}

interface ChitFundPayment {
  _id: string;
  amount: number;
  installmentNumber: number;
  dueDate: Date;
  paymentType: string;
  description?: string;
}

interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  email: string;
  phone: string;
}

export class ChitFundInvoiceAdapter {
  private static companyInfo: CompanyInfo = {
    name: "Shri Iniya Chit Funds",
    address: "123 Business Street",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600001",
    email: "info@shriin iyachitfunds.com",
    phone: "+91-9876543210"
  };

  /**
   * Convert ChitFund customer data to Invoify invoice format
   */
  static createInvoiceFromCustomer(
    customer: ChitFundCustomer,
    pendingPayments: ChitFundPayment[],
    options: {
      dueDate?: Date;
      includeLateFee?: boolean;
      notes?: string;
      invoiceNumber?: string;
    } = {}
  ): InvoiceType {
    const invoiceDate = new Date();
    const dueDate = options.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    // Create invoice items from pending payments
    const items: ItemType[] = pendingPayments.map(payment => ({
      name: `${payment.paymentType.charAt(0).toUpperCase() + payment.paymentType.slice(1)} Payment`,
      description: payment.description || `Installment #${payment.installmentNumber} for ${customer.planId.planName}`,
      quantity: 1,
      unitPrice: payment.amount,
      total: payment.amount
    }));

    // Add late fee if applicable
    if (options.includeLateFee && customer.overdueAmount && customer.overdueAmount > 0) {
      items.push({
        name: "Late Payment Penalty",
        description: "Penalty for overdue payments",
        quantity: 1,
        unitPrice: customer.overdueAmount,
        total: customer.overdueAmount
      });
    }

    const subTotal = items.reduce((sum, item) => sum + item.total, 0);

    const invoice: InvoiceType = {
      sender: {
        name: this.companyInfo.name,
        address: this.companyInfo.address,
        zipCode: this.companyInfo.pincode,
        city: this.companyInfo.city,
        country: `${this.companyInfo.state}, India`,
        email: this.companyInfo.email,
        phone: this.companyInfo.phone,
        customInputs: [
          { key: "Registration No", value: "REG/CF/2023/001" },
          { key: "GST No", value: "33AABCS1234L1ZR" }
        ]
      },
      receiver: {
        name: customer.userId.name,
        address: customer.userId.address?.street || "",
        zipCode: customer.userId.address?.pincode || "",
        city: customer.userId.address?.city || "",
        country: `${customer.userId.address?.state || "Tamil Nadu"}, India`,
        email: customer.userId.email,
        phone: customer.userId.phone,
        customInputs: [
          { key: "Member ID", value: customer.enrollmentId },
          { key: "Member Number", value: customer.memberNumber.toString() },
          { key: "Plan", value: customer.planId.planName }
        ]
      },
      details: {
        invoiceLogo: "", // Will be set if logo is available
        invoiceNumber: options.invoiceNumber || this.generateInvoiceNumber(),
        invoiceDate: invoiceDate.toISOString(),
        dueDate: dueDate.toISOString(),
        purchaseOrderNumber: customer.enrollmentId,
        currency: "INR",
        language: "en", // Default to English, can be made configurable
        items: items,
        paymentInformation: {
          bankName: "State Bank of India",
          accountName: "Shri Iniya Chit Funds",
          accountNumber: "1234567890123456"
        },
        taxDetails: {
          amount: 0, // ChitFunds typically don't charge tax
          taxID: "33AABCS1234L1ZR",
          amountType: "amount"
        },
        discountDetails: {
          amount: 0,
          amountType: "amount"
        },
        shippingDetails: {
          cost: 0,
          costType: "amount"
        },
        subTotal: subTotal,
        totalAmount: subTotal,
        totalAmountInWords: this.numberToWords(subTotal),
        additionalNotes: options.notes || `Payment request for ${customer.planId.planName}. Please make payment before due date to avoid penalty.`,
        paymentTerms: "Payment is due within 7 days of invoice date. Late payment charges applicable after due date.",
        pdfTemplate: 1, // Use template 1
        updatedAt: new Date().toISOString()
      }
    };

    return invoice;
  }

  /**
   * Generate unique invoice number
   */
  private static generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    return `CF${year}${month}${timestamp}`;
  }

  /**
   * Convert number to words (Indian format)
   */
  private static numberToWords(amount: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (amount === 0) return 'Zero Rupees Only';

    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);

    let result = '';

    // Convert rupees
    if (rupees >= 10000000) { // Crores
      const crores = Math.floor(rupees / 10000000);
      result += this.convertHundreds(crores) + ' Crore ';
      const remainder = rupees % 10000000;
      if (remainder > 0) {
        result += this.convertToWords(remainder) + ' ';
      }
    } else {
      result += this.convertToWords(rupees) + ' ';
    }

    result += 'Rupees';

    // Add paise if any
    if (paise > 0) {
      result += ' and ' + this.convertToWords(paise) + ' Paise';
    }

    result += ' Only';
    return result;
  }

  private static convertToWords(num: number): string {
    if (num >= 100000) { // Lakhs
      const lakhs = Math.floor(num / 100000);
      const remainder = num % 100000;
      let result = this.convertHundreds(lakhs) + ' Lakh';
      if (remainder > 0) {
        result += ' ' + this.convertToWords(remainder);
      }
      return result;
    } else if (num >= 1000) { // Thousands
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      let result = this.convertHundreds(thousands) + ' Thousand';
      if (remainder > 0) {
        result += ' ' + this.convertHundreds(remainder);
      }
      return result;
    } else {
      return this.convertHundreds(num);
    }
  }

  private static convertHundreds(num: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    let result = '';

    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }

    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + ' ';
      num %= 10;
    } else if (num >= 10) {
      result += teens[num - 10] + ' ';
      num = 0;
    }

    if (num > 0) {
      result += ones[num] + ' ';
    }

    return result.trim();
  }

  /**
   * Create invoice for bulk payments (multiple customers)
   */
  static createBulkInvoices(
    customers: ChitFundCustomer[],
    paymentsByCustomer: { [customerId: string]: ChitFundPayment[] },
    options: {
      dueDate?: Date;
      includeLateFee?: boolean;
      batchNotes?: string;
    } = {}
  ): InvoiceType[] {
    return customers.map(customer => {
      const payments = paymentsByCustomer[customer.userId._id] || [];
      return this.createInvoiceFromCustomer(customer, payments, {
        ...options,
        notes: options.batchNotes || `Bulk invoice generation for ${customer.planId.planName}`
      });
    });
  }

  /**
   * Update company information
   */
  static updateCompanyInfo(companyInfo: Partial<CompanyInfo>) {
    this.companyInfo = { ...this.companyInfo, ...companyInfo };
  }
}

export default ChitFundInvoiceAdapter;