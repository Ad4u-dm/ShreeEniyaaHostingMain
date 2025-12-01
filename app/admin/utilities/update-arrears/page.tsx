/**
 * Admin Utility: Arrear Update Tool
 * 
 * This page allows admins to manually trigger the arrear update process
 * that normally runs on the 21st of every month.
 * 
 * Route: /admin/utilities/update-arrears
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

export default function UpdateArrearsPage() {
  const [loading, setLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Check if today is last day of month
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const isLastDayOfMonth = currentDay === lastDayOfMonth;
  const is21st = currentDay === 21;
  const isValidDay = is21st || isLastDayOfMonth;

  const handleUpdateArrears = async (force = false) => {
    if (!force && !isValidDay && !confirm('This is not a valid arrear update day. Are you sure you want to run it?')) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/admin/update-arrears', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ force })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update arrears');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClearArrears = async () => {
    if (!confirm('⚠️ WARNING: This will set ALL arrears to ₹0 for all active enrollments. Continue?')) {
      return;
    }

    setClearLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/clear-arrears', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ clearAll: true })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear arrears');
      }

      alert(`✅ Successfully cleared arrears for ${data.clearedCount} enrollments`);
      setResult(null); // Clear previous results
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setClearLoading(false);
    }
  };

  const handleSetInitialArrears = async () => {
    if (!confirm('💡 This will set arrears to 1st monthly amount for enrollments without invoices. Continue?')) {
      return;
    }

    setInitialLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/set-initial-arrears', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set initial arrears');
      }

      setResult(data); // Show results
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setInitialLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Arrear Update Utility</h1>

      {/* Information Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Monthly Arrear Update
          </CardTitle>
          <CardDescription>
            Automatically update arrears for all active enrollments based on their due number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">How it works:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li><strong>Due 1 (First Month):</strong> Update on last day of enrollment month</li>
                <li><strong>Due 2+ (Subsequent Months):</strong> Update on 21st of every month</li>
                <li>Arrear is set to previous invoice's balance amount</li>
                <li>The updated arrear is applied when creating the next invoice</li>
              </ul>
            </div>

            <Alert className={isValidDay ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}>
              <AlertDescription>
                {isValidDay ? (
                  <span className="text-green-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    {is21st && `Today is the 21st - Perfect for updating Due 2+ arrears!`}
                    {isLastDayOfMonth && !is21st && `Today is the last day of the month - Perfect for updating Due 1 arrears!`}
                    {is21st && isLastDayOfMonth && `Today is both the 21st AND last day of month - Update all arrears!`}
                  </span>
                ) : (
                  <span className="text-yellow-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Today is {currentDay}th - Valid days are: 21st (Due 2+) or last day of month (Due 1)
                  </span>
                )}
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => handleUpdateArrears(!isValidDay)}
            disabled={loading || clearLoading || initialLoading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                {isValidDay ? 'Update Arrears for All Customers' : 'Force Update (Testing Only)'}
              </>
            )}
          </Button>

          <Button
            onClick={handleSetInitialArrears}
            disabled={loading || clearLoading || initialLoading}
            variant="outline"
            className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
            size="lg"
          >
            {initialLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Set Initial Arrears (1st Month Amount)
              </>
            )}
          </Button>

          <Button
            onClick={handleClearArrears}
            disabled={loading || clearLoading || initialLoading}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            {clearLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <AlertCircle className="mr-2 h-4 w-4" />
                Clear All Arrears (Set to ₹0)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Results Display */}
      {result && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              Update Completed Successfully
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{result.summary.total}</div>
                  <div className="text-xs text-gray-600">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{result.summary.updated}</div>
                  <div className="text-xs text-gray-600">Updated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{result.summary.skipped}</div>
                  <div className="text-xs text-gray-600">Skipped</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{result.summary.errors}</div>
                  <div className="text-xs text-gray-600">Errors</div>
                </div>
              </div>

              {/* Note */}
              <Alert>
                <AlertDescription>
                  {result.note}
                </AlertDescription>
              </Alert>

              {/* Details - Updated */}
              {result.details?.updated && result.details.updated.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Updated Customers ({result.details.updated.length}):</h3>
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Customer ID</th>
                          <th className="p-2 text-center">Due #</th>
                          <th className="p-2 text-left">Reason</th>
                          <th className="p-2 text-right">Prev Balance</th>
                          <th className="p-2 text-right">New Arrear</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.details.updated.map((item: any, index: number) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">{item.userId}</td>
                            <td className="p-2 text-center">{item.dueNumber}</td>
                            <td className="p-2 text-xs text-gray-600">
                              {item.updateReason}
                              {item.source && <div className="text-xs text-blue-600 mt-1">{item.source}</div>}
                            </td>
                            <td className="p-2 text-right">₹{item.previousBalance}</td>
                            <td className="p-2 text-right font-semibold">₹{item.newArrear}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Details - Skipped */}
              {result.details?.skipped && result.details.skipped.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Skipped Customers ({result.details.skipped.length}):</h3>
                  <div className="max-h-40 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Customer ID</th>
                          <th className="p-2 text-center">Due #</th>
                          <th className="p-2 text-left">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.details.skipped.map((item: any, index: number) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">{item.userId}</td>
                            <td className="p-2 text-center">{item.dueNumber || '-'}</td>
                            <td className="p-2 text-gray-600">{item.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Details - Errors */}
              {result.details?.errors && result.details.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-600">Errors ({result.details.errors.length}):</h3>
                  <div className="max-h-40 overflow-y-auto border border-red-200 rounded-lg p-2 text-sm bg-red-50">
                    {result.details.errors.map((item: any, index: number) => (
                      <div key={index} className="py-1 text-red-700">
                        {item.userId} - {item.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
