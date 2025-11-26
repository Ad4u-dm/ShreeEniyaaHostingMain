import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Invoice from '@/models/Invoice';
import User from '@/models/User';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';

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
    const invoices = await Invoice.find(invoiceQuery).lean();

    // Collect all userIds and staffIds
    const userIds = invoices.map(inv => inv.customerId);
    const staffIds = invoices.map(inv => inv.createdBy);

    // Fetch user and staff details
    const users = await User.find({ userId: { $in: userIds } }).select('userId name');
    const staffs = await User.find({ userId: { $in: staffIds } }).select('userId name');
    const userMap = new Map(users.map(u => [u.userId, u.name]));
    const staffMap = new Map(staffs.map(s => [s.userId, s.name]));

    // Prepare PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    let buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    // Company logo and name
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 40, { width: 80 });
    }
    doc.fontSize(20).font('Helvetica-Bold').text('SHREE ENIYAA CHITFUNDS (P) LTD.', 130, 50);
    doc.moveDown(2);
    doc.fontSize(14).font('Helvetica').text(`Daily Collection Report - ${date}`, { align: 'center' });
    doc.moveDown(1);

    // Table header
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('User Name', 40, doc.y, { continued: true });
    doc.text('Payment Made', 220, doc.y, { continued: true });
    doc.text('Staff Name', 370, doc.y);
    doc.moveDown(0.5);
    doc.font('Helvetica');
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Table rows
    invoices.forEach(inv => {
      const userName = userMap.get(inv.customerId) || inv.customerDetails?.name || 'Unknown';
      const paymentMade = inv.receivedAmount || inv.totalAmount || 0;
      const staffName = staffMap.get(inv.createdBy) || 'Unknown';
      doc.text(userName, 40, doc.y, { continued: true });
      doc.text(paymentMade.toLocaleString('en-IN'), 220, doc.y, { continued: true });
      doc.text(staffName, 370, doc.y);
      doc.moveDown(0.3);
    });

    doc.end();
    const pdfBuffer = Buffer.concat(buffers);
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="daily-report-${date}.pdf"`
      }
    });
  } catch (error) {
    console.error('Daily invoice PDF error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate PDF report' }, { status: 500 });
  }
}
