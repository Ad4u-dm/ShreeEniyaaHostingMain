'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import {
  Users,
  FileText,
  Eye,
  Edit,
  Search,
  RefreshCw,
  LogOut
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  planName: string;
  status: string;
  totalPaid: number;
  pendingAmount: number;
  lastPayment: string | null;
  nextDue: string;
  joinDate: string;
  role: string;
}

export default function StaffDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0
  });
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/staff/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setUsers(data.users || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch dashboard data:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error || 'Unknown error',
          message: errorData.message
        });
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      // Show user-friendly error message
      alert('Failed to load dashboard. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatIndianNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN');
  };

  const statCards = [
    {
      title: 'Total Customers',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Active Customers',
      value: stats.activeUsers,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    }
  ];

  const handleLogout = async () => {
    const confirmLogout = confirm('Are you sure you want to logout?');
    if (confirmLogout) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (error) {
        console.error('Logout error:', error);
      }
      // Clear local storage and redirect
      localStorage.removeItem('auth-token');
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 sm:p-4 md:p-6 mobile-spacing">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Navigation */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2 sm:mb-4 text-sm sm:text-base mobile-nav">
          <Link href="/staff" className="text-blue-600 hover:text-blue-800 font-medium">
            Dashboard
          </Link>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <Link href="/staff/users" className="text-slate-600 hover:text-slate-800">
            Customers
          </Link>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <Link href="/staff/invoices" className="text-slate-600 hover:text-slate-800">
            Invoices
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mobile-flex-col">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">Staff Dashboard</h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">Manage your customers and create invoices</p>
          </div>
          
          <div className="flex flex-wrap gap-2 mobile-btn-group">
            <Link href="/staff/invoices">
              <Button className="bg-green-600 hover:bg-green-700 text-xs sm:text-sm px-2 sm:px-4 py-2" size="sm">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Invoices</span>
                <span className="xs:hidden">Inv</span>
              </Button>
            </Link>
            <Button 
              onClick={fetchDashboardData} 
              variant="outline"
              className="text-xs sm:text-sm px-2 sm:px-4 py-2"
              size="sm"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Refresh</span>
              <span className="xs:hidden">Ref</span>
            </Button>
            <Button 
              onClick={handleLogout} 
              variant="destructive"
              className="text-xs sm:text-sm px-2 sm:px-4 py-2"
              size="sm"
            >
              <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Logout</span>
              <span className="xs:hidden">Out</span>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 mobile-stats">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-white/60 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 mobile-card">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-slate-600 mb-1 truncate">{stat.title}</p>
                      <p className="text-lg sm:text-2xl font-bold text-slate-800 truncate">{stat.value}</p>
                    </div>
                    <div className={`p-2 sm:p-3 rounded-full ${stat.bgColor} ml-2 flex-shrink-0`}>
                      <Icon className={`h-4 w-4 sm:h-6 sm:w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Customer Management */}
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              My Customers
            </CardTitle>
            <CardDescription>Customers you have registered and manage</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer List */}
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-slate-400" />
                <p className="text-slate-600 mt-2">Loading customers...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-600 mb-2">No customers found</h3>
                <p className="text-slate-500">No customers match your search criteria</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {filteredUsers.map((user) => (
                  <div key={user._id} className="border rounded-lg p-3 sm:p-4 bg-white shadow-sm hover:shadow-md transition-shadow mobile-card">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center space-x-3 flex-1 min-w-0 mobile-user-info">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-base sm:text-lg font-semibold flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-800 text-sm sm:text-base truncate">{user.name}</h4>
                          <p className="text-xs sm:text-sm text-slate-600 truncate">{user.email}</p>
                          <p className="text-xs sm:text-sm text-slate-600 truncate">{user.phone}</p>
                          <Badge variant={user.status === 'active' ? 'default' : 'secondary'} className="text-xs mt-1">
                            {user.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 justify-end mobile-user-actions">
                        <Link href={`/staff/users?view=${user._id}`}>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="px-3 sm:px-4 mobile-btn"
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm">View</span>
                          </Button>
                        </Link>
                        <Link href={`/staff/users?edit=${user._id}`}>
                          <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700 px-3 sm:px-4 mobile-btn"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                            <span className="text-xs sm:text-sm">Edit</span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}