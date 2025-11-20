'use client';

import React, { useState, useEffect } from 'react';
import { isDesktopApp } from '@/lib/isDesktopApp';
import { fetchWithCache } from '@/lib/fetchWithCache';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  CheckCircle,
  Clock,
  XCircle,
  User,
  IndianRupee,
  Hash
} from 'lucide-react';
import { formatIndianNumber } from '@/lib/helpers';

interface Enrollment {
  _id: string;
  enrollmentId: string;
  memberNumber: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  planId: {
    _id: string;
    planName: string;
    totalAmount: number;
    monthlyAmount: number;
    duration: number;
  };
  startDate: string;
  endDate: string;
  status: string;
  totalPaid: number;
  remainingAmount: number;
  createdAt: string;
}

interface EnrollmentStats {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  cancelledEnrollments: number;
  totalValue: number;
  averageDuration: number;
}

export default function EnrollmentsPage() {
  // Helper functions to safely extract data from potentially populated fields
  const getPlanName = (planId: any) => typeof planId === "object" && planId ? planId.planName : 'Unknown Plan';
  const getPlanTotalAmount = (planId: any) => typeof planId === "object" && planId ? planId.totalAmount : 0;
  const getPlanDuration = (planId: any) => typeof planId === "object" && planId ? planId.duration : 0;
  const getPlanMonthlyAmount = (planId: any) => typeof planId === "object" && planId ? planId.monthlyAmount : 0;
  const getId = (field: any) => typeof field === "object" && field ? field._id : field;

  const [offlineMode, setOfflineMode] = useState(false);
  // Banner for offline mode (Electron only)
  const OfflineBanner = () => (
    isDesktopApp() && offlineMode ? (
      <div style={{ background: '#f59e42', color: '#fff', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
        Offline Mode: Data may be outdated. Write actions are disabled.
      </div>
    ) : null
  );
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [stats, setStats] = useState<EnrollmentStats>({
    totalEnrollments: 0,
    activeEnrollments: 0,
    completedEnrollments: 0,
    cancelledEnrollments: 0,
    totalValue: 0,
    averageDuration: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchEnrollments();
  }, [currentPage, statusFilter]);

  const fetchEnrollments = async () => {
    try {
      const response = await fetch(`/api/enrollments?page=${currentPage}&limit=${itemsPerPage}&status=${statusFilter}&search=${searchTerm}`);
      const data = await response.json();
      
      if (data.success) {
        setEnrollments(data.enrollments || []);
        setStats(data.stats || stats);
      } else {
        console.error('Error fetching enrollments:', data.error);
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredEnrollments = enrollments.filter(enrollment =>
    enrollment.userId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    enrollment.memberNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getPlanName(enrollment.planId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <OfflineBanner />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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
              <h1 className="text-3xl font-bold text-slate-800">Enrollments Management</h1>
              <p className="text-slate-600">Track and manage customer enrollments</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Enrollments</p>
                  <p className="text-2xl font-bold">{stats.totalEnrollments}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Active Enrollments</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeEnrollments}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Value</p>
                  <p className="text-2xl font-bold">₹{formatIndianNumber(stats.totalValue)}</p>
                </div>
                <IndianRupee className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Avg Duration</p>
                  <p className="text-2xl font-bold">{stats.averageDuration}</p>
                  <p className="text-xs text-slate-500">months</p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by member name, number, or plan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="pending">Pending</option>
                </select>
                <Button variant="outline" onClick={fetchEnrollments}>
                  <Filter className="h-4 w-4 mr-2" />
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrollments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              Customer Enrollments
            </CardTitle>
            <CardDescription>
              Complete list of all customer plan enrollments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No enrollments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEnrollments.map((enrollment) => (
                      <TableRow key={enrollment._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              {enrollment.userId.name}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {enrollment.memberNumber}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{getPlanName(enrollment.planId)}</div>
                            <div className="text-sm text-gray-500">
                              ₹{formatIndianNumber(getPlanTotalAmount(enrollment.planId))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {getPlanDuration(enrollment.planId)} months
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-semibold">
                              ₹{formatIndianNumber(getPlanMonthlyAmount(enrollment.planId))}/month
                            </div>
                            <div className="text-sm text-gray-500">
                              Total: ₹{formatIndianNumber(getPlanTotalAmount(enrollment.planId))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ 
                                width: `${Math.min(100, (enrollment.totalPaid / getPlanTotalAmount(enrollment.planId)) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ₹{formatIndianNumber(enrollment.totalPaid)} / ₹{formatIndianNumber(getPlanTotalAmount(enrollment.planId))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(enrollment.status)}
                            {getStatusBadge(enrollment.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(enrollment.startDate).toLocaleDateString('en-IN')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}