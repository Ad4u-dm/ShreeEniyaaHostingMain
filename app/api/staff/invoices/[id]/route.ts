import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoiceId = params.id;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // 'json', 'pdf', 'html'

    const invoice = await Invoice.findOne({ 
      _id: invoiceId,
      createdBy: user.userId 
    }).populate('enrollmentId', 'enrollmentId memberNumber');

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found or not authorized' },
        { status: 404 }
      );
    }

    if (format === 'json') {
      return NextResponse.json({ invoice });
    }

    if (format === 'html' || format === 'pdf') {
      const invoiceHTML = generateInvoiceHTML(invoice);
      
      if (format === 'html') {
        return new NextResponse(invoiceHTML, {
          headers: {
            'Content-Type': 'text/html',
          },
        });
      }

      // For PDF, we would integrate with a PDF generation library
      // For demo purposes, returning HTML
      return new NextResponse(invoiceHTML, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceId}.html"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });

  } catch (error) {
    console.error('Invoice generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}

function generateInvoiceHTML(invoice: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoiceId}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .company-info {
            margin-bottom: 30px;
        }
        .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .customer-info, .invoice-info {
            width: 48%;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .items-table th, .items-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .items-table th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        .total-section {
            margin-left: auto;
            width: 300px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
        .total-final {
            font-weight: bold;
            font-size: 1.2em;
            border-bottom: 2px solid #333;
            margin-top: 10px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 0.9em;
            color: #666;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-paid { background-color: #d4edda; color: #155724; }
        .status-sent { background-color: #d1ecf1; color: #0c5460; }
        .status-overdue { background-color: #f8d7da; color: #721c24; }
        .status-draft { background-color: #f8f9fa; color: #495057; }
    </style>
</head>
<body>
    <div class="header">
        <h1>SHRI INIYA CHIT FUNDS</h1>
        <p>Professional Chit Fund Management Services</p>
        <div class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</div>
    </div>

    <div class="company-info">
        <h3>From:</h3>
        <p><strong>Shri Iniya Chit Funds</strong><br>
        123 Business Street<br>
        City, State 12345<br>
        Phone: +91-9876543210<br>
        Email: info@shriin iyachitfunds.com</p>
    </div>

    <div class="invoice-details">
        <div class="customer-info">
            <h3>Bill To:</h3>
            <p><strong>${invoice.customerDetails.name}</strong><br>
            ${invoice.customerDetails.phone}<br>
            ${invoice.customerDetails.email || ''}<br>
            ${invoice.customerDetails.address ? `
                ${invoice.customerDetails.address.street}<br>
                ${invoice.customerDetails.address.city}, ${invoice.customerDetails.address.state}<br>
                ${invoice.customerDetails.address.pincode}
            ` : ''}</p>
        </div>
        
        <div class="invoice-info">
            <h3>Invoice Details:</h3>
            <p><strong>Invoice #:</strong> ${invoice.invoiceId}<br>
            <strong>Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}<br>
            <strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}<br>
            <strong>Enrollment:</strong> ${invoice.enrollmentId?.enrollmentId}<br>
            <strong>Plan:</strong> ${invoice.planDetails.planName}</p>
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Type</th>
                <th>Due Date</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.items.map((item: any) => `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.type}</td>
                    <td>${item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-IN') : '-'}</td>
                    <td>₹${item.amount.toLocaleString('en-IN')}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">
            <span>Subtotal:</span>
            <span>₹${invoice.subtotal.toLocaleString('en-IN')}</span>
        </div>
        ${invoice.penaltyAmount > 0 ? `
        <div class="total-row">
            <span>Penalty:</span>
            <span>₹${invoice.penaltyAmount.toLocaleString('en-IN')}</span>
        </div>
        ` : ''}
        ${invoice.taxAmount > 0 ? `
        <div class="total-row">
            <span>Tax:</span>
            <span>₹${invoice.taxAmount.toLocaleString('en-IN')}</span>
        </div>
        ` : ''}
        <div class="total-row total-final">
            <span>Total Amount:</span>
            <span>₹${invoice.totalAmount.toLocaleString('en-IN')}</span>
        </div>
        ${invoice.paidAmount > 0 ? `
        <div class="total-row">
            <span>Paid Amount:</span>
            <span>₹${invoice.paidAmount.toLocaleString('en-IN')}</span>
        </div>
        <div class="total-row">
            <span>Balance Due:</span>
            <span>₹${(invoice.totalAmount - invoice.paidAmount).toLocaleString('en-IN')}</span>
        </div>
        ` : ''}
    </div>

    ${invoice.notes ? `
    <div style="margin-top: 30px;">
        <h3>Notes:</h3>
        <p>${invoice.notes}</p>
    </div>
    ` : ''}

    <div style="margin-top: 30px;">
        <h3>Terms & Conditions:</h3>
        <p>${invoice.terms}</p>
    </div>

    <div class="footer">
        <p>Thank you for your business!</p>
        <p>Generated on ${new Date().toLocaleDateString('en-IN')} | Invoice ID: ${invoice.invoiceId}</p>
    </div>
</body>
</html>
  `;
}