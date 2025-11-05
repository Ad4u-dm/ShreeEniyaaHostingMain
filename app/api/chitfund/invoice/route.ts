import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import Payment from '@/models/Payment';
import User from '@/models/User';
import ChitPlan from '@/models/ChitPlan';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';
import ChitFundInvoiceAdapter from '@/services/chitfund/InvoiceAdapter';
import { generatePdfService } from '@/services/invoice/server/generatePdfService';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user || !hasMinimumRole(user, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      enrollmentId, 
      action = 'create',
      options = {}
    } = await request.json();

    switch (action) {
      case 'create':
        return await handleCreateInvoice(enrollmentId, user.userId, options);
      
      case 'generate_pdf':
        return await handleGeneratePDF(enrollmentId, user.userId, options);
      
      case 'send_email':
        return await handleSendEmail(enrollmentId, user.userId, options);
      
      case 'bulk_create':
        return await handleBulkCreate(user.userId, options);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('ChitFund invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to process invoice request' },
      { status: 500 }
    );
  }
}

async function handleCreateInvoice(enrollmentId: string, staffId: string, options: any) {
  try {
    // Verify enrollment is assigned to this staff
    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      assignedStaff: staffId
    }).populate('userId planId');

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found or not assigned to you' },
        { status: 404 }
      );
    }

    // Get pending payments for this enrollment
    const pendingPayments = await Payment.find({
      enrollmentId: enrollmentId,
      status: 'pending',
      dueDate: { $lte: options.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
    }).sort({ dueDate: 1 });

    if (pendingPayments.length === 0) {
      return NextResponse.json(
        { error: 'No pending payments found for this customer' },
        { status: 400 }
      );
    }

    // Convert to ChitFund format
    const chitFundCustomer = {
      userId: {
        _id: enrollment.userId._id,
        name: enrollment.userId.name,
        email: enrollment.userId.email,
        phone: enrollment.userId.phone,
        address: enrollment.userId.address || {}
      },
      planId: {
        planName: enrollment.planId.planName,
        monthlyAmount: enrollment.planId.monthlyAmount,
        totalAmount: enrollment.planId.totalAmount,
        duration: enrollment.planId.duration
      },
      enrollmentId: enrollment.enrollmentId,
      memberNumber: enrollment.memberNumber,
      status: enrollment.status,
      totalPaid: enrollment.totalPaid,
      overdueAmount: pendingPayments
        .filter(p => new Date(p.dueDate) < new Date())
        .reduce((sum, p) => sum + (p.amount * 0.01 * Math.max(
          Math.floor((new Date().getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24)) - 7, 
          0
        )), 0)
    };

    const chitFundPayments = pendingPayments.map(payment => ({
      _id: payment._id,
      amount: payment.amount,
      installmentNumber: payment.installmentNumber,
      dueDate: payment.dueDate,
      paymentType: payment.paymentType,
      description: `${payment.paymentType} payment for ${enrollment.planId.planName}`
    }));

    // Create Invoify-compatible invoice data
    const invoiceData = ChitFundInvoiceAdapter.createInvoiceFromCustomer(
      chitFundCustomer,
      chitFundPayments,
      {
        dueDate: options.dueDate ? new Date(options.dueDate) : undefined,
        includeLateFee: options.includeLateFee || true,
        notes: options.notes,
        invoiceNumber: options.invoiceNumber
      }
    );

    return NextResponse.json({
      success: true,
      invoice: invoiceData,
      message: 'Invoice created successfully',
      totalAmount: invoiceData.details.totalAmount,
      itemCount: invoiceData.details.items.length
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    throw error;
  }
}

async function handleGeneratePDF(enrollmentId: string, staffId: string, options: any) {
  try {
    // First create the invoice data
    const createResponse = await handleCreateInvoice(enrollmentId, staffId, options);
    const createResponseJson = await createResponse.json();
    
    if (!createResponseJson.success) {
      return createResponse;
    }

    const invoiceData = createResponseJson.invoice;

    // Create a mock request for the PDF service
    const mockRequest = {
      json: async () => invoiceData
    } as NextRequest;

    // Use Invoify's PDF generation service
    const pdfResponse = await generatePdfService(mockRequest);
    
    return pdfResponse;

  } catch (error) {
    console.error('Generate PDF error:', error);
    throw error;
  }
}

async function handleSendEmail(enrollmentId: string, staffId: string, options: any) {
  try {
    // Generate PDF first
    const pdfResponse = await handleGeneratePDF(enrollmentId, staffId, options);
    
    if (!pdfResponse.ok) {
      return pdfResponse;
    }

    // Get enrollment details for email
    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      assignedStaff: staffId
    }).populate('userId planId');

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    // Here you would integrate with email service (SendGrid, AWS SES, etc.)
    // For now, we'll simulate email sending
    const emailData = {
      to: enrollment.userId.email,
      subject: `Payment Invoice - ${enrollment.planId.planName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Payment Invoice from Shri Iniya Chit Funds</h2>
          <p>Dear ${enrollment.userId.name},</p>
          <p>Please find attached your payment invoice for <strong>${enrollment.planId.planName}</strong>.</p>
          <p><strong>Enrollment ID:</strong> ${enrollment.enrollmentId}</p>
          <p><strong>Member Number:</strong> ${enrollment.memberNumber}</p>
          <p>Please make payment before the due date to avoid late charges.</p>
          <p>For any queries, please contact us at info@shriin iyachitfunds.com or call +91-9876543210.</p>
          <br>
          <p>Best regards,<br>Shri Iniya Chit Funds Team</p>
        </div>
      `,
      attachments: [
        {
          filename: `Invoice-${enrollment.enrollmentId}.pdf`,
          content: await pdfResponse.arrayBuffer()
        }
      ]
    };

    // TODO: Implement actual email sending
    console.log('Email would be sent to:', emailData.to);

    return NextResponse.json({
      success: true,
      message: `Invoice sent to ${enrollment.userId.email}`,
      emailData: {
        to: emailData.to,
        subject: emailData.subject
      }
    });

  } catch (error) {
    console.error('Send email error:', error);
    throw error;
  }
}

async function handleBulkCreate(staffId: string, options: any) {
  try {
    const { customerIds, dueDate, includeLateFee, notes } = options;

    if (!customerIds || !Array.isArray(customerIds)) {
      return NextResponse.json(
        { error: 'Customer IDs array is required' },
        { status: 400 }
      );
    }

    // Get all enrollments for this staff and specified customers
    const enrollments = await Enrollment.find({
      assignedStaff: staffId,
      userId: { $in: customerIds }
    }).populate('userId planId');

    const results = [];
    const errors = [];

    for (const enrollment of enrollments) {
      try {
        const createResponse = await handleCreateInvoice(enrollment._id, staffId, {
          dueDate,
          includeLateFee,
          notes: notes || `Bulk invoice for ${enrollment.planId.planName}`
        });
        
        const result = await createResponse.json();
        if (result.success) {
          results.push({
            customerId: enrollment.userId._id,
            customerName: enrollment.userId.name,
            enrollmentId: enrollment.enrollmentId,
            totalAmount: result.totalAmount,
            itemCount: result.itemCount
          });
        } else {
          errors.push({
            customerId: enrollment.userId._id,
            customerName: enrollment.userId.name,
            error: result.error
          });
        }
      } catch (error) {
        errors.push({
          customerId: enrollment.userId._id,
          customerName: enrollment.userId.name,
          error: 'Failed to create invoice'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk invoice creation completed`,
      results: {
        successful: results.length,
        failed: errors.length,
        successfulInvoices: results,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Bulk create error:', error);
    throw error;
  }
}