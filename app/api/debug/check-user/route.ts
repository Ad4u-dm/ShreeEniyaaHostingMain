import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'Name parameter required' }, { status: 400 });
    }

    // Find user by name
    const user = await User.findOne({ name: new RegExp(name, 'i') })
      .select('userId name email phone role createdAt')
      .lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find enrollments for this user
    const enrollments = await Enrollment.find({ userId: user.userId })
      .populate('planId', 'planName totalAmount monthlyAmount')
      .lean();

    return NextResponse.json({
      success: true,
      user,
      enrollments,
      enrollmentCount: enrollments.length,
      message: `User "${user.name}" has ${enrollments.length} enrollment(s)`
    });

  } catch (error) {
    console.error('Debug check error:', error);
    return NextResponse.json(
      { error: 'Failed to check user data' },
      { status: 500 }
    );
  }
}
