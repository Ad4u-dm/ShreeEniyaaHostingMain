import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import Plan from '@/models/Plan';
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // Format: YYYY-MM-DD
    const staffId = searchParams.get('staffId');
    if (!date) {
      return NextResponse.json({ success: false, error: 'Date is required (YYYY-MM-DD)' }, { status: 400 });
    }
    // Get start and end of the day
    const startDate = new Date(date + 'T00:00:00.000Z');
    const endDate = new Date(date + 'T23:59:59.999Z');

    // Build query for invoices
    const invoiceQuery: any = {
      createdAt: { $gte: startDate, $lte: endDate }
    };
    if (staffId) {
      invoiceQuery.createdBy = staffId;
    }
    // Find invoices for date and staff (if provided)
    const invoices = await Invoice.find(invoiceQuery).populate('planId', 'planName').lean();

    // Collect all userIds and staffIds
    const userIds = invoices.map((inv: any) => inv.customerId);
    const staffIds = invoices.map((inv: any) => inv.createdBy);

    // Fetch user and staff details
    const users = await User.find({ userId: { $in: userIds } }).select('userId name');
    const staffs = await User.find({ userId: { $in: staffIds } }).select('userId name');
    const userMap = new Map(users.map((u: any) => [u.userId, u.name]));
    const staffMap = new Map(staffs.map((s: any) => [s.userId, s.name]));

    // Create PDF with better formatting
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Add logo if exists
    const logoPath = path.join(process.cwd(), 'public', 'icon.png');
    if (fs.existsSync(logoPath)) {
      try {
        const logoData = fs.readFileSync(logoPath);
        const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;
        doc.addImage(logoBase64, 'PNG', 15, 10, 25, 25);
      } catch (err) {
        console.error('Error loading logo:', err);
      }
    }

    // Company header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SHREE ENIYAA CHITFUNDS (P) LTD.', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Shop no. 2, Mahadhana Street, Mayiladuthurai - 609 001.', pageWidth / 2, 25, { align: 'center' });

    // Report title with date
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Daily Collection Report', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })}`, pageWidth / 2, 42, { align: 'center' });

    // Draw header background
    doc.setFillColor(41, 128, 185); // Blue color
    doc.rect(10, 50, pageWidth - 20, 10, 'F');

    // Table headers
    let y = 57;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255); // White text

    doc.text('S.No', 15, y);
    doc.text('Invoice No', 30, y);
    doc.text('Customer Name', 60, y);
    doc.text('Group Name', 110, y);
    doc.text('Amount (₹)', 155, y);
    doc.text('Collected By', 185, y);

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Table rows
    y = 67;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    let totalAmount = 0;
    let serialNo = 1;

    invoices.forEach((inv: any) => {
      // Check if we need a new page
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;

        // Redraw header on new page
        doc.setFillColor(41, 128, 185);
        doc.rect(10, 10, pageWidth - 20, 10, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);

        doc.text('S.No', 15, 17);
        doc.text('Invoice No', 30, 17);
        doc.text('Customer Name', 60, 17);
        doc.text('Group Name', 110, 17);
        doc.text('Amount (₹)', 155, 17);
        doc.text('Collected By', 185, 17);

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        y = 27;
      }

      const userName = userMap.get(inv.customerId) || inv.customerDetails?.name || 'Unknown';
      const paymentMade = inv.receivedAmount || inv.totalAmount || 0;
      const staffName = userMap.get(inv.createdBy) || 'Unknown';
      const invoiceNo = String(inv.invoiceNumber || inv.receiptNo || 'N/A');
      const groupName = (inv.planId && typeof inv.planId === 'object' && inv.planId.planName)
        ? inv.planId.planName
        : (inv.planDetails?.planName || 'N/A');

      totalAmount += paymentMade;

      // Truncate long names for better fit
      const truncatedUserName = String(userName).length > 25 ? String(userName).substring(0, 22) + '...' : String(userName);
      const truncatedGroupName = String(groupName).length > 22 ? String(groupName).substring(0, 19) + '...' : String(groupName);
      const truncatedStaffName = String(staffName).length > 18 ? String(staffName).substring(0, 15) + '...' : String(staffName);

      // Alternate row colors
      if (serialNo % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(10, y - 5, pageWidth - 20, 8, 'F');
      }

      doc.text(serialNo.toString(), 15, y);
      doc.text(invoiceNo, 30, y);
      doc.text(truncatedUserName, 60, y);
      doc.text(truncatedGroupName, 110, y);
      doc.text(paymentMade.toLocaleString('en-IN'), 155, y, { align: 'left' });
      doc.text(truncatedStaffName, 185, y);

      y += 8;
      serialNo++;
    });

    // Draw total section
    y += 5;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(10, y, pageWidth - 10, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Total Invoices:', 15, y);
    doc.text((invoices.length).toString(), 60, y);
    doc.text('Total Collection:', 110, y);
    doc.setTextColor(0, 128, 0); // Green color for total
    doc.text('₹ ' + totalAmount.toLocaleString('en-IN'), 155, y);
    doc.setTextColor(0, 0, 0);

    // Footer
    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}`, pageWidth / 2, y, { align: 'center' });

    // Add page numbers
    const pageCount = (doc as any).internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="daily-report-${date}.pdf"`
      }
    });
  } catch (error: any) {
    console.error('Daily invoice PDF error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error message:', error.message);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate PDF report',
      details: error.message
    }, { status: 500 });
  }
}
