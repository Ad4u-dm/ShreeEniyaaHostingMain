'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, Search, Filter, UserCheck, UserX, Mail, Phone, Calendar, Eye, AlertTriangle, RefreshCw } from 'lucide-react';
import { formatIndianNumber } from '@/lib/helpers';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  planId: string;
  planName: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'suspended';
  totalPaid: number;
  pendingAmount: number;
  lastPayment: string;
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

export default function UsersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [roleFilter, setRoleFilter] = useState<'user' | 'staff' | 'admin' | 'all'>('user');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);

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
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.phone.includes(term) ||
        customer.planName.toLowerCase().includes(term)
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
      email: customer.email,
      phone: customer.phone,
      address: customer.address
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
        <Card>
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <CardTitle className="text-lg sm:text-xl">Users ({filteredCustomers.length})</CardTitle>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Showing</span> {filteredCustomers.length} of {pagination?.total || customers.length} users
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="overflow-x-auto mobile-scroll">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Plan</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Total Paid</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Pending Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Last Payment</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-slate-800">{customer.name}</div>
                          <div className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </div>
                          <div className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{customer.planName}</div>
                        <div className="text-sm text-slate-600">
                          Joined: {new Date(customer.joinDate).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-green-600">
                          ₹{formatIndianNumber(customer.totalPaid)}
                        </div>
                        <div className="text-xs text-slate-600">
                          {customer.paymentHistory} payments
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className={`font-medium ${customer.pendingAmount > 0 ? 'text-red-600' : 'text-slate-600'}`}> 
                          ₹{formatIndianNumber(customer.pendingAmount)}
                        </div>
                        {customer.pendingAmount > 0 && (
                          <div className="text-xs text-red-600">
                            Due: {new Date(customer.nextDue).toLocaleDateString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-800">
                          {new Date(customer.lastPayment).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedCustomer(customer)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
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
                            className="flex items-center gap-1"
                          >
                            <UserX className="h-3 w-3" />
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
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">Customer Details</h2>
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <Button
                        variant="outline"
                        onClick={() => handleEditUser(selectedCustomer)}
                      >
                        Edit
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleSaveEdit}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {/* Show Delete button only for non-admin users */}
                    {selectedCustomer?.createdBy?.role !== 'admin' && (
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteUser(selectedCustomer._id)}
                      >
                        Delete
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setIsEditing(false);
                        setEditFormData({});
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-3">Personal Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-slate-600">Name</label>
                        {isEditing ? (
                          <Input
                            value={editFormData.name || ''}
                            onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{selectedCustomer.name}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Email</label>
                        {isEditing ? (
                          <Input
                            value={editFormData.email || ''}
                            onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                            className="mt-1"
                            type="email"
                          />
                        ) : (
                          <p className="font-medium">{selectedCustomer.email}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Phone</label>
                        {isEditing ? (
                          <Input
                            value={editFormData.phone || ''}
                            onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{selectedCustomer.phone}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Address</label>
                        {isEditing ? (
                          <Input
                            value={editFormData.address || ''}
                            onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                            className="mt-1"
                          />
                        ) : (
                          <p className="font-medium">{selectedCustomer.address}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-800 mb-3">Investment Details</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-slate-600">Plan</label>
                        <p className="font-medium">{selectedCustomer.planName}</p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Status</label>
                        <p className={`font-medium inline-flex items-center gap-1 px-2 py-1 rounded text-sm ${getStatusColor(selectedCustomer.status)}`}>
                          {getStatusIcon(selectedCustomer.status)}
                          {selectedCustomer.status}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Join Date</label>
                        <p className="font-medium">{new Date(selectedCustomer.joinDate).toLocaleDateString('en-IN')}</p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Total Paid</label>
                        <p className="font-medium text-green-600">₹{formatIndianNumber(selectedCustomer.totalPaid)}</p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Pending Amount</label>
                        <p className={`font-medium ${selectedCustomer.pendingAmount > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                          ₹{formatIndianNumber(selectedCustomer.pendingAmount)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Payment History</label>
                        <p className="font-medium">{selectedCustomer.paymentHistory} payments made</p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Created By</label>
                        <p className="font-medium">
                          {selectedCustomer.createdBy?.name || 'Admin'} ({selectedCustomer.createdBy?.role || 'admin'})
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}