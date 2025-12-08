import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import ChitPlan from '@/models/Plan';
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const specificDate = searchParams.get('date');

    // Build query for invoices
    const invoiceQuery: any = {};

    // Add date filter
    if (specificDate) {
      // Specific date filter
      const dateStart = new Date(specificDate + 'T00:00:00.000Z');
      const dateEnd = new Date(specificDate + 'T23:59:59.999Z');
      invoiceQuery.createdAt = { $gte: dateStart, $lte: dateEnd };
    } else if (startDate && endDate) {
      // Date range filter
      const rangeStart = new Date(startDate + 'T00:00:00.000Z');
      const rangeEnd = new Date(endDate + 'T23:59:59.999Z');
      invoiceQuery.createdAt = { $gte: rangeStart, $lte: rangeEnd };
    }
    // If no date filters, get all invoices (all-time)

    // Find all invoices
    const invoices = await Invoice.find(invoiceQuery).sort({ createdAt: 1 }).lean();

    if (invoices.length === 0) {
      // Generate empty report PDF
      return generateEmptyReportPDF(specificDate, startDate, endDate);
    }

    // Collect all userIds, planIds, and staffIds
    const userIds = Array.from(new Set(invoices.map((inv: any) => inv.customerId)));
    const planIds = Array.from(new Set(invoices.map((inv: any) => inv.planId)));
    const staffIds = Array.from(new Set(invoices.map((inv: any) => inv.createdBy)));

    // Fetch user, plan, and staff details
    const users = await User.find({ userId: { $in: userIds } }).select('userId name').lean();
    const plans = await ChitPlan.find({ _id: { $in: planIds } }).select('_id planName').lean();
    const staffs = await User.find({ userId: { $in: staffIds } }).select('userId name').lean();

    const userMap = new Map(users.map((u: any) => [u.userId, u.name]));
    const planMap = new Map(plans.map((p: any) => [p._id.toString(), p.planName]));
    const staffMap = new Map(staffs.map((s: any) => [s.userId, s.name]));

    // Create PDF
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

    // Report title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('All Users Collection Report', pageWidth / 2, 35, { align: 'center' });

    // Date range subtitle
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    let dateRangeText = '';
    if (specificDate) {
      dateRangeText = `Date: ${new Date(specificDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    } else if (startDate && endDate) {
      dateRangeText = `Period: ${new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to ${new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    } else {
      dateRangeText = 'All Time';
    }
    doc.text(dateRangeText, pageWidth / 2, 42, { align: 'center' });

    // Draw header background
    doc.setFillColor(41, 128, 185);
    doc.rect(10, 50, pageWidth - 20, 10, 'F');

    // Table headers
    let y = 57;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    doc.text('S.No', 13, y);
    doc.text('User ID', 25, y);
    doc.text('User Name', 45, y);
    doc.text('Plan', 80, y);
    doc.text('Invoice No', 115, y);
    doc.text('Date', 145, y);
    doc.text('Amount (₹)', 175, y);
    doc.text('Staff', 210, y);

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // Table rows
    y = 67;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    let totalAmount = 0;
    let serialNo = 1;
    const uniqueUsers = new Set();

    invoices.forEach((inv: any) => {
      // Check if we need a new page
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;

        // Redraw header on new page
        doc.setFillColor(41, 128, 185);
        doc.rect(10, 10, pageWidth - 20, 10, 'F');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);

        doc.text('S.No', 13, 17);
        doc.text('User ID', 25, 17);
        doc.text('User Name', 45, 17);
        doc.text('Plan', 80, 17);
        doc.text('Invoice No', 115, 17);
        doc.text('Date', 145, 17);
        doc.text('Amount (₹)', 175, 17);
        doc.text('Staff', 210, 17);

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        y = 27;
      }

      const userId = inv.customerId;
      const userName = userMap.get(userId) || inv.customerDetails?.name || 'Unknown';
      const planName = planMap.get(inv.planId?.toString()) || 'N/A';
      const paymentMade = inv.receiptDetails?.receivedAmount || inv.receivedAmount || 0;
      const staffName = staffMap.get(inv.createdBy) || 'Unknown';
      const invoiceNo = String(inv.invoiceNumber || inv.receiptNo || 'N/A');
      const invoiceDate = new Date(inv.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      totalAmount += paymentMade;
      uniqueUsers.add(userId);

      // Truncate long text
      const truncatedUserName = String(userName).length > 20 ? String(userName).substring(0, 17) + '...' : String(userName);
      const truncatedPlanName = String(planName).length > 20 ? String(planName).substring(0, 17) + '...' : String(planName);
      const truncatedStaffName = String(staffName).length > 15 ? String(staffName).substring(0, 12) + '...' : String(staffName);

      // Alternate row colors
      if (serialNo % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(10, y - 5, pageWidth - 20, 7, 'F');
      }

      doc.text(serialNo.toString(), 13, y);
      doc.text(userId || 'N/A', 25, y);
      doc.text(truncatedUserName, 45, y);
      doc.text(truncatedPlanName, 80, y);
      doc.text(invoiceNo, 115, y);
      doc.text(invoiceDate, 145, y);
      doc.text(paymentMade.toLocaleString('en-IN'), 175, y, { align: 'left' });
      doc.text(truncatedStaffName, 210, y);

      y += 7;
      serialNo++;
    });

    // Draw total section
    y += 5;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(10, y, pageWidth - 10, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Total Users:', 15, y);
    doc.text(uniqueUsers.size.toString(), 50, y);
    doc.text('Total Invoices:', 80, y);
    doc.text(invoices.length.toString(), 120, y);
    doc.text('Total Collection:', 145, y);
    doc.setTextColor(0, 128, 0);
    doc.text('₹ ' + totalAmount.toLocaleString('en-IN'), 185, y);
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
    const pdfOutput = doc.output('arraybuffer');
    const pdfBuffer = Buffer.from(pdfOutput);

    // Generate filename
    let filename = 'all-users-report';
    if (specificDate) {
      filename += `-${specificDate}`;
    } else if (startDate && endDate) {
      filename += `-${startDate}-to-${endDate}`;
    } else {
      filename += '-all-time';
    }
    filename += '.pdf';

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error: any) {
    console.error('All users report PDF error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate PDF report',
      details: error.message
    }, { status: 500 });
  }
}

// Helper function to generate empty report PDF
function generateEmptyReportPDF(specificDate: string | null, startDate: string | null, endDate: string | null) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

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

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('SHREE ENIYAA CHITFUNDS (P) LTD.', pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Shop no. 2, Mahadhana Street, Mayiladuthurai - 609 001.', pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('All Users Collection Report', pageWidth / 2, 40, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  let dateRangeText = '';
  if (specificDate) {
    dateRangeText = `Date: ${new Date(specificDate).toLocaleDateString('en-IN')}`;
  } else if (startDate && endDate) {
    dateRangeText = `Period: ${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}`;
  } else {
    dateRangeText = 'All Time';
  }
  doc.text(dateRangeText, pageWidth / 2, 47, { align: 'center' });

  // Empty state message
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('No invoices found for the selected criteria', pageWidth / 2, 80, { align: 'center' });

  doc.setFontSize(10);
  doc.text('Try selecting a different date range or check if invoices exist', pageWidth / 2, 90, { align: 'center' });

  const pdfOutput = doc.output('arraybuffer');
  const pdfBuffer = Buffer.from(pdfOutput);

  let filename = 'all-users-report';
  if (specificDate) {
    filename += `-${specificDate}`;
  } else if (startDate && endDate) {
    filename += `-${startDate}-to-${endDate}`;
  } else {
    filename += '-all-time';
  }
  filename += '-no-data.pdf';

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}
