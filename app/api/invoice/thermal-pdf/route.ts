import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json();

    // Mock invoice data (replace with actual DB call)
    const invoiceData = {
      _id: invoiceId,
      invoiceNumber: `RCP${Date.now()}`,
      issueDate: new Date().toISOString(),
      customerId: {
        _id: 'customer-1',
        name: 'GOPALKRISHNAN A',
        email: 'gopal@example.com',
        phone: '+91 9876543210'
      },
      planId: {
        _id: 'plan-1',
        name: '₹1L Plan',
        monthlyAmount: 1658
      },
      amount: 1658,
      total: 1658,
      enrollment: {
        memberNumber: 2154
      },
      collectedBy: {
        name: 'ADMIN'
      }
    };

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
    <div class="company-name center">SRI INIYA CHIT FUND</div>
    <div class="address center">KOVILNADU, MAYILADUDHURAI-609001</div>
    <div class="center">Mobile Receipt</div>
    <div class="divider"></div>
    <div class="receipt-info">Receipt No: ${invoiceData.invoiceNumber}</div>
    <div class="receipt-info">Date / Time: ${new Date(invoiceData.issueDate).toLocaleDateString('en-IN')}</div>
    <div class="receipt-info">Member No: ${invoiceData.enrollment.memberNumber}</div>
    <div class="receipt-info">Member Name: ${invoiceData.customerId.name}</div>
    <div class="receipt-info">Ticket No: ${invoiceData.planId._id.slice(-4)}</div>
    <div class="divider"></div>
    <div class="due-header">Due No</div>
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

      return new Response(Buffer.from(pdf), {
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