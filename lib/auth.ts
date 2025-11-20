import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'staff' | 'user';
  name: string;
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Extract user from request
export function getUserFromRequest(request: Request): JWTPayload | null {
  // Extract token from Authorization header
  const authHeader = request.headers.get('authorization');
  let token = authHeader?.replace('Bearer ', '');

  // If not in header, try cookies (Next.js 15: use cookies() API in route, not here)
  // This function only supports header extraction for Web Request

  if (!token) return null;
  return verifyToken(token);
}

// Check if user has required role
export function hasRole(user: JWTPayload | null, requiredRoles: string[]): boolean {
  if (!user) return false;
  return requiredRoles.includes(user.role);
}

// Role hierarchy check (admin > staff > user)
export function hasMinimumRole(user: JWTPayload | null, minimumRole: 'admin' | 'staff' | 'user'): boolean {
  if (!user) return false;
  
  const roleHierarchy = { admin: 3, staff: 2, user: 1 };
  return roleHierarchy[user.role] >= roleHierarchy[minimumRole];
}