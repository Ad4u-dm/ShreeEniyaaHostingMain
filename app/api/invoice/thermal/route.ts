import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json();

    // Fetch invoice data (using mock data for now, replace with actual DB call)
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

    // Generate thermal receipt HTML
    const thermalReceiptHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Thermal Receipt</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 5px;
            width: 58mm;
            font-size: 10px;
            line-height: 1.2;
        }
        .center { text-align: center; }
        .header { font-weight: bold; font-size: 12px; margin-bottom: 5px; }
        .company-name { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
        .address { font-size: 9px; margin-bottom: 3px; }
        .divider { border-top: 1px dashed #000; margin: 3px 0; }
        .receipt-info { font-size: 9px; margin: 2px 0; }
        .item-row { display: flex; justify-content: space-between; margin: 1px 0; font-size: 9px; }
        .total-section { margin-top: 5px; font-weight: bold; }
        .footer { text-align: center; font-size: 8px; margin-top: 5px; }
        @media print {
            @page { size: 58mm auto; margin: 0; }
            body { width: 58mm; padding: 2px; }
        }
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
    <div style="font-weight: bold; margin: 5px 0 2px 0;">Due No</div>
    
    <div class="item-row"><span>Due Amount</span><span>${invoiceData.planId.monthlyAmount}</span></div>
    <div class="item-row"><span>Arrear Amount</span><span>0</span></div>
    <div class="item-row"><span>Pending Amount</span><span>0</span></div>
    <div class="item-row"><span>Received Amount</span><span>${invoiceData.total}</span></div>
    <div class="item-row"><span>Balance Amount</span><span>0</span></div>
    
    <div class="divider"></div>
    <div class="total-section">
        <div class="item-row"><span>Total Received Amount: </span><span>${invoiceData.total}</span></div>
    </div>
    
    <div class="footer">User: ${invoiceData.collectedBy.name}</div>
    <div class="center" style="font-size: 8px; margin-top: 3px;">** Any Enquiry **</div>
    <div class="center" style="font-size: 8px; margin-top: 5px;">
        ${new Date(invoiceData.issueDate).toLocaleTimeString('en-IN')}
    </div>
    
    <script>
        // Auto print when page loads
        window.onload = function() {
            window.print();
        }
    </script>
</body>
</html>`;

    return new NextResponse(thermalReceiptHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="thermal-receipt-${invoiceId}.html"`
      }
    });

  } catch (error) {
    console.error('Generate thermal receipt error:', error);
    return NextResponse.json(
      { error: 'Failed to generate thermal receipt' },
      { status: 500 }
    );
  }
}