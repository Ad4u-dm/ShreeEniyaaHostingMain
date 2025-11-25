'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, Search, Filter, UserCheck, UserX, Mail, Phone, Calendar, Eye, AlertTriangle, RefreshCw, Edit2, Plus, Trash2, UserPlus } from 'lucide-react';
import { formatIndianNumber } from '@/lib/helpers';
import { fetchWithCache } from '@/lib/fetchWithCache';
import { OfflineDB } from '@/lib/offlineDb';
import { isDesktopApp } from '@/lib/isDesktopApp';

interface Customer {
  _id: string;
  userId?: string; // Custom userId like "CF000001"
  name: string;
  email: string;
  phone: string;
  address: string;
  dob?: string; // Date of Birth (ISO string)
  weddingDate?: string; // Wedding Date (ISO string)
  planId: string;
  planName: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'suspended';
  nextDue: string;
  paymentHistory: number;
  createdBy?: {
    _id: string;
    name: string;
    role: string;
  };
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  newUsersThisMonth: number;
  totalRevenue: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface Plan {
  _id: string;
  planName: string;
  totalAmount: number;
  monthlyAmount: number;
  duration: number;
}

interface Enrollment {
  _id: string;
  userId: string;
  planId: string;
  status: string;
  enrollmentDate: string;
  startDate: string;
  endDate: string;
  totalDue: number;
  totalPaid: number;
  remainingAmount: number;
}

export default function UsersPage() {
  // Helper function to safely extract ID from potentially populated field
  const getId = (field: any) => typeof field === "object" && field ? field._id : field;
  
  // Helper function to safely get plan name
  const getPlanName = (planId: any) => typeof planId === "object" && planId ? planId.planName : 'Unknown Plan';
  
  // Helper function to safely get plan duration
  const getPlanDuration = (planId: any) => typeof planId === "object" && planId ? planId.duration : 0;
  
  // Helper function to safely get plan total amount
  const getPlanTotalAmount = (planId: any) => typeof planId === "object" && planId ? planId.totalAmount : 0;

  // Banner for offline mode (Electron only)
  const OfflineBanner = () => (
    isDesktopApp() && offlineMode ? (
      <div style={{ background: '#f59e42', color: '#fff', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
        Offline Mode: Data may be outdated. Write actions are disabled.
      </div>
    ) : null
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [roleFilter, setRoleFilter] = useState<'user' | 'staff' | 'admin' | 'all'>('user');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [userEnrollments, setUserEnrollments] = useState<Enrollment[]>([]);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [isEditingEnrollment, setIsEditingEnrollment] = useState(false);
  const [currentEnrollment, setCurrentEnrollment] = useState<Enrollment | null>(null);
  const [enrollmentFormData, setEnrollmentFormData] = useState<any>({
    planId: '',
    startDate: new Date().toISOString().split('T')[0],
    memberNumber: ''
  });
  const [isEditingMemberNumber, setIsEditingMemberNumber] = useState(false);
  const [newMemberNumber, setNewMemberNumber] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, roleFilter]);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, statusFilter]);

  const fetchCustomers = async () => {
    try {
      const url = new URL('/api/admin/users', window.location.origin);
      url.searchParams.append('page', currentPage.toString());
      url.searchParams.append('limit', '20'); // Increase limit to show more users per page
      
      if (roleFilter !== 'all') {
        url.searchParams.append('role', roleFilter);
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      
      // Set empty state on error
      setCustomers([]);
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        suspendedUsers: 0,
        newUsersThisMonth: 0,
        totalRevenue: 0
      });
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = customers;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.name?.toLowerCase().includes(term) ||
        customer.email?.toLowerCase().includes(term) ||
        customer.phone?.includes(term) ||
        customer.planName?.toLowerCase().includes(term) ||
        (customer.address && customer.address.toLowerCase().includes(term)) ||
        (customer.dob && customer.dob.toLowerCase().includes(term)) ||
        (customer.weddingDate && customer.weddingDate.toLowerCase().includes(term))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(customer => customer.status === statusFilter);
    }

    setFilteredCustomers(filtered);
  };

  const updateCustomerStatus = async (customerId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/users/${customerId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setCustomers(customers.map(customer =>
          customer._id === customerId ? { ...customer, status: newStatus as any } : customer
        ));
      }
    } catch (error) {
      console.error('Failed to update customer status:', error);
    }
  };

  const updateUser = async (userId: string, userData: any) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, userData }),
      });

      if (response.ok) {
        const result = await response.json();
        // Refresh the customers list
        fetchCustomers();
        setIsEditing(false);
        setSelectedCustomer(null);
        return result;
      } else {
        console.error('Failed to update user');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleEditUser = (customer: Customer) => {
    setEditFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      dob: customer.dob || '',
      weddingDate: customer.weddingDate || ''
    });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (selectedCustomer) {
      updateUser(selectedCustomer._id, editFormData);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditFormData({});
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
      });
      if (response.ok) {
        fetchCustomers();
        setSelectedCustomer(null);
        setIsEditing(false);
        setEditFormData({});
      } else {
        alert('Failed to delete user.');
      }
    } catch (error) {
      alert('Error deleting user.');
    }
  };

  const fetchUserEnrollments = async (userId: string) => {
    try {
      console.log('Fetching enrollments for userId:', userId);
      const response = await fetch(`/api/enrollments?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      console.log('Enrollments response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Enrollments data received:', data);
        console.log('Enrollments array:', data.enrollments);
        setUserEnrollments(data.enrollments || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch enrollments:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch user enrollments:', error);
    }
  };

  const fetchAvailablePlans = async () => {
    try {
      console.log('Fetching available plans...');
      const response = await fetch('/api/plans', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      console.log('Plans response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Plans data received:', data);
        console.log('Plans array:', data.plans);
        setAvailablePlans(data.plans || []);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch plans:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const handleOpenEnrollmentModal = async (enrollmentToEdit?: any) => {
    if (enrollmentToEdit) {
      // Edit existing enrollment
      setIsEditingEnrollment(true);
      setCurrentEnrollment(enrollmentToEdit);
      setEnrollmentFormData({
        planId: typeof enrollmentToEdit.planId === "object" && enrollmentToEdit.planId ? (enrollmentToEdit.planId as any)._id : enrollmentToEdit.planId,
        startDate: new Date(enrollmentToEdit.startDate).toISOString().split('T')[0],
        memberNumber: enrollmentToEdit.memberNumber || ''
      });
    } else {
      // Create new enrollment - check if user has existing enrollments
      setIsEditingEnrollment(false);
      setCurrentEnrollment(null);

      // Fetch user's existing enrollments to check if they have a member number
      let existingMemberNumber = '';
      if (selectedCustomer && userEnrollments.length > 0) {
        existingMemberNumber = userEnrollments[0].memberNumber || '';
      }

      setEnrollmentFormData({
        planId: '',
        startDate: new Date().toISOString().split('T')[0],
        memberNumber: existingMemberNumber // Pre-fill if user has existing enrollments
      });
    }

    setShowEnrollmentModal(true);
  };

  const handleSaveEnrollment = async () => {
    if (!selectedCustomer || !enrollmentFormData.planId) {
      alert('Please select a plan');
      return;
    }

    try {
      if (isEditingEnrollment && currentEnrollment) {
        // Update existing enrollment
        const response = await fetch(`/api/enrollments/${currentEnrollment._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          },
          body: JSON.stringify({
            planId: enrollmentFormData.planId,
            startDate: enrollmentFormData.startDate
          })
        });

        if (response.ok) {
          alert('Enrollment updated successfully!');
          setShowEnrollmentModal(false);
          setIsEditingEnrollment(false);
          setCurrentEnrollment(null);
          setEnrollmentFormData({
            planId: '',
            startDate: new Date().toISOString().split('T')[0]
          });
          fetchUserEnrollments(selectedCustomer.userId || selectedCustomer._id);
          fetchCustomers();
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to update enrollment');
        }
      } else {
        // Create new enrollment - include memberNumber (required for first enrollment, reused for subsequent)
        const response = await fetch('/api/enrollments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          },
          body: JSON.stringify({
            userId: selectedCustomer.userId || selectedCustomer._id,
            planId: enrollmentFormData.planId,
            startDate: enrollmentFormData.startDate,
            memberNumber: enrollmentFormData.memberNumber
          })
        });

        if (response.ok) {
          alert('Enrollment created successfully!');
          setShowEnrollmentModal(false);
          setEnrollmentFormData({
            planId: '',
            startDate: new Date().toISOString().split('T')[0],
            memberNumber: ''
          });
          fetchUserEnrollments(selectedCustomer.userId || selectedCustomer._id);
          fetchCustomers();
        } else {
          const error = await response.json();
          alert(error.error || 'Failed to create enrollment');
        }
      }
    } catch (error) {
      console.error('Failed to save enrollment:', error);
      alert('Failed to save enrollment');
    }
  };

  const handleDeleteEnrollment = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to delete this enrollment? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        alert('Enrollment deleted successfully!');
        if (selectedCustomer) {
          fetchUserEnrollments(selectedCustomer.userId || selectedCustomer._id);
          fetchCustomers();
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete enrollment');
      }
    } catch (error) {
      console.error('Failed to delete enrollment:', error);
      alert('Failed to delete enrollment');
    }
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    console.log('Selected customer:', customer);
    console.log('Using userId for enrollment fetch:', customer.userId || customer._id);
    // Use customer.userId if available, otherwise fall back to _id
    fetchUserEnrollments(customer.userId || customer._id);
    fetchAvailablePlans();
  };

  const handleUpdateMemberNumber = async () => {
    if (!selectedCustomer || !newMemberNumber.trim()) {
      alert('Please enter a valid member number');
      return;
    }

    try {
      const response = await fetch('/api/enrollments/update-member-number', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          userId: selectedCustomer.userId || selectedCustomer._id,
          newMemberNumber: newMemberNumber.trim()
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Member number updated successfully!\n\n` +
          `Enrollments updated: ${result.enrollmentsUpdated}\n` +
          `Invoices updated: ${result.invoicesUpdated}`);

        setIsEditingMemberNumber(false);
        setNewMemberNumber('');

        // Refresh the enrollments to show updated member number
        fetchUserEnrollments(selectedCustomer.userId || selectedCustomer._id);
        fetchCustomers();
      } else {
        alert(result.error || 'Failed to update member number');
      }
    } catch (error) {
      console.error('Failed to update member number:', error);
      alert('Failed to update member number');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      case 'suspended': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <UserCheck className="h-4 w-4" />;
      case 'inactive': return <UserX className="h-4 w-4" />;
      case 'suspended': return <AlertTriangle className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 md:p-6">
      <OfflineBanner />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="flex items-center gap-2 w-fit"
              size="sm"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 leading-tight">User Management</h1>
              <p className="text-slate-600 text-sm sm:text-base mt-1">Manage customers and their investment details</p>
            </div>
          </div>

          <Button 
            onClick={fetchCustomers} 
            variant="outline" 
            size="sm" 
            className="w-fit flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {/* Stats Cards removed as per requirements */}

        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">Filter Users</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by name, email, phone, or plan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="sm:w-48">
                  <Select value={roleFilter} onValueChange={(value: any) => {
                    setRoleFilter(value);
                    setCurrentPage(1); // Reset to first page when filter changes
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Customers</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                      <SelectItem value="all">All Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Status filter buttons removed as per requirements */}
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="shadow-lg">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6 bg-gradient-to-r from-slate-50 to-blue-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Users ({filteredCustomers.length})
              </CardTitle>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Showing</span> {filteredCustomers.length} of {pagination?.total || customers.length} users
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="overflow-x-auto mobile-scroll">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Customer Details</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Current Plan</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer._id} className="border-b border-slate-100 hover:bg-blue-50/50 transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-semibold text-slate-800 text-base">{customer.name}</div>
                          <div className="text-sm text-slate-600 flex items-center gap-2 mt-2">
                            <Phone className="h-3.5 w-3.5 text-green-500" />
                            {customer.phone}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                          customer.planName === 'No Plan'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {customer.planName}
                        </div>
                        <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Joined: {new Date(customer.joinDate).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleViewCustomer(customer)}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
                              try {
                                const response = await fetch(`/api/users/${customer._id}`, {
                                  method: 'DELETE',
                                  headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
                                  },
                                });
                                if (response.ok) {
                                  fetchCustomers();
                                } else {
                                  alert('Failed to delete user.');
                                }
                              } catch (error) {
                                alert('Error deleting user.');
                              }
                            }}
                            className="flex items-center gap-1.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCustomers.length === 0 && (
                <div className="text-center py-8 text-slate-600">
                  No customers found matching your criteria.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <div className="text-sm text-slate-600">
                  Page {pagination.page} of {pagination.pages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(pagination.pages - 4, currentPage - 2)) + i;
                    if (pageNum <= pagination.pages) {
                      return (
                        <Button
                          key={pageNum}
                          size="sm"
                          variant={currentPage === pageNum ? "default" : "outline"}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    }
                    return null;
                  })}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                    disabled={currentPage === pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Detail Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <UserCheck className="h-6 w-6 text-blue-600" />
                    Customer Details
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setIsEditing(false);
                      setEditFormData({});
                      setUserEnrollments([]);
                    }}
                  >
                    ✕
                  </Button>
                </div>

                {/* User Info Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Name</p>
                      {isEditing ? (
                        <Input
                          value={editFormData.name || ''}
                          onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                          className="bg-white"
                        />
                      ) : (
                        <p className="font-semibold text-slate-800">{selectedCustomer.name}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Phone</p>
                      {isEditing ? (
                        <Input
                          value={editFormData.phone || ''}
                          onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                          className="bg-white"
                        />
                      ) : (
                        <p className="font-semibold text-slate-800">{selectedCustomer.phone}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Address</p>
                      {isEditing ? (
                        <Input
                          value={editFormData.address || ''}
                          onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                          className="bg-white"
                        />
                      ) : (
                        <p className="font-semibold text-slate-800">{selectedCustomer.address}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Date of Birth</p>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editFormData.dob || ''}
                          onChange={(e) => setEditFormData({...editFormData, dob: e.target.value})}
                          className="bg-white"
                        />
                      ) : (
                        <p className="font-semibold text-slate-800">{selectedCustomer.dob ? new Date(selectedCustomer.dob).toLocaleDateString('en-IN') : '-'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Wedding Date</p>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={editFormData.weddingDate || ''}
                          onChange={(e) => setEditFormData({...editFormData, weddingDate: e.target.value})}
                          className="bg-white"
                        />
                      ) : (
                        <p className="font-semibold text-slate-800">{selectedCustomer.weddingDate ? new Date(selectedCustomer.weddingDate).toLocaleDateString('en-IN') : '-'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-1">Member Number</p>
                      {isEditingMemberNumber ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={newMemberNumber}
                            onChange={(e) => setNewMemberNumber(e.target.value)}
                            placeholder="Enter new member number"
                            className="bg-white"
                          />
                          <Button
                            size="sm"
                            onClick={handleUpdateMemberNumber}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsEditingMemberNumber(false);
                              setNewMemberNumber('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800">
                            {userEnrollments.length > 0 ? userEnrollments[0].memberNumber : 'No enrollments yet'}
                          </p>
                          {userEnrollments.length > 0 && !isEditing && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setIsEditingMemberNumber(true);
                                setNewMemberNumber(userEnrollments[0].memberNumber);
                              }}
                              className="h-6 px-2"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    {!isEditing ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleEditUser(selectedCustomer)}>
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit Info
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(selectedCustomer._id)}>
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete User
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" onClick={handleSaveEdit}>Save Changes</Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Enrollments Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      Plan Enrollments ({userEnrollments.filter(e => e.status === 'active').length})
                    </h3>
                    <Button size="sm" onClick={() => handleOpenEnrollmentModal()}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add New Enrollment
                    </Button>
                  </div>

                  {userEnrollments.filter(e => e.status === 'active').length > 0 ? (
                    <div className="space-y-3">
                      {userEnrollments.filter(e => e.status === 'active').map((enrollment: any) => (
                        <Card key={enrollment._id} className="border-l-4 border-l-blue-600">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-slate-800 text-lg">{getPlanName(enrollment.planId)}</p>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Active
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenEnrollmentModal(enrollment)}
                                  className="flex items-center gap-1"
                                >
                                  <Edit2 className="h-3 w-3" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteEnrollment(enrollment._id)}
                                  className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-slate-600 text-xs mb-1">Start Date</p>
                                <p className="font-medium text-slate-800">{new Date(enrollment.startDate).toLocaleDateString('en-IN')}</p>
                              </div>
                              <div>
                                <p className="text-slate-600 text-xs mb-1">End Date</p>
                                <p className="font-medium text-slate-800">{new Date(enrollment.endDate).toLocaleDateString('en-IN')}</p>
                              </div>
                              <div>
                                <p className="text-slate-600 text-xs mb-1">Duration</p>
                                <p className="font-medium text-slate-800">{getPlanDuration(enrollment.planId)} months</p>
                              </div>
                              <div>
                                <p className="text-slate-600 text-xs mb-1">Plan Amount (Total)</p>
                                <p className="font-medium text-slate-800">₹{formatIndianNumber(getPlanTotalAmount(enrollment.planId))}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t">
                              <div>
                                <p className="text-slate-600 text-xs mb-1">Total Paid</p>
                                <p className="font-semibold text-green-600 text-base">₹{formatIndianNumber(enrollment.totalPaid || 0)}</p>
                              </div>
                              <div>
                                <p className="text-slate-600 text-xs mb-1">Balance Remaining</p>
                                <p className="font-semibold text-orange-600 text-base">₹{formatIndianNumber(enrollment.remainingAmount || 0)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-50 rounded-lg">
                      <Users className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-600">No active enrollment</p>
                      <p className="text-sm text-slate-500 mt-1">Click "Add Enrollment" to assign this user to a plan</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Enrollment Modal */}
        {showEnrollmentModal && selectedCustomer && (
          <div
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4"
            onClick={(e) => {
              // Only close if clicking directly on the backdrop, not its children
              if (e.target === e.currentTarget) {
                setShowEnrollmentModal(false);
                setIsEditingEnrollment(false);
                setCurrentEnrollment(null);
                setEnrollmentFormData({
                  planId: '',
                  startDate: new Date().toISOString().split('T')[0]
                });
              }
            }}
          >
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                {isEditingEnrollment ? (
                  <>
                    <Edit2 className="h-5 w-5 text-blue-600" />
                    Edit Plan Enrollment
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5 text-blue-600" />
                    Add Plan Enrollment
                  </>
                )}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Select Plan
                  </label>
                  <Select
                    value={enrollmentFormData.planId}
                    onValueChange={(value) => {
                      console.log('Plan selected:', value);
                      setEnrollmentFormData({...enrollmentFormData, planId: value});
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={availablePlans.length === 0 ? "No plans available" : "Choose a plan"} />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      {availablePlans.length === 0 ? (
                        <div className="p-2 text-sm text-slate-500">No active plans found</div>
                      ) : (
                        availablePlans
                          .filter((plan) => {
                            // When adding new enrollment, exclude plans user is already enrolled in
                            if (!isEditingEnrollment) {
                              const enrolledPlanIds = userEnrollments
                                .filter(e => e.status === 'active')
                                .map(e => typeof e.planId === 'object' ? (e.planId as any)._id : e.planId);
                              return !enrolledPlanIds.includes(plan._id);
                            }
                            return true;
                          })
                          .map((plan) => (
                            <SelectItem key={plan._id} value={plan._id}>
                              {plan.planName} - ₹{formatIndianNumber(plan.totalAmount)}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                  {availablePlans.length > 0 && (
                    <p className="text-xs text-slate-500 mt-1">
                      {!isEditingEnrollment ? (
                        <>
                          {(() => {
                            const enrolledPlanIds = userEnrollments
                              .filter(e => e.status === 'active')
                              .map(e => typeof e.planId === 'object' ? (e.planId as any)._id : e.planId);
                            const availableCount = availablePlans.filter(p => !enrolledPlanIds.includes(p._id)).length;
                            return availableCount > 0
                              ? `${availableCount} plan(s) available for enrollment`
                              : 'All plans already enrolled';
                          })()}
                        </>
                      ) : (
                        `${availablePlans.length} plan(s) available`
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Member Number {userEnrollments.length === 0 && !isEditingEnrollment && <span className="text-red-500">*</span>}
                  </label>
                  <Input
                    type="text"
                    placeholder={userEnrollments.length > 0 ? "Will use existing member number" : "Enter member number (e.g., 1001)"}
                    value={enrollmentFormData.memberNumber}
                    onChange={(e) => setEnrollmentFormData({...enrollmentFormData, memberNumber: e.target.value})}
                    disabled={isEditingEnrollment || userEnrollments.length > 0}
                    required={userEnrollments.length === 0 && !isEditingEnrollment}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {isEditingEnrollment
                      ? 'Member number cannot be changed after creation'
                      : userEnrollments.length > 0
                        ? 'This user already has a member number - it will be reused automatically'
                        : 'Required for first enrollment - must be unique per user'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={enrollmentFormData.startDate}
                    onChange={(e) => setEnrollmentFormData({...enrollmentFormData, startDate: e.target.value})}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSaveEnrollment} className="flex-1">
                    {isEditingEnrollment ? 'Update Enrollment' : 'Create Enrollment'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEnrollmentModal(false);
                      setIsEditingEnrollment(false);
                      setCurrentEnrollment(null);
                      setEnrollmentFormData({
                        planId: '',
                        startDate: new Date().toISOString().split('T')[0]
                      });
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}