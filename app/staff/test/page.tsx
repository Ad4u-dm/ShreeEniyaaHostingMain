'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StaffTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAuth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-auth', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      const data = await response.json();
      setResult({ type: 'auth-test', response: data, status: response.status });
    } catch (error) {
      setResult({ type: 'auth-test', error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const testDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/staff/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      const data = await response.json();
      setResult({ type: 'dashboard-test', response: data, status: response.status });
    } catch (error) {
      setResult({ type: 'dashboard-test', error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const checkToken = () => {
    const token = localStorage.getItem('auth-token');
    setResult({ 
      type: 'token-check', 
      hasToken: !!token, 
      tokenLength: token?.length || 0,
      tokenPreview: token?.substring(0, 20) + '...' || 'No token'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Staff API Debug Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={checkToken} variant="outline">
                Check Token
              </Button>
              <Button onClick={testAuth} disabled={loading}>
                Test Auth
              </Button>
              <Button onClick={testDashboard} disabled={loading}>
                Test Dashboard
              </Button>
            </div>

            {result && (
              <div className="mt-6 p-4 bg-gray-100 rounded-md">
                <h3 className="font-semibold mb-2">Result ({result.type}):</h3>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}