'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  IndianRupee, 
  Calendar, 
  CheckCircle,
  AlertTriangle,
  Clock,
  Download,
  User,
  LogOut
} from 'lucide-react';
import { formatIndianNumber } from '@/lib/helpers';

interface UserDashboardData {
  stats: {
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    totalPaid: number;
    totalDue: number;
  };
  enrollments: any[];
  recentPayments: any[];
  upcomingPayments: any[];
}

export default function UserDashboard() {
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/user', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const result = await response.json();
      setData(result.dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const confirmLogout = confirm('Are you sure you want to logout?');
    if (confirmLogout) {
      // Clear authentication data
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user-data');
      
      // Redirect to login page
      window.location.href = '/login';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button onClick={fetchDashboardData} className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    {
      title: 'My Plans',
      value: `${data.stats.activeEnrollments}/${data.stats.totalEnrollments}`,
      subtitle: 'Active/Total',
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Completed Plans',
      value: data.stats.completedEnrollments,
      subtitle: 'Successfully completed',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Paid',
      value: `₹${formatIndianNumber(data.stats.totalPaid)}`,
      subtitle: 'Amount paid so far',
      icon: IndianRupee,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Outstanding Amount',
      value: `₹${formatIndianNumber(data.stats.totalDue)}`,
      subtitle: 'Remaining to pay',
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Next Payment',
      value: data.upcomingPayments.length > 0 ? new Date(data.upcomingPayments[0].dueDate).toLocaleDateString('en-IN') : 'N/A',
      subtitle: 'Due date',
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Overdue Payments',
      value: data.upcomingPayments.filter(p => p.daysPastDue > 0).length,
      subtitle: 'Need immediate attention',
      icon: Clock,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">My Dashboard</h1>
            <p className="text-slate-600 mt-1">Track your chit fund investments</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={fetchDashboardData} variant="outline">
              Refresh Data
            </Button>
            <Button onClick={handleLogout} variant="destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
                  <p className="text-xs text-slate-500 mt-1">{stat.subtitle}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Upcoming Payments */}
        {data.upcomingPayments.length > 0 && (
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-500" />
                Upcoming Payments
              </CardTitle>
              <CardDescription>Your scheduled payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.upcomingPayments.slice(0, 5).map((payment, index) => {
                  const dueDate = new Date(payment.dueDate);
                  const isOverdue = payment.daysPastDue > 0;
                  
                  return (
                    <div key={index} className={`flex items-center justify-between p-4 rounded-lg border-l-4 ${
                      isOverdue 
                        ? 'bg-gradient-to-r from-red-50 to-red-100 border-l-red-400' 
                        : 'bg-gradient-to-r from-slate-50 to-slate-100 border-l-blue-400'
                    }`}>
                      <div>
                        <p className="font-medium text-slate-800">{payment.planName}</p>
                        <p className="text-sm text-slate-600">Enrollment ID: {payment.enrollmentId}</p>
                        <p className="text-xs text-slate-500">
                          Due: {dueDate.toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                          ₹{payment.amount?.toLocaleString('en-IN')}
                        </p>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            {payment.daysPastDue} days overdue
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Enrollments & Recent Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Enrollments */}
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-slate-800">My Plans</CardTitle>
              <CardDescription>Your chit fund enrollments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.enrollments.map((enrollment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">{enrollment.planId?.planName}</p>
                      <p className="text-sm text-slate-600">
                        Member #{enrollment.memberNumber} • {enrollment.planId?.planType}
                      </p>
                      <p className="text-xs text-slate-500">
                        ₹{enrollment.planId?.installmentAmount?.toLocaleString('en-IN')} per {enrollment.planId?.planType?.slice(0, -2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={enrollment.status === 'active' ? 'default' : 
                                    enrollment.status === 'completed' ? 'secondary' : 'destructive'}>
                        {enrollment.status}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-1">
                        {enrollment.assignedStaff?.name}
                      </p>
                    </div>
                  </div>
                ))}
                {data.enrollments.length === 0 && (
                  <p className="text-slate-500 text-center py-8">No enrollments found</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-slate-800">Recent Payments</CardTitle>
              <CardDescription>Your payment history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentPayments.slice(0, 5).map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">{payment.planId?.planName}</p>
                      <p className="text-sm text-slate-600">Receipt: {payment.receiptNumber}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(payment.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-emerald-600">
                        ₹{payment.amount.toLocaleString('en-IN')}
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-1 h-6 text-xs"
                        onClick={() => {/* Download receipt */}}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                ))}
                {data.recentPayments.length === 0 && (
                  <p className="text-slate-500 text-center py-8">No payments found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}