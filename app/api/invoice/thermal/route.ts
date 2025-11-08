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

    // Generate thermal receipt HTML - Exact format matching SRI SIVANATHAN CHITS template
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
            line-height: 1.3;
            color: #000;
        }
        .center { text-align: center; }
        .company-name { 
            font-size: 12px; 
            font-weight: bold; 
            margin-bottom: 2px; 
            letter-spacing: 0.5px;
        }
        .address { 
            font-size: 9px; 
            margin-bottom: 3px; 
            letter-spacing: 0.3px;
        }
        .mobile-receipt {
            font-size: 11px;
            margin: 5px 0;
            font-weight: normal;
        }
        .divider { 
            border-top: 1px dashed #000; 
            margin: 4px 0; 
            width: 100%;
        }
        .info-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 2px 0; 
            font-size: 9px;
            align-items: flex-start;
        }
        .info-label {
            flex: 0 0 45%;
            text-align: left;
        }
        .info-colon {
            flex: 0 0 5%;
            text-align: center;
        }
        .info-value {
            flex: 1;
            text-align: left;
        }
        .due-section {
            margin: 5px 0 2px 0;
            font-size: 9px;
        }
        .amount-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 1px 0; 
            font-size: 9px;
        }
        .amount-label {
            flex: 0 0 65%;
            text-align: left;
        }
        .amount-colon {
            flex: 0 0 5%;
            text-align: center;
        }
        .amount-value {
            flex: 1;
            text-align: right;
        }
        .total-section { 
            margin-top: 5px; 
            font-size: 9px;
            border-top: 1px dashed #000;
            padding-top: 3px;
        }
        .footer-user { 
            font-size: 9px; 
            margin-top: 5px;
            display: flex;
            justify-content: space-between;
        }
        .footer-enquiry {
            text-align: center; 
            font-size: 9px; 
            margin-top: 3px;
        }
        .footer-contact {
            text-align: center; 
            font-size: 9px; 
            margin-top: 2px;
        }
        @media print {
            @page { size: 58mm auto; margin: 0; }
            body { width: 58mm; padding: 2px; }
        }
    </style>
</head>
<body>
    <div class="center mobile-receipt">Mobile Receipt</div>
    <div class="divider"></div>
    
    <div class="company-name center">SRI SIVANATHAN CHITS (P) LTD.,</div>
    <div class="address center">KOORAINADU, MAYILADUDHURAI-609001.</div>
    
    <div class="divider"></div>
    
    <div class="info-row">
        <span class="info-label">Receipt No</span>
        <span class="info-colon">:</span>
        <span class="info-value">${invoiceData.invoiceNumber.replace('RCP', '')}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Date / Time</span>
        <span class="info-colon">:</span>
        <span class="info-value">${new Date(invoiceData.issueDate).toLocaleDateString('en-GB')}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Member No</span>
        <span class="info-colon">:</span>
        <span class="info-value">${invoiceData.enrollment.memberNumber || 'SNKR24218-14'}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Member Name</span>
        <span class="info-colon">:</span>
        <span class="info-value">${invoiceData.customerId.name}</span>
    </div>
    <div class="info-row">
        <span class="info-label">Due No</span>
        <span class="info-colon">:</span>
        <span class="info-value">14</span>
    </div>
    
    <div class="amount-row">
        <span class="amount-label">Due Amount</span>
        <span class="amount-colon">:</span>
        <span class="amount-value">${invoiceData.planId.monthlyAmount.toLocaleString('en-IN')}</span>
    </div>
    <div class="amount-row">
        <span class="amount-label">Arrear Amount</span>
        <span class="amount-colon">:</span>
        <span class="amount-value">0</span>
    </div>
    <div class="amount-row">
        <span class="amount-label">Pending Amount</span>
        <span class="amount-colon">:</span>
        <span class="amount-value">${invoiceData.planId.monthlyAmount.toLocaleString('en-IN')}</span>
    </div>
    <div class="amount-row">
        <span class="amount-label">Received Amount</span>
        <span class="amount-colon">:</span>
        <span class="amount-value">${invoiceData.total}</span>
    </div>
    <div class="amount-row">
        <span class="amount-label">Balance Amount</span>
        <span class="amount-colon">:</span>
        <span class="amount-value">${(invoiceData.planId.monthlyAmount - invoiceData.total).toLocaleString('en-IN')}</span>
    </div>
    
    <div class="total-section">
        <div class="amount-row" style="font-weight: bold;">
            <span class="amount-label">Total Received Amount</span>
            <span class="amount-colon">:</span>
            <span class="amount-value">${invoiceData.total}</span>
        </div>
    </div>
    
    <div class="footer-user">
        <span>User</span>
        <span>: ${invoiceData.collectedBy.name}</span>
    </div>
    <div class="footer-enquiry">For Any Enquiry</div>
    <div class="footer-contact">: 04364-221200</div>
    
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