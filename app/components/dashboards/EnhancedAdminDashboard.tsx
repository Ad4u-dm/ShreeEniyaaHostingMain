'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { formatIndianNumber } from '@/lib/helpers';
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
    availablePlans: number;
  };
  recentActivity: {
    enrollments: any[];
    payments: any[];
  };
  staffPerformance: any[];
  chartData: {
    monthlyRevenue: number[];
    monthlyPayments: number[];
    planDistribution: { name: string; count: number; }[];
  };
}

export default function EnhancedAdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Set up real-time updates
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/admin-enhanced', {
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
      localStorage.removeItem('auth-token');
      window.location.href = '/login';
    }
  };

  const revenueChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Monthly Revenue (₹)',
        data: data?.chartData?.monthlyRevenue || [],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
      },
    ],
  };

  const paymentsChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Payment Count',
        data: data?.chartData?.monthlyPayments || [],
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  const planDistributionData = {
    labels: data?.chartData?.planDistribution?.map(p => p.name) || [],
    datasets: [
      {
        data: data?.chartData?.planDistribution?.map(p => p.count) || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Shree Eniyaa Chitfunds (P) Ltd.</h1>
            <p className="text-slate-600 mt-1">Complete business management dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowCreateUser(true)} className="bg-blue-600 hover:bg-blue-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
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

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab data={data} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsTab 
              revenueData={revenueChartData} 
              paymentsData={paymentsChartData} 
              planData={planDistributionData} 
            />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UsersTab searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <TransactionsTab />
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <InvoicesTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <CreateUserModal onClose={() => setShowCreateUser(false)} onSuccess={fetchDashboardData} />
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ data }: { data: AdminDashboardData }) {
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
      title: 'Active Enrollments',
      value: `${data.stats.activeEnrollments}/${data.stats.totalEnrollments}`,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      clickable: true,
      route: '/admin/enrollments'
    },
    {
      title: 'Available Plans',
      value: data.stats.availablePlans || 4,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      clickable: true,
      route: '/admin/plans'
    },
    {
      title: 'Pending Payments',
      value: data.stats.pendingPayments,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      clickable: true,
      route: '/admin/pending'
    }
  ];

  const handleTileClick = (route: string) => {
    window.location.href = route;
  };

  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index} 
              className="bg-white/60 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
              onClick={() => stat.clickable && handleTileClick(stat.route)}
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
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
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
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
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
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Analytics Tab Component
function AnalyticsTab({ revenueData, paymentsData, planData }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-800">Monthly Revenue</CardTitle>
          <CardDescription>Revenue trends over the year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Bar data={revenueData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-800">Payment Trends</CardTitle>
          <CardDescription>Monthly payment volumes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Line data={paymentsData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-800">Plan Distribution</CardTitle>
          <CardDescription>Enrollment distribution across plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <Doughnut data={planData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-800">Performance Metrics</CardTitle>
          <CardDescription>Key business indicators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Collection Rate</span>
              <span className="font-semibold text-green-600">95.2%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Default Rate</span>
              <span className="font-semibold text-red-600">2.1%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Average Plan Value</span>
              <span className="font-semibold text-blue-600">₹65,000</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Customer Retention</span>
              <span className="font-semibold text-purple-600">88.7%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Users Tab Component
function UsersTab({ searchTerm, setSearchTerm }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add New User
        </Button>
      </div>

      <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-800">User Management</CardTitle>
          <CardDescription>Manage all users and staff members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* User list will be populated from API */}
            <div className="text-center py-8 text-slate-500">
              User management interface will be implemented here
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Transactions Tab Component
function TransactionsTab() {
  return (
    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-slate-800">Transaction Management</CardTitle>
        <CardDescription>View and manage all transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-slate-500">
          Transaction management interface will be implemented here
        </div>
      </CardContent>
    </Card>
  );
}

// Invoices Tab Component
function InvoicesTab() {
  return (
    <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-slate-800">Invoice Management</CardTitle>
        <CardDescription>Create and manage invoices</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-slate-500">
          Invoice management interface will be implemented here
        </div>
      </CardContent>
    </Card>
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
      // Prepare form data - only include email/password for staff and admin
      const submitData = {
        name: formData.name,
        phone: formData.phone,
        role: formData.role,
        ...(formData.role === 'staff' || formData.role === 'admin' ? {
          email: formData.email,
          password: formData.password
        } : {})
      };

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(submitData)
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
    const { name, value } = e.target;
    
    // If changing to user role, clear email and password
    if (name === 'role' && value === 'user') {
      setFormData({
        ...formData,
        [name]: value,
        email: '',
        password: ''
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>🚀 TEST - Create New User 🚀</CardTitle>
          <CardDescription>Add a new user or staff member</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter full name"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                required
                placeholder="Enter phone number"
              />
            </div>
            
            <div>
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                required
              >
                <option value="user">User (Customer)</option>
                <option value="staff">Staff Member</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            
            {/* Debug info */}
            <div className="text-xs text-gray-500">
              Current role: {formData.role} | Should show fields: {(formData.role === 'staff' || formData.role === 'admin').toString()}
            </div>
            
            {/* Only show email and password for staff and admin */}
            {(formData.role === 'staff' || formData.role === 'admin') && (
              <>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter email address"
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter password"
                    minLength={6}
                  />
                </div>
              </>
            )}

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