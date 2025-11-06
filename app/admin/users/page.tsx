'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Users, Search, Filter, UserCheck, UserX, Mail, Phone, Calendar, Eye, AlertTriangle } from 'lucide-react';
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
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  newUsersThisMonth: number;
  totalRevenue: number;
}

export default function UsersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, statusFilter]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      // Mock data for demonstration
      const mockCustomers: Customer[] = Array.from({ length: 50 }, (_, i) => ({
        _id: `customer-${i + 1}`,
        name: `Customer ${i + 1}`,
        email: `customer${i + 1}@example.com`,
        phone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        address: `Address ${i + 1}, City, State - ${Math.floor(Math.random() * 900000) + 100000}`,
        planId: `plan-${Math.floor(Math.random() * 4) + 1}`,
        planName: ['₹1L Plan', '₹2L Plan', '₹5L Plan', '₹10L Plan'][Math.floor(Math.random() * 4)],
        joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: ['active', 'inactive', 'suspended'][Math.floor(Math.random() * 3)] as any,
        totalPaid: Math.floor(Math.random() * 500000) + 50000,
        pendingAmount: Math.floor(Math.random() * 50000),
        lastPayment: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        nextDue: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        paymentHistory: Math.floor(Math.random() * 24) + 1
      }));

      setCustomers(mockCustomers);
      setStats({
        totalUsers: mockCustomers.length,
        activeUsers: mockCustomers.filter(c => c.status === 'active').length,
        inactiveUsers: mockCustomers.filter(c => c.status === 'inactive').length,
        suspendedUsers: mockCustomers.filter(c => c.status === 'suspended').length,
        newUsersThisMonth: Math.floor(mockCustomers.length * 0.2),
        totalRevenue: mockCustomers.reduce((sum, c) => sum + c.totalPaid, 0)
      });
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
              <h1 className="text-3xl font-bold text-slate-800">User Management</h1>
              <p className="text-slate-600">Manage customers and their investment details</p>
            </div>
          </div>

          <Button onClick={fetchCustomers} variant="outline">
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold text-slate-800">{stats.totalUsers}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Active Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold text-slate-800">{stats.activeUsers}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Inactive Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-gray-500" />
                  <span className="text-2xl font-bold text-slate-800">{stats.inactiveUsers}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Suspended</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold text-slate-800">{stats.suspendedUsers}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">New This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  <span className="text-2xl font-bold text-slate-800">{stats.newUsersThisMonth}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email, phone, or plan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'active', 'inactive', 'suspended'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(status)}
                    className="capitalize"
                  >
                    {status === 'all' ? 'All' : status}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Users ({filteredCustomers.length})</CardTitle>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Filter className="h-4 w-4" />
                Showing {filteredCustomers.length} of {customers.length} users
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Plan</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Total Paid</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Pending</th>
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
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                          {getStatusIcon(customer.status)}
                          {customer.status}
                        </span>
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
                          <select
                            value={customer.status}
                            onChange={(e) => updateCustomerStatus(customer._id, e.target.value)}
                            className="text-xs border border-slate-200 rounded px-2 py-1"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                          </select>
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
          </CardContent>
        </Card>

        {/* Customer Detail Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">Customer Details</h2>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    Close
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-3">Personal Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-slate-600">Name</label>
                        <p className="font-medium">{selectedCustomer.name}</p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Email</label>
                        <p className="font-medium">{selectedCustomer.email}</p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Phone</label>
                        <p className="font-medium">{selectedCustomer.phone}</p>
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Address</label>
                        <p className="font-medium">{selectedCustomer.address}</p>
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