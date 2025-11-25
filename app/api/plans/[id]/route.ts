import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Plan from '@/models/Plan';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

  const { id } = await params;
    const plan = await Plan.findById(id);
    
    if (!plan) {
      return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, plan });
  } catch (error) {
    console.error('Get plan error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
  const { id } = await params;
  const user = getUserFromRequest(req);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      planName,
      planType,
      totalAmount,
      duration,
      monthlyData,
      totalMembers,
      commissionRate,
      processingFee,
      auctionDay,
      auctionTime,
      description,
      terms,
      status
  } = await req.json();

    // Validate required fields
    if (!planName || !totalAmount || !duration || !monthlyData || monthlyData.length === 0) {
      return NextResponse.json({ 
        error: 'Plan name, total amount, duration, and monthly data are required' 
      }, { status: 400 });
    }

    // Validate monthly data
    if (monthlyData.length !== duration) {
      return NextResponse.json({ 
        error: 'Monthly data must match plan duration' 
      }, { status: 400 });
    }

    // Auto-calculate dividend: Dividend = First due - Current Due
    let firstDue = 0;
    if (monthlyData.length > 0) {
      firstDue = monthlyData[0].installmentAmount || monthlyData[0].dueAmount || 0;
    }
    const normalizedMonthlyData = monthlyData.map((month: any) => {
      const currentDue = month.installmentAmount || month.dueAmount || 0;
      const dividend = firstDue - currentDue;
      return {
        monthNumber: month.monthNumber,
        installmentAmount: currentDue,
        dividend,
        payableAmount: month.payableAmount || month.auctionAmount || 0
      };
    });

    const updatedPlan = await Plan.findByIdAndUpdate(
      id,
      {
        planName,
        planType: planType || 'monthly',
        totalAmount,
        duration,
        monthlyData: normalizedMonthlyData,
        totalMembers: totalMembers || 20,
        commissionRate: commissionRate || 5,
        processingFee: processingFee || 0,
        auctionDay: auctionDay || 1,
        auctionTime: auctionTime || '10:00',
        description,
        terms,
        status: status || 'active',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedPlan) {
      return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Plan updated successfully',
      plan: updatedPlan 
    });
  } catch (error) {
    console.error('Update plan error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    
  const { id } = await params;
    const user = getUserFromRequest(req);
    if (!user || !hasMinimumRole(user, 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plan = await Plan.findById(id);
    
    if (!plan) {
      return NextResponse.json({ success: false, message: 'Plan not found' }, { status: 404 });
    }

    // Instead of deleting, mark as inactive
    plan.status = 'inactive';
    await plan.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Plan deactivated successfully' 
    });
  } catch (error) {
    console.error('Delete plan error:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}