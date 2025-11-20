'use client';

import React, { useState, useEffect } from 'react';
import { isDesktopApp } from '@/lib/isDesktopApp';
import { fetchWithCache } from '@/lib/fetchWithCache';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './StaffDashboard';
import UserDashboard from './UserDashboard';

interface User {
  userId: string;
  email: string;
  role: 'admin' | 'staff' | 'user';
  name: string;
}

export default function MainDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    // Redirect staff users directly to invoice management
    if (user && user.role === 'staff') {
      window.location.href = '/staff/invoices';
    }
  }, [user]);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      if (isDesktopApp()) {
        const res = await fetchWithCache<User>('/api/auth/me', 'users');
        setUser(res.data as any);
        setOfflineMode(res.fromCache);
      } else {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Authentication failed');
        }
        const result = await response.json();
        setUser(result.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      localStorage.removeItem('auth-token');
    } finally {
      setLoading(false);
    }
  };
  // Banner for offline mode (Electron only)
  const OfflineBanner = () => (
    isDesktopApp() && offlineMode ? (
      <div style={{ background: '#f59e42', color: '#fff', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
        Offline Mode: Data may be outdated. Write actions are disabled.
      </div>
    ) : null
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              {error || 'Please log in to access the dashboard'}
            </p>
            <Button 
              onClick={() => window.location.href = '/login'} 
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render appropriate dashboard based on user role
  switch (user.role) {
    case 'admin':
      return <>
        <OfflineBanner />
        <AdminDashboard />
      </>;
    case 'staff':
      // Staff users will be redirected to /staff in useEffect
      return (
        <>
          <OfflineBanner />
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>Redirecting...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
                <p className="text-center text-slate-600">Taking you to the staff dashboard...</p>
              </CardContent>
            </Card>
          </div>
        </>
      );
    case 'user':
      return <>
        <OfflineBanner />
        <UserDashboard />
      </>;
    default:
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">Your account role is not recognized.</p>
            </CardContent>
          </Card>
        </div>
      );
  }
}