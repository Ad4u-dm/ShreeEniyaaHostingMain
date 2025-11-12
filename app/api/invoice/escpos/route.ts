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
function dashedLine(width = 32): string {
  return '-'.repeat(width) + '\n';
}

// Helper function to pad text for alignment
function padLine(left: string, right: string, width = 32): string {
  const spaces = width - left.length - right.length;
  return left + ' '.repeat(Math.max(0, spaces)) + right + '\n';
}

// Helper function to center text
function centerText(text: string, width = 32): string {
  const padding = Math.floor((width - text.length) / 2);
  return ' '.repeat(Math.max(0, padding)) + text + '\n';
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoiceId, paymentId } = await request.json();

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
      // Fetch invoice data - use snapshot fields stored on invoice
      const invoice = await Invoice.findById(invoiceId).lean();

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      // Use snapshot fields from invoice document
      invoiceData = {
        _id: invoice._id,
        invoiceNumber: invoice.receiptNo || invoice.invoiceId || `INV${Date.now()}`,
        issueDate: invoice.invoiceDate || new Date().toISOString(),
        customerId: {
          name: invoice.memberName || invoice.customerDetails?.name || 'N/A'
        },
        planId: {
          planName: invoice.planDetails?.planName || 'N/A',
          monthlyAmount: invoice.dueAmount || invoice.planDetails?.monthlyAmount || 0
        },
        amount: invoice.totalAmount || 0,
        total: invoice.paidAmount || invoice.totalAmount || 0,
        enrollment: {
          memberNumber: invoice.memberNumber || invoice.dueNumber || 'N/A'
        },
        collectedBy: {
          name: user.name || 'ADMIN'
        },
        // Additional receipt fields
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

    // Format date and time
    const date = new Date(invoiceData.issueDate);
    const formattedDate = date.toLocaleDateString('en-GB');
    const formattedTime = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Calculate amounts from invoice snapshot fields
    const dueAmount = invoiceData.dueAmount || invoiceData.planId?.monthlyAmount || 0;
    const arrearAmount = invoiceData.arrearAmount || 0;
    const pendingAmount = invoiceData.pendingAmount || dueAmount;
    const receivedAmount = invoiceData.paidAmount || invoiceData.total || 0;
    const balanceAmount = invoiceData.balanceAmount || (pendingAmount - receivedAmount);

    // Build ESC/POS receipt
    let receipt = '';
    
    // Initialize
    receipt += COMMANDS.INIT;
    
    // Mobile Receipt header
    receipt += COMMANDS.ALIGN_CENTER;
    receipt += COMMANDS.SIZE_NORMAL;
    receipt += 'Mobile Receipt\n';
    receipt += dashedLine();
    
    // Company name (bold, larger)
    receipt += COMMANDS.BOLD_ON;
    receipt += COMMANDS.SIZE_WIDE;
    receipt += 'SHREE ENIYAA CHITFUNDS\n';
    receipt += COMMANDS.SIZE_NORMAL;
    receipt += '(P) LTD.\n';
    receipt += COMMANDS.BOLD_OFF;
    
    // Address
    receipt += COMMANDS.SIZE_NORMAL;
    receipt += 'Shop No. 2, Irundam Thalam\n';
    receipt += 'No. 40, Mahathanath Street\n';
    receipt += 'Mayiladuthurai - 609 001\n';
    receipt += dashedLine();
    
    // Receipt details (left aligned)
    receipt += COMMANDS.ALIGN_LEFT;
    receipt += padLine('Receipt No', invoiceData.invoiceNumber.replace('RCP', ''));
    receipt += padLine('Date / Time', `${formattedDate} ${formattedTime}`);
    receipt += padLine('Member No', String(invoiceData.enrollment?.memberNumber || 'N/A'));
    receipt += padLine('Member Name', String(invoiceData.customerId?.name || 'N/A').substring(0, 20));
    receipt += padLine('Plan', String(invoiceData.planId?.planName || 'N/A').substring(0, 20));
    receipt += '\n';
    
    // Amount details
    receipt += padLine('Due Amount', `Rs. ${dueAmount.toLocaleString('en-IN')}`);
    receipt += padLine('Arrear Amount', `Rs. ${arrearAmount.toLocaleString('en-IN')}`);
    receipt += padLine('Pending Amount', `Rs. ${pendingAmount.toLocaleString('en-IN')}`);
    receipt += padLine('Received Amount', `Rs. ${receivedAmount.toLocaleString('en-IN')}`);
    receipt += padLine('Balance Amount', `Rs. ${balanceAmount.toLocaleString('en-IN')}`);
    receipt += '\n';
    receipt += dashedLine();
    
    // Total (bold)
    receipt += COMMANDS.BOLD_ON;
    receipt += padLine('Total Received', `Rs. ${receivedAmount.toLocaleString('en-IN')}`);
    receipt += COMMANDS.BOLD_OFF;
    receipt += dashedLine();
    
    // Footer
    receipt += padLine('User', invoiceData.collectedBy?.name || 'STAFF');
    receipt += '\n';
    receipt += COMMANDS.ALIGN_CENTER;
    receipt += 'For Any Enquiry\n';
    receipt += ': 04364-221200\n';
    receipt += '\n';
    receipt += 'Thank You!\n';
    receipt += '\n\n';
    
    // Convert to base64 for transmission
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

  } catch (error) {
    console.error('Generate ESC/POS receipt error:', error);
    return NextResponse.json(
      { error: 'Failed to generate ESC/POS receipt', details: String(error) },
      { status: 500 }
    );
  }
}
