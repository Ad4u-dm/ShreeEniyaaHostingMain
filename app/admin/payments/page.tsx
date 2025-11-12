'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, IndianRupee, Calendar, User, Phone, Filter, Download, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formatIndianNumber } from '@/lib/helpers';

interface Payment {
  _id: string;
  userId?: {
    _id: string;
    name: string;
    phone: string;
    email: string;
  } | null;
  planId?: {
    planName: string;
    monthlyAmount: number;
  } | null;
  enrollmentId?: {
    enrollmentId: string;
    memberNumber: number;
  } | null;
  amount: number;
  dueDate: string;
  paidDate?: string;
  receiptNumber?: string;
  status: string;
  paymentMethod: string;
  installmentNumber: number;
  collectedBy?: {
    name: string;
  };
  createdAt: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    todayPayments: 0,
    pendingPayments: 0,
    completedPayments: 0
  });

  useEffect(() => {
    fetchPayments();
  }, [searchTerm, filterStatus, filterMethod]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(filterMethod !== 'all' && { paymentMethod: filterMethod })
      });

      const response = await fetch(`/api/admin/payments?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Payments data received:', data);
        
        // Ensure all payments have proper structure
        const safePayments = (data.payments || []).map((payment: any) => ({
          ...payment,
          userId: payment.userId || { name: 'Unknown User', phone: 'N/A', email: 'N/A' },
          planId: payment.planId || { planName: 'Unknown Plan' },
          enrollmentId: payment.enrollmentId || { enrollmentId: 'N/A' }
        }));
        
        setPayments(safePayments);
        
        // Use stats from API or calculate them
        if (data.stats) {
          setStats(data.stats);
        } else {
          // Fallback calculation
          const totalAmount = data.payments?.reduce((sum: number, p: Payment) => sum + p.amount, 0) || 0;
          const todayPayments = data.payments?.filter((p: Payment) => {
            const paymentDate = p.paidDate || p.createdAt;
            return new Date(paymentDate).toDateString() === new Date().toDateString();
          }).length || 0;

          setStats({
            totalPayments: data.payments?.length || 0,
            totalAmount,
            todayPayments,
            pendingPayments: data.payments?.filter((p: Payment) => p.status === 'pending').length || 0,
            completedPayments: data.payments?.filter((p: Payment) => p.status === 'completed').length || 0
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      
      // Set empty data as fallback
      setPayments([]);
      setStats({
        totalPayments: 0,
        totalAmount: 0,
        todayPayments: 0,
        pendingPayments: 0,
        completedPayments: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const exportPayments = () => {
    // Simple CSV export
    const headers = ['Date', 'Customer', 'Plan', 'Amount', 'Status', 'Method', 'Receipt'];
    const csvData = payments.map(payment => [
      new Date(payment.paidDate || payment.createdAt).toLocaleDateString('en-IN'),
      payment.userId?.name || 'Unknown User',
      payment.planId?.planName || 'Unknown Plan',
      payment.amount,
      payment.status,
      payment.paymentMethod,
      payment.receiptNumber || ''
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Payments & Transactions</h1>
              <p className="text-slate-600">View and manage all payment transactions</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              onClick={exportPayments}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button 
              onClick={fetchPayments}
              variant="outline"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-green-500" />
                <span className="text-xl font-bold text-slate-800">
                  ₹{formatIndianNumber(stats.totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold text-slate-800">{stats.completedPayments}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <span className="text-2xl font-bold text-slate-800">{stats.pendingPayments}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, phone, or receipt number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Methods</option>
                <option value="cash">Cash</option>
                <option value="online">Online</option>
                <option value="cheque">Cheque</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Payments List */}
        <Card>
          <CardHeader>
            <CardTitle>All Payments ({payments.length})</CardTitle>
            <CardDescription>Complete transaction history and payment records</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12">
                <IndianRupee className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No Payments Found</h3>
                <p className="text-gray-500">No payments match your current filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Customer</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Plan</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Method</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments && payments.length > 0 ? payments.map((payment) => {
                      // Extra safety check
                      if (!payment) return null;
                      
                      return (
                        <tr key={payment._id} className="border-b hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{payment.userId?.name || 'Unknown User'}</p>
                                <p className="text-sm text-slate-600 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {payment.userId?.phone || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-slate-800">{payment.planId?.planName || 'Unknown Plan'}</p>
                            <p className="text-sm text-slate-600">#{payment.enrollmentId?.enrollmentId || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800">
                            ₹{formatIndianNumber(payment.amount)}
                          </p>
                          <p className="text-sm text-slate-600">
                            Installment #{payment.installmentNumber}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`${getStatusColor(payment.status)} flex items-center gap-1`}>
                            {getStatusIcon(payment.status)}
                            {payment.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize text-slate-700">
                            {payment.paymentMethod.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-slate-700">
                            {new Date(payment.paidDate || payment.createdAt).toLocaleDateString('en-IN')}
                          </p>
                          <p className="text-sm text-slate-600">
                            {new Date(payment.paidDate || payment.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          {payment.receiptNumber ? (
                            <p className="text-slate-700 font-mono text-sm">
                              {payment.receiptNumber}
                            </p>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-600">
                          No payments found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}