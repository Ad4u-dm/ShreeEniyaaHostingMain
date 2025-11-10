import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';
import ChitPlan from '@/models/ChitPlan';
import { getUserFromRequest } from '@/lib/auth';

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
      // Fetch invoice data with populated references
      const invoice = await Invoice.findById(invoiceId)
        .populate('customerId', 'name email phone')
        .populate('planId', 'planName totalAmount monthlyAmount duration')
        .lean();

      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      // Get enrollment info
      const enrollment = await Enrollment.findOne({ 
        userId: invoice.customerId._id,
        planId: invoice.planId._id 
      }).lean();

      invoiceData = {
        _id: invoice._id,
        invoiceNumber: invoice.invoiceNumber || `INV${Date.now()}`,
        issueDate: invoice.issueDate || new Date().toISOString(),
        customerId: invoice.customerId,
        planId: invoice.planId,
        amount: invoice.amount,
        total: invoice.total,
        enrollment: enrollment,
        collectedBy: {
          name: user.name || 'STAFF'
        }
      };
    } else {
      return NextResponse.json({ error: 'Invoice ID or Payment ID required' }, { status: 400 });
    }

    if (!invoiceData) {
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    let browser;
    let page;

    try {
      // Dynamic import for puppeteer
      const puppeteer = (await import('puppeteer')).default;
      
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions'
        ]
      });

      page = await browser.newPage();

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page { size: 58mm auto; margin: 0; }
        body {
            font-family: 'Courier New', monospace;
            font-size: 8pt;
            line-height: 1.1;
            margin: 0;
            padding: 3mm;
            width: 52mm;
        }
        .center { text-align: center; }
        .company-name { font-size: 10pt; font-weight: bold; margin-bottom: 2mm; }
        .address { font-size: 7pt; margin-bottom: 2mm; }
        .divider { border-top: 1px dashed #000; margin: 2mm 0; }
        .receipt-info { font-size: 7pt; margin: 1mm 0; }
        .item-row { display: flex; justify-content: space-between; margin: 0.5mm 0; font-size: 7pt; }
        .total-section { margin-top: 2mm; font-weight: bold; }
        .footer { text-align: center; font-size: 6pt; margin-top: 2mm; }
        .due-header { font-weight: bold; margin: 2mm 0 1mm 0; font-size: 7pt; }
    </style>
</head>
<body>
    <div class="company-name center">SHREE ENIYAA CHITFUNDS (P) LTD.</div>
    <div class="address center">Shop No. 2, Irundam Thalam, No. 40, Mahathanath Street, Mayiladuthurai – 609 001.</div>
    <div class="center">Mobile Receipt</div>
    <div class="divider"></div>
    <div class="receipt-info">Receipt No: ${invoiceData.invoiceNumber}</div>
    <div class="receipt-info">Date / Time: ${new Date(invoiceData.issueDate).toLocaleDateString('en-IN')}</div>
    <div class="receipt-info">Member No: ${invoiceData.enrollment.memberNumber}</div>
    <div class="receipt-info">Member Name: ${invoiceData.customerId.name}</div>
    <div class="receipt-info">Due No: 14</div>
    <div class="item-row"><span>Due Amount</span><span>${invoiceData.planId.monthlyAmount}</span></div>
    <div class="item-row"><span>Arrear Amount</span><span>0</span></div>
    <div class="item-row"><span>Pending Amount</span><span>0</span></div>
    <div class="item-row"><span>Received Amount</span><span>${invoiceData.total}</span></div>
    <div class="item-row"><span>Balance Amount</span><span>0</span></div>
    <div class="divider"></div>
    <div class="total-section">
        <div class="item-row"><span>Total Received Amount:</span><span>${invoiceData.total}</span></div>
    </div>
    <div class="footer">User: ${invoiceData.collectedBy.name}</div>
    <div class="center" style="font-size: 6pt; margin-top: 2mm;">** Any Enquiry **</div>
    <div class="center" style="font-size: 6pt; margin-top: 2mm;">
        ${new Date(invoiceData.issueDate).toLocaleTimeString('en-IN')}
    </div>
</body>
</html>`;

      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Generate PDF with thermal printer settings
      const pdf = await page.pdf({
        width: '58mm',
        height: '200mm', // Fixed height for thermal printer
        margin: {
          top: '0mm',
          right: '0mm', 
          bottom: '0mm',
          left: '0mm'
        },
        printBackground: true,
        preferCSSPageSize: true
      });

      return new Response(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="thermal-receipt-${invoiceId}.pdf"`
        }
      });

    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }

  } catch (error) {
    console.error('Generate thermal receipt PDF error:', error);
    return NextResponse.json(
      { error: 'Failed to generate thermal receipt PDF', details: (error as Error).message },
      { status: 500 }
    );
  }
}