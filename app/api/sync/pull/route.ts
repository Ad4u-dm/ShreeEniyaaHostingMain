import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Plan from '@/models/Plan';
import Enrollment from '@/models/Enrollment';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import { getUserFromRequest, hasMinimumRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get('since');
    const limitParam = searchParams.get('limit');
    
    // Parse since timestamp (default to epoch 0 for initial sync)
    const since = sinceParam ? new Date(sinceParam) : new Date(0);
    const limit = limitParam ? parseInt(limitParam) : 1000;

    console.log(`[Sync Pull] User: ${user.email}, Since: ${since.toISOString()}, Limit: ${limit}`);

    const changes: any[] = [];
    const serverTime = new Date();

    // Query all collections for changes since timestamp
    // Use updatedAt field which should exist on all models
    
    // 1. Users
    const users = await User.find({ 
      updatedAt: { $gt: since },
      deletedAt: null // Exclude soft-deleted
    })
    .limit(limit)
    .lean();
    
    users.forEach(u => {
      changes.push({
        type: 'upsert',
        collection: 'users',
        mongoId: u._id.toString(),
        payload: {
          ...u,
          _id: u._id.toString(),
          createdBy: typeof u.createdBy === 'object' ? u.createdBy?.toString() : u.createdBy,
          assignedBy: typeof u.assignedBy === 'object' ? u.assignedBy?.toString() : u.assignedBy,
        },
        updatedAt: u.updatedAt || u.createdAt
      });
    });

    // 2. Plans
    const plans = await Plan.find({ 
      updatedAt: { $gt: since } 
    })
    .limit(limit)
    .lean();
    
    plans.forEach(p => {
      changes.push({
        type: 'upsert',
        collection: 'plans',
        mongoId: p._id.toString(),
        payload: {
          ...p,
          _id: p._id.toString(),
          createdBy: typeof p.createdBy === 'object' ? p.createdBy?.toString() : p.createdBy,
        },
        updatedAt: p.updatedAt || p.createdAt
      });
    });

    // 3. Enrollments
    const enrollments = await Enrollment.find({ 
      updatedAt: { $gt: since } 
    })
    .limit(limit)
    .lean();
    
    enrollments.forEach(e => {
      changes.push({
        type: 'upsert',
        collection: 'enrollments',
        mongoId: e._id.toString(),
        payload: {
          ...e,
          _id: e._id.toString(),
          userId: typeof e.userId === 'object' ? e.userId?.toString() : e.userId,
          planId: typeof e.planId === 'object' ? e.planId?.toString() : e.planId,
          createdBy: typeof e.createdBy === 'object' ? e.createdBy?.toString() : e.createdBy,
        },
        updatedAt: e.updatedAt || e.createdAt
      });
    });

    // 4. Invoices
    const invoices = await Invoice.find({ 
      updatedAt: { $gt: since } 
    })
    .limit(limit)
    .lean();
    
    invoices.forEach(i => {
      changes.push({
        type: 'upsert',
        collection: 'invoices',
        mongoId: i._id.toString(),
        payload: {
          ...i,
          _id: i._id.toString(),
          customerId: typeof i.customerId === 'object' ? i.customerId?.toString() : i.customerId,
          planId: typeof i.planId === 'object' ? i.planId?.toString() : i.planId,
          createdBy: typeof i.createdBy === 'object' ? i.createdBy?.toString() : i.createdBy,
        },
        updatedAt: i.updatedAt || i.createdAt
      });
    });

    // 5. Payments
    const payments = await Payment.find({ 
      updatedAt: { $gt: since } 
    })
    .limit(limit)
    .lean();
    
    payments.forEach(p => {
      changes.push({
        type: 'upsert',
        collection: 'payments',
        mongoId: p._id.toString(),
        payload: {
          ...p,
          _id: p._id.toString(),
          userId: typeof p.userId === 'object' ? p.userId?.toString() : p.userId,
          invoiceId: typeof p.invoiceId === 'object' ? p.invoiceId?.toString() : p.invoiceId,
          createdBy: typeof p.createdBy === 'object' ? p.createdBy?.toString() : p.createdBy,
        },
        updatedAt: p.updatedAt || p.createdAt
      });
    });

    console.log(`[Sync Pull] Returning ${changes.length} changes`);

    return NextResponse.json({
      success: true,
      serverTime: serverTime.toISOString(),
      changes,
      count: changes.length,
      hasMore: changes.length >= limit
    });

  } catch (error) {
    console.error('[Sync Pull] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to sync data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
