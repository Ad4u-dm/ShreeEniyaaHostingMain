'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  UserCheck, 
  FileText, 
  Calendar, 
  IndianRupee, 
  TrendingUp,
  AlertTriangle,
  Clock,
  LogOut,
  UserPlus,
  BarChart3,
  Receipt,
  Plus,
  PieChart
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);
import { formatIndianNumber } from '@/lib/helpers';
import InvoiceActionModal from '@/app/components/modals/InvoiceActionModal';

interface AdminDashboardData {
  stats: {
    totalUsers: number;
    totalStaff: number;
    totalPlans: number;
    activePlans: number;
    totalEnrollments: number;
    activeEnrollments: number;
    totalPayments: number;
    todayPayments: number;
    monthlyRevenue: number;
    pendingPayments: number;
  };
  recentActivity: {
    enrollments: any[];
    payments: any[];
  };
  staffPerformance: any[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showInvoiceManager, setShowInvoiceManager] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/admin', {
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('auth-token');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API fails
      localStorage.removeItem('auth-token');
      window.location.href = '/login';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
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
      title: 'Total Users',
      value: data.stats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      clickable: true,
      route: '/admin/users'
    },
    {
      title: 'Staff Members',
      value: data.stats.totalStaff,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      clickable: true,
      route: '/admin/staff'
    },

    {
      title: 'Available Plans',
      value: 4, // From plans.json
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      clickable: true,
      route: '/admin/plans'
    },
    {
      title: 'Today\'s Payments',
      value: data.stats.todayPayments,
      icon: IndianRupee,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      clickable: true,
      route: '/admin/payments'
    },
    {
      title: 'Monthly Revenue',
      value: `₹${formatIndianNumber(data.stats.monthlyRevenue)}`,
      icon: TrendingUp,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      clickable: true,
      route: '/admin/revenue'
    },
    {
      title: 'Pending Payments',
      value: data.stats.pendingPayments,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      clickable: true,
      route: '/admin/pending'
    },
    {
      title: 'Total Payments',
      value: data.stats.totalPayments,
      icon: Clock,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      clickable: true,
      route: '/admin/transactions'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Admin Dashboard</h1>
            <p className="text-slate-600 mt-1">Overview of your chit fund business</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowCreateUser(true)} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
            <Button onClick={() => setShowCreatePlan(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
            <Button onClick={() => setShowInvoiceManager(true)} className="bg-green-600 hover:bg-green-700">
              <Receipt className="h-4 w-4 mr-2" />
              Quick Invoices
            </Button>
            <Button onClick={() => window.location.href = '/admin/invoices'} className="bg-emerald-600 hover:bg-emerald-700">
              <FileText className="h-4 w-4 mr-2" />
              All Invoices
            </Button>
            <Button onClick={fetchDashboardData} variant="outline">
              Refresh Data
            </Button>
            <Button 
              onClick={handleLogout} 
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index} 
                className="bg-white/60 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
                onClick={() => stat.clickable && (window.location.href = stat.route)}
              >
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
                  {stat.clickable && (
                    <p className="text-xs text-slate-500 mt-1">Click to view details</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Revenue Chart */}
          <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Monthly Revenue
              </CardTitle>
              <CardDescription>Revenue trends over the year</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Bar 
                  data={{
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                      label: 'Revenue (₹)',
                      data: [45000, 52000, 48000, 60000, 55000, 62000, 58000, 65000, 60000, 68000, 62000, 70000],
                      backgroundColor: 'rgba(59, 130, 246, 0.5)',
                      borderColor: 'rgb(59, 130, 246)',
                      borderWidth: 2,
                    }]
                  }}
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                  }} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Trends */}
          <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Payment Trends
              </CardTitle>
              <CardDescription>Monthly payment volumes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Line 
                  data={{
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    datasets: [{
                      label: 'Payments',
                      data: [12, 15, 13, 17, 14, 18, 16, 19, 17, 20, 18, 22],
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      borderColor: 'rgb(16, 185, 129)',
                      borderWidth: 3,
                      tension: 0.4,
                      fill: true,
                    }]
                  }}
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                  }} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Plan Distribution */}
          <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-slate-800 flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Plan Distribution
              </CardTitle>
              <CardDescription>Enrollment distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <Doughnut 
                  data={{
                    labels: ['₹1L Plan', '₹2L Plan', '₹5L Plan', '₹10L Plan'],
                    datasets: [{
                      data: [4, 3, 2, 2],
                      backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(249, 115, 22, 0.8)',
                      ],
                      borderWidth: 0,
                    }]
                  }}
                  options={{ 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { 
                        position: 'bottom',
                        labels: { usePointStyle: true, padding: 15 }
                      }
                    }
                  }} 
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Enrollments */}
          <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-slate-800">Recent Enrollments</CardTitle>
              <CardDescription>Latest customer enrollments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentActivity.enrollments.slice(0, 5).map((enrollment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">{enrollment.userId?.name}</p>
                      <p className="text-sm text-slate-600">{enrollment.planId?.planName}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">Member #{enrollment.memberNumber}</Badge>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(enrollment.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
                {data.recentActivity.enrollments.length === 0 && (
                  <p className="text-slate-500 text-center py-8">No recent enrollments</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-slate-800">Recent Payments</CardTitle>
              <CardDescription>Latest payment collections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentActivity.payments.slice(0, 5).map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">{payment.userId?.name}</p>
                      <p className="text-sm text-slate-600">{payment.planId?.planName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-emerald-600">
                        ₹{payment.amount.toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(payment.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
                {data.recentActivity.payments.length === 0 && (
                  <p className="text-slate-500 text-center py-8">No recent payments</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff Performance */}
        {data.staffPerformance.length > 0 && (
          <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-slate-800">Top Performing Staff</CardTitle>
              <CardDescription>This month's collection leaders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.staffPerformance.map((staff, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-slate-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{staff.staff?.name}</p>
                        <p className="text-sm text-slate-600">{staff.paymentCount} payments</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">
                        ₹{formatIndianNumber(staff.totalCollected)}
                      </p>
                      <p className="text-xs text-slate-500">Total collected</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create User Modal */}
        {showCreateUser && (
          <CreateUserModal onClose={() => setShowCreateUser(false)} onSuccess={fetchDashboardData} />
        )}

        {/* Create Plan Modal */}
        {showCreatePlan && (
          <CreatePlanModal onClose={() => setShowCreatePlan(false)} onSuccess={fetchDashboardData} />
        )}

        {/* Invoice Management Modal */}
        {showInvoiceManager && (
          <InvoiceManagerModal onClose={() => setShowInvoiceManager(false)} />
        )}
      </div>
    </div>
  );
}

// Create User Modal Component  
function CreateUserModal({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        onSuccess(); // Refresh dashboard data
        onClose(); // Close modal
        alert('User created successfully!');
      } else {
        setError(result.error || 'Failed to create user');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create New User</CardTitle>
          <CardDescription>Add a new user or staff member</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter full name"
                className="w-full p-2 border rounded-md mt-1"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="Enter email address"
                className="w-full p-2 border rounded-md mt-1"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                required
                placeholder="Enter phone number"
                className="w-full p-2 border rounded-md mt-1"
              />
            </div>
            
            <div>
              <label htmlFor="role" className="text-sm font-medium">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md mt-1"
                required
              >
                <option value="user">User (Customer)</option>
                <option value="staff">Staff Member</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="Enter password"
                minLength={6}
                className="w-full p-2 border rounded-md mt-1"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Create Plan Modal Component
function CreatePlanModal({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    plan_name: '',
    total_value: '',
    months: '20',
    installment_amount: '',
    initial_dividend: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Generate month-wise data similar to plans.json format
      const monthsCount = parseInt(formData.months);
      const installment = parseInt(formData.installment_amount);
      const initialDividend = parseInt(formData.initial_dividend);
      
      const monthlyData = [];
      for (let i = 1; i <= monthsCount; i++) {
        const dividend = Math.max(100, initialDividend - ((i - 1) * 100)); // Decreasing dividend
        const payableAmount = installment - (dividend * 0.04); // 4% reduction for dividend
        
        monthlyData.push({
          month_number: i,
          installment_amount: installment,
          dividend: dividend,
          payable_amount: Math.round(payableAmount)
        });
      }

      const planData = {
        plan_name: formData.plan_name,
        total_value: parseInt(formData.total_value),
        months: monthsCount,
        data: monthlyData
      };

      const response = await fetch('/api/plans/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(planData)
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
        onClose();
        alert('Plan created successfully!');
      } else {
        setError(result.error || 'Failed to create plan');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Create New ChitFund Plan</CardTitle>
          <CardDescription>Add a new investment plan following plans.json format</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="plan_name" className="text-sm font-medium">Plan Name</label>
                <input
                  id="plan_name"
                  name="plan_name"
                  type="text"
                  value={formData.plan_name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., ₹3L Plan"
                  className="w-full p-2 border rounded-md mt-1"
                />
              </div>
              
              <div>
                <label htmlFor="total_value" className="text-sm font-medium">Total Value (₹)</label>
                <input
                  id="total_value"
                  name="total_value"
                  type="number"
                  value={formData.total_value}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., 300000"
                  className="w-full p-2 border rounded-md mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="months" className="text-sm font-medium">Duration (Months)</label>
                <select
                  id="months"
                  name="months"
                  value={formData.months}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded-md mt-1"
                  required
                >
                  <option value="10">10 Months</option>
                  <option value="20">20 Months</option>
                  <option value="24">24 Months</option>
                  <option value="36">36 Months</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="installment_amount" className="text-sm font-medium">Monthly Installment (₹)</label>
                <input
                  id="installment_amount"
                  name="installment_amount"
                  type="number"
                  value={formData.installment_amount}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., 15000"
                  className="w-full p-2 border rounded-md mt-1"
                />
              </div>
            </div>

            <div>
              <label htmlFor="initial_dividend" className="text-sm font-medium">Initial Dividend (₹)</label>
              <input
                id="initial_dividend"
                name="initial_dividend"
                type="number"
                value={formData.initial_dividend}
                onChange={handleInputChange}
                required
                placeholder="e.g., 6000"
                className="w-full p-2 border rounded-md mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Dividend will decrease by ₹100 each month (following plans.json pattern)
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Plan'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Invoice Manager Modal Component
function InvoiceManagerModal({ onClose }: any) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showActionModal, setShowActionModal] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setInvoices(result.invoices);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async (paymentId: string) => {
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ paymentId })
      });

      const result = await response.json();
      if (result.success) {
        setSelectedInvoice(result.invoice);
        // Ask user for preferred format
        const useHTML = window.confirm(
          'Invoice generated successfully!\n\n' +
          'Choose receipt format:\n' +
          '• Click OK for HTML (Better for thermal printers)\n' +
          '• Click Cancel for PDF format'
        );
        
        if (useHTML) {
          // Download HTML thermal receipt
          downloadThermalHTML(result.invoice._id);
        } else {
          // Download PDF thermal receipt
          downloadThermalPDF(result.invoice._id);
        }
      }
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      alert('Failed to generate invoice');
    }
  };

  const printInvoice = (invoiceId: string) => {
    const printWindow = window.open(`/receipt/thermal/${invoiceId}`, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  const downloadThermalHTML = async (invoiceId: string) => {
    try {
      const response = await fetch('/api/invoice/thermal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ invoiceId })
      });

      if (response.ok) {
        const htmlContent = await response.text();
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thermal-receipt-${invoiceId}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('Thermal receipt (HTML) downloaded! Open the file and print on your thermal printer.');
      } else {
        alert('Failed to download thermal receipt');
      }
    } catch (error) {
      console.error('Failed to download thermal receipt:', error);
      alert('Failed to download thermal receipt');
    }
  };

  const downloadThermalPDF = async (invoiceId: string) => {
    try {
      const response = await fetch('/api/invoice/thermal-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ invoiceId })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thermal-receipt-${invoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('Thermal receipt (PDF) downloaded! Print on your thermal printer.');
      } else {
        alert('Failed to download thermal PDF');
      }
    } catch (error) {
      console.error('Failed to download thermal PDF:', error);
      alert('Failed to download thermal PDF');
    }
  };

  const downloadInvoice = downloadThermalHTML; // Default to HTML

  const viewPaymentDetails = (invoice: any) => {
    setSelectedInvoice(invoice);
    setShowActionModal(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Invoice Management</span>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </CardTitle>
          <CardDescription>Generate and manage invoices for payments</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading invoices...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4">
                {invoices.slice(0, 10).map((invoice: any) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                    <div>
                      <h3 className="font-semibold">{invoice.customerName}</h3>
                      <p className="text-sm text-slate-600">{invoice.planName}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(invoice.date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        ₹{invoice.amount.toLocaleString('en-IN')}
                      </p>
                      <Badge className="mt-1">
                        {invoice.status}
                      </Badge>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => generateInvoice(invoice.paymentId)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Generate Invoice
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => viewPaymentDetails(invoice)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {invoices.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices found. Payments will appear here for invoice generation.</p>
                </div>
              )}
            </div>
          )}

          {selectedInvoice && (
            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold mb-2">Generated Invoice Preview</h3>
              <div className="text-sm space-y-1">
                <p><strong>Invoice #:</strong> {selectedInvoice.invoiceNumber || 'N/A'}</p>
                <p><strong>Customer:</strong> {selectedInvoice.customer?.name || 'N/A'}</p>
                <p><strong>Amount:</strong> ₹{selectedInvoice.amounts?.total?.toLocaleString('en-IN') || '0'}</p>
                <p><strong>Date:</strong> {selectedInvoice.invoiceDate || 'N/A'}</p>
              </div>
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  onClick={() => downloadInvoice(selectedInvoice._id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Download PDF
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => printInvoice(selectedInvoice._id)}
                >
                  Print Invoice
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Invoice Action Modal */}
      <InvoiceActionModal
        invoice={selectedInvoice}
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
      />
    </div>
  );
}