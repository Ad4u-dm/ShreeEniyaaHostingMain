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

  // Redirect staff dashboard to invoices page
  if (typeof window !== 'undefined') {
    window.location.replace('/staff/invoices');
    return null;
  }
  return null;
}