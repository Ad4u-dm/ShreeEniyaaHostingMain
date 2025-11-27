import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Invoice from '@/models/Invoice';
import { getUserFromRequest } from '@/lib/auth';

/**
 * Generates ESC/POS thermal receipt data for Bluetooth printing
 * This endpoint returns raw ESC/POS commands that can be sent directly to thermal printers
 */

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const COMMANDS = {
  INIT: `${ESC}@`,           // Initialize printer
  ALIGN_CENTER: `${ESC}a1`,  // Center align
  ALIGN_LEFT: `${ESC}a0`,    // Left align
  ALIGN_RIGHT: `${ESC}a2`,   // Right align
  BOLD_ON: `${ESC}E1`,       // Bold on
  BOLD_OFF: `${ESC}E0`,      // Bold off
  SIZE_NORMAL: `${GS}!0`,    // Normal size
  SIZE_DOUBLE: `${GS}!17`,   // Double width & height
  SIZE_WIDE: `${GS}!16`,     // Double width only
  SIZE_TALL: `${GS}!1`,      // Double height only
  UNDERLINE_ON: `${ESC}-1`,  // Underline on
  UNDERLINE_OFF: `${ESC}-0`, // Underline off
  LINE_FEED: '\n',
  CUT_PAPER: `${GS}V66\x00`, // Cut paper (auto cutter)
};

// Helper function to create a dashed line
function dashedLine(width = 48): string {
  return '-'.repeat(width) + '\n';
}

// Helper function to pad text for alignment
function padColonLine(label: string, value: string, colonPos = 16, width = 48): string {
  // Pad label with spaces to colonPos, then colon, then value left-aligned
  const spaces = ' '.repeat(Math.max(0, colonPos - label.length));
  return label + spaces + ': ' + value + '\n';
}

// Helper function to center text
function centerText(text: string, width = 24): string {
  const padding = Math.floor((width - text.length) / 2);
  return ' '.repeat(Math.max(0, padding)) + text + '\n';
}

export async function POST(request: NextRequest) {
  let invoiceId: string | undefined;
  let paymentId: string | undefined;
  let invoiceData: any;
  
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    invoiceId = body.invoiceId;
    paymentId = body.paymentId;

    let invoiceData;

    if (paymentId) {
      // Fetch payment data with populated references
      const payment = await Payment.findOne({ paymentId })
        .populate('userId', 'name email phone')
        .populate('planId', 'planName totalAmount monthlyAmount duration')
        .populate('enrollmentId', 'memberNumber enrollmentDate')
        .lean();

      if (!payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      invoiceData = {
        _id: payment._id,
        invoiceNumber: payment.receiptNumber || `RCP${Date.now()}`,
        issueDate: payment.paymentDate || new Date().toISOString(),
        customerId: payment.userId,
        planId: payment.planId,
        amount: payment.amount,
        total: payment.amount,
        enrollment: payment.enrollmentId,
        collectedBy: {
          name: user.name || 'STAFF'
        },
        paymentType: payment.paymentType,
        notes: payment.notes
      };
    } else if (invoiceId) {
      // Fetch invoice data and populate customer/plan fields
      const invoice = await Invoice.findById(invoiceId)
        .populate('customerId', 'name phone address')
        .populate('planId', 'planName monthlyAmount')
        .lean();

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      // Use populated fields from invoice document
      invoiceData = {
        _id: invoice._id,
        invoiceNumber: invoice.receiptNo || invoice.invoiceId || `INV${Date.now()}`,
        issueDate: invoice.invoiceDate || new Date().toISOString(),
        customerId: {
          name: invoice.customerId?.name || invoice.memberName || invoice.customerDetails?.name || 'N/A',
          phone: invoice.customerId?.phone || invoice.customerDetails?.phone || '',
          address: invoice.customerId?.address || invoice.customerDetails?.address || '',
        },
        planId: {
          planName: invoice.planId?.planName || invoice.planDetails?.planName || 'N/A',
          monthlyAmount: invoice.dueAmount || invoice.planId?.monthlyAmount || invoice.planDetails?.monthlyAmount || 0
        },
        amount: invoice.totalAmount || 0,
        total: invoice.paidAmount || invoice.totalAmount || 0,
        enrollment: {
          memberNumber: invoice.memberNumber || 'N/A'
        },
        collectedBy: {
          name: user.name || invoice.issuedBy || 'ADMIN'
        },
        // Additional receipt fields
        dueNumber: invoice.dueNumber || 'N/A',
        dueAmount: invoice.dueAmount || 0,
        arrearAmount: invoice.arrearAmount || 0,
        pendingAmount: invoice.pendingAmount || 0,
        paidAmount: invoice.paidAmount || 0,
        balanceAmount: invoice.balanceAmount || 0
      };
    } else {
      return NextResponse.json({ error: 'Invoice ID or Payment ID required' }, { status: 400 });
    }

    if (!invoiceData) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    // Format date and time in IST timezone (with safety check)
    const date = new Date(invoiceData.issueDate);
    const formattedDate = isNaN(date.getTime()) ? new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }) : date.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
    const formattedTime = isNaN(date.getTime()) ? new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) : date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Calculate amounts from invoice snapshot fields (with safety checks)
    const dueAmount = Number(invoiceData.dueAmount || invoiceData.planId?.monthlyAmount || 0);
    const arrearAmount = Number(invoiceData.arrearAmount || 0);
    const pendingAmount = Number(invoiceData.pendingAmount || dueAmount);
    const receivedAmount = Number(invoiceData.paidAmount || invoiceData.total || 0);
    const balanceAmount = Number(invoiceData.balanceAmount || (pendingAmount - receivedAmount));

    // Build ESC/POS receipt
    let receipt = '';
    
    // Initialize
    receipt += COMMANDS.INIT;
    
    // Select Font A (ESC M 0) for larger text
    receipt += '\x1B\x4D\x00';
    
    // All lines left-aligned, compact, uniform font
    receipt += COMMANDS.ALIGN_LEFT;
  receipt += dashedLine();
  receipt += 'SHREE ENIYAA CHITFUNDS (P) LTD.\n';
  receipt += 'Mahadhana Street, Mayiladuthurai - 609 001.\n';
  receipt += dashedLine();
  receipt += padColonLine('Receipt No', String(invoiceData.invoiceNumber || 'N/A').replace('RCP', ''));
  receipt += padColonLine('Date/Time', `${formattedDate} ${formattedTime}`);
  receipt += padColonLine('Member No', String(invoiceData.enrollment?.memberNumber || 'N/A'));
  receipt += padColonLine('Member Name', String(invoiceData.customerId?.name || 'N/A').substring(0, 20));
  receipt += padColonLine('Due No', String(invoiceData.dueNumber || 'N/A'));
  receipt += padColonLine('Plan', String(invoiceData.planId?.planName || 'N/A').substring(0, 20));
  receipt += padColonLine('Due Amount', `${dueAmount.toLocaleString('en-IN')}`);
  receipt += padColonLine('Arrear Amount', `${arrearAmount.toLocaleString('en-IN')}`);
  receipt += padColonLine('Received Amount', `${receivedAmount.toLocaleString('en-IN')}`);
  receipt += padColonLine('Balance Amount', `${balanceAmount.toLocaleString('en-IN')}`);
  receipt += dashedLine();
  receipt += padColonLine('Total Received', `${receivedAmount.toLocaleString('en-IN')}`);
  receipt += dashedLine();
  receipt += padColonLine('Issued By', invoiceData.collectedBy?.name || 'ADMIN');
  receipt += padColonLine('For Any Enquiry', '96266 66527 / 90035 62126');
  receipt += COMMANDS.ALIGN_CENTER;
  receipt += 'Thank you for your business!\n';
  receipt += '\n\n\n\n'; // Add extra blank lines for easy cutting

  // Cut paper
  receipt += COMMANDS.CUT_PAPER;

  // Validate receipt data before encoding
  if (!receipt || receipt.length === 0) {
    throw new Error('Receipt content is empty');
  }

  try {
    const receiptBuffer = Buffer.from(receipt, 'binary');
    const base64Data = receiptBuffer.toString('base64');
    
    // Return as JSON with base64-encoded ESC/POS data
    return NextResponse.json({
      success: true,
      data: base64Data,
      metadata: {
        invoiceNumber: invoiceData.invoiceNumber,
        date: formattedDate,
        time: formattedTime,
        total: receivedAmount
      }
    });
  } catch (bufferError) {
    console.error('Buffer encoding error:', bufferError);
    throw new Error(`Failed to encode receipt data: ${bufferError}`);
  }

  } catch (error) {
    console.error('Generate ESC/POS receipt error:', {
      error: error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      invoiceData: {
        invoiceId: invoiceId,
        paymentId: paymentId,
        hasInvoiceData: !!invoiceData,
        invoiceNumber: invoiceData?.invoiceNumber
      }
    });
    return NextResponse.json(
      { error: 'Failed to generate ESC/POS receipt', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
