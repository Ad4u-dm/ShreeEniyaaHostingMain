import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Auth test endpoint called');
    
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'No token',
        hasHeader: !!authHeader,
        startsWithBearer: authHeader?.startsWith('Bearer ')
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('Token length:', token.length);
    
    if (!process.env.JWT_SECRET) {
      return NextResponse.json({ error: 'JWT_SECRET not configured' }, { status: 500 });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    console.log('Token decoded successfully:', decoded);
    
    return NextResponse.json({
      success: true,
      user: decoded,
      message: 'Authentication working'
    });

  } catch (error) {
    console.error('Auth test error:', error);
    return NextResponse.json({ 
      error: 'Token verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 401 });
  }
}