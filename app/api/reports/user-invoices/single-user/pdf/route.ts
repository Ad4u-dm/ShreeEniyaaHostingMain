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
    const userId = searchParams.get('userId');
    const planIdsParam = searchParams.get('planIds'); // Comma-separated plan IDs
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const specificDate = searchParams.get('date');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    // Get user details
    const user = await User.findOne({ userId }).lean();
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Build query for invoices
    const invoiceQuery: any = { customerId: userId };

    // Add plan filter if specific plans are selected
    if (planIdsParam) {
      const planIds = planIdsParam.split(',').map(id => id.trim());
      invoiceQuery.planId = { $in: planIds };
    }

    // Add date filter
    if (specificDate) {
      const dateStart = new Date(specificDate + 'T00:00:00.000Z');
      const dateEnd = new Date(specificDate + 'T23:59:59.999Z');
      invoiceQuery.createdAt = { $gte: dateStart, $lte: dateEnd };
    } else if (startDate && endDate) {
      const rangeStart = new Date(startDate + 'T00:00:00.000Z');
      const rangeEnd = new Date(endDate + 'T23:59:59.999Z');
      invoiceQuery.createdAt = { $gte: rangeStart, $lte: rangeEnd };
    }

    // Find all invoices for this user
    const invoices = await Invoice.find(invoiceQuery).sort({ planId: 1, createdAt: 1 }).lean();

    if (invoices.length === 0) {
      return generateEmptyUserReportPDF(user, planIdsParam, specificDate, startDate, endDate);
    }

    // Collect all planIds and staffIds
    const planIds = Array.from(new Set(invoices.map((inv: any) => inv.planId?.toString())));
    const staffIds = Array.from(new Set(invoices.map((inv: any) => inv.createdBy)));

    // Fetch plan and staff details
    const plans = await ChitPlan.find({ _id: { $in: planIds } }).select('_id planName').lean();
    const staffs = await User.find({ userId: { $in: staffIds } }).select('userId name').lean();

    const planMap = new Map(plans.map((p: any) => [p._id.toString(), p.planName]));
    const staffMap = new Map(staffs.map((s: any) => [s.userId, s.name]));

    // Group invoices by plan
    const invoicesByPlan = new Map<string, any[]>();
    invoices.forEach((inv: any) => {
      const planId = inv.planId?.toString();
      if (!invoicesByPlan.has(planId)) {
        invoicesByPlan.set(planId, []);
      }
      invoicesByPlan.get(planId)!.push(inv);
    });

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
    doc.text('User Invoice Report', pageWidth / 2, 35, { align: 'center' });

    // User details section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('User Details:', 15, 45);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Name: ${(user as any).name}`, 15, 52);
    doc.text(`User ID: ${userId}`, 15, 58);
    if ((user as any).phone) {
      doc.text(`Phone: ${(user as any).phone}`, 100, 52);
    }
    if ((user as any).address) {
      const address = String((user as any).address);
      const truncatedAddress = address.length > 50 ? address.substring(0, 47) + '...' : address;
      doc.text(`Address: ${truncatedAddress}`, 100, 58);
    }

    // Date range and plan info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    let dateRangeText = '';
    if (specificDate) {
      dateRangeText = `Date: ${new Date(specificDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`;
    } else if (startDate && endDate) {
      dateRangeText = `Period: ${new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to ${new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    } else {
      dateRangeText = 'All Time';
    }

    const planText = planIdsParam ? `Selected Plans (${invoicesByPlan.size})` : `All Plans (${invoicesByPlan.size})`;

    doc.text(dateRangeText, 15, 66);
    doc.text(planText, pageWidth - 80, 66);

    let y = 75;
    let overallSerialNo = 1;
    let grandTotalPaid = 0;
    let grandTotalPending = 0;

    // Iterate through each plan's invoices
    for (const [planId, planInvoices] of Array.from(invoicesByPlan.entries())) {
      // Check if we need a new page for plan header
      if (y > pageHeight - 50) {
        doc.addPage();
        y = 20;
      }

      // Plan section header
      doc.setFillColor(52, 152, 219);
      doc.rect(10, y - 5, pageWidth - 20, 8, 'F');

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`Plan: ${planMap.get(planId) || 'Unknown Plan'}`, 15, y);
      doc.setTextColor(0, 0, 0);

      y += 10;

      // Table header for this plan
      doc.setFillColor(41, 128, 185);
      doc.rect(10, y - 5, pageWidth - 20, 8, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);

      doc.text('S.No', 13, y);
      doc.text('Invoice No', 30, y);
      doc.text('Date', 65, y);
      doc.text('Due No', 95, y);
      doc.text('Due Amt (₹)', 115, y);
      doc.text('Received (₹)', 145, y);
      doc.text('Balance (₹)', 175, y);
      doc.text('Arrear (₹)', 205, y);
      doc.text('Staff', 235, y);

      doc.setTextColor(0, 0, 0);
      y += 10;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      let planTotalPaid = 0;
      let planTotalPending = 0;

      // Invoices for this plan
      planInvoices.forEach((inv: any) => {
        // Check if we need a new page
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 20;

          // Redraw table header on new page
          doc.setFillColor(41, 128, 185);
          doc.rect(10, y - 5, pageWidth - 20, 8, 'F');

          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);

          doc.text('S.No', 13, y);
          doc.text('Invoice No', 30, y);
          doc.text('Date', 65, y);
          doc.text('Due No', 95, y);
          doc.text('Due Amt (₹)', 115, y);
          doc.text('Received (₹)', 145, y);
          doc.text('Balance (₹)', 175, y);
          doc.text('Arrear (₹)', 205, y);
          doc.text('Staff', 235, y);

          doc.setTextColor(0, 0, 0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);

          y += 10;
        }

        const invoiceNo = String(inv.invoiceNumber || inv.receiptNo || 'N/A');
        const invoiceDate = new Date(inv.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        const dueNo = inv.receiptDetails?.dueNo || inv.dueNo || 'N/A';
        const dueAmount = inv.receiptDetails?.dueAmount || inv.dueAmount || 0;
        const receivedAmount = inv.receiptDetails?.receivedAmount || inv.receivedAmount || 0;
        const balanceAmount = inv.receiptDetails?.balanceAmount || inv.balanceAmount || 0;
        const arrearAmount = inv.receiptDetails?.arrearAmount || inv.arrearAmount || 0;
        const staffName = staffMap.get(inv.createdBy) || 'Unknown';

        planTotalPaid += receivedAmount;
        planTotalPending += balanceAmount;

        const truncatedStaffName = String(staffName).length > 15 ? String(staffName).substring(0, 12) + '...' : String(staffName);

        // Alternate row colors
        if (overallSerialNo % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(10, y - 5, pageWidth - 20, 7, 'F');
        }

        doc.text(overallSerialNo.toString(), 13, y);
        doc.text(invoiceNo, 30, y);
        doc.text(invoiceDate, 65, y);
        doc.text(String(dueNo), 95, y);
        doc.text(dueAmount.toLocaleString('en-IN'), 115, y);
        doc.text(receivedAmount.toLocaleString('en-IN'), 145, y);
        doc.text(balanceAmount.toLocaleString('en-IN'), 175, y);
        doc.text(arrearAmount.toLocaleString('en-IN'), 205, y);
        doc.text(truncatedStaffName, 235, y);

        y += 7;
        overallSerialNo++;
      });

      // Plan subtotal
      y += 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setFillColor(230, 240, 255);
      doc.rect(10, y - 5, pageWidth - 20, 7, 'F');

      doc.text(`Subtotal (${planInvoices.length} invoices):`, 15, y);
      doc.text('Paid: ₹' + planTotalPaid.toLocaleString('en-IN'), 115, y);
      doc.text('Pending: ₹' + planTotalPending.toLocaleString('en-IN'), 175, y);

      grandTotalPaid += planTotalPaid;
      grandTotalPending += planTotalPending;

      y += 12;
      doc.setFont('helvetica', 'normal');
    }

    // Grand total section
    y += 5;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(10, y, pageWidth - 10, y);

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Grand Total:', 15, y);
    doc.text(`Invoices: ${invoices.length}`, 60, y);
    doc.text(`Plans: ${invoicesByPlan.size}`, 110, y);
    doc.setTextColor(0, 128, 0);
    doc.text('Total Paid: ₹' + grandTotalPaid.toLocaleString('en-IN'), 150, y);
    doc.setTextColor(255, 100, 0);
    doc.text('Total Pending: ₹' + grandTotalPending.toLocaleString('en-IN'), 210, y);
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
    let filename = `user-report-${userId}-${(user as any).name.replace(/\s+/g, '-')}`;
    if (planIdsParam) {
      filename += '-selected-plans';
    } else {
      filename += '-all-plans';
    }
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
    console.error('Single user report PDF error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate PDF report',
      details: error.message
    }, { status: 500 });
  }
}

// Helper function to generate empty user report PDF
function generateEmptyUserReportPDF(
  user: any,
  planIdsParam: string | null,
  specificDate: string | null,
  startDate: string | null,
  endDate: string | null
) {
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
  doc.text('User Invoice Report', pageWidth / 2, 40, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`User: ${user.name} (${user.userId})`, pageWidth / 2, 50, { align: 'center' });

  let dateRangeText = '';
  if (specificDate) {
    dateRangeText = `Date: ${new Date(specificDate).toLocaleDateString('en-IN')}`;
  } else if (startDate && endDate) {
    dateRangeText = `Period: ${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}`;
  } else {
    dateRangeText = 'All Time';
  }
  doc.text(dateRangeText, pageWidth / 2, 57, { align: 'center' });

  const planText = planIdsParam ? 'Selected Plans' : 'All Plans';
  doc.text(planText, pageWidth / 2, 64, { align: 'center' });

  // Empty state message
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('No invoices found for the selected criteria', pageWidth / 2, 90, { align: 'center' });

  doc.setFontSize(10);
  doc.text('This user has no invoices matching the selected filters', pageWidth / 2, 100, { align: 'center' });

  const pdfOutput = doc.output('arraybuffer');
  const pdfBuffer = Buffer.from(pdfOutput);

  let filename = `user-report-${user.userId}-${user.name.replace(/\s+/g, '-')}`;
  if (planIdsParam) {
    filename += '-selected-plans';
  } else {
    filename += '-all-plans';
  }
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
