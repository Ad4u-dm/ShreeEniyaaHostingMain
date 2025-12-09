import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes (login, register, static files, api auth endpoints)
  const publicRoutes = [
    '/login',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
  ];

  // Check if it's a public route
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/robots') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Get token from cookies or Authorization header
  const token = request.cookies.get('auth-token')?.value ||
                request.headers.get('authorization')?.replace('Bearer ', '');

  // If no token, redirect to login for protected pages
  if (!token) {
    // Only redirect page routes, not API routes (let API handle its own auth)
    if (!pathname.startsWith('/api/')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Verify token
  const user = verifyToken(token);

  // If token invalid, redirect to login for protected pages
  if (!user) {
    if (!pathname.startsWith('/api/')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Role-based access control for page routes
  if (!pathname.startsWith('/api/')) {
    // Admin routes - require admin role
    if (pathname.startsWith('/admin') && user.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Staff routes - require staff or admin role
    if (pathname.startsWith('/staff') && user.role !== 'staff' && user.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // If logged in user tries to access login page, redirect to dashboard
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Allow the request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon-*.png (favicon files)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
