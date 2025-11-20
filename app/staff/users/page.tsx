'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isDesktopApp } from '@/lib/isDesktopApp';
import {
  Users,
  UserPlus,
  Search,
  ArrowLeft,
  Edit,
  Trash2,
  Eye,
  FileText,
  Printer,
  IndianRupee,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  MoreVertical,
  Settings
} from 'lucide-react';
import Link from 'next/link';

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  planName?: string;
  totalPaid?: number;
  pendingAmount?: number;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
}

export default function StaffUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    suspendedUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await fetch(`/api/staff/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setStats(data.stats || stats);
        setCurrentPage(data.pagination?.page || 1);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Users fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, searchTerm, statusFilter]);

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchUsers(currentPage);
        alert(`User ${newStatus} successfully!`);
      }
    } catch (error) {
      console.error('Status update error:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        fetchUsers(currentPage);
        alert('User deleted successfully!');
      } else {
        alert('Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleCreateInvoice = (userId: string) => {
    window.location.href = `/staff/invoices/create?customer=${userId}`;
  };

  const handlePrintReceipt = (userId: string) => {
    // Create a quick receipt for the user
    window.open(`/receipt/thermal/user/${userId}`, '_blank');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN');
  };

  const formatIndianNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
      title: 'Active',
      value: stats.activeUsers,
      icon: UserPlus,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Inactive',
      value: stats.inactiveUsers,
      icon: Users,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
    {
      title: 'Suspended',
      value: stats.suspendedUsers,
      icon: Users,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 sm:p-4 md:p-6 mobile-spacing">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Navigation */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2 sm:mb-4 text-sm sm:text-base mobile-nav">
          <Link href="/staff" className="text-slate-600 hover:text-slate-800">
            Dashboard
          </Link>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <Link href="/staff/users" className="text-blue-600 hover:text-blue-800 font-medium">
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
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">Customer Management</h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">Manage your registered customers</p>
          </div>
          
          <div className="flex flex-wrap gap-2 mobile-btn-group">
            <Button 
              onClick={() => setShowCreateUser(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm px-2 sm:px-4 py-2"
              size="sm"
            >
              <UserPlus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Add Customer</span>
              <span className="xs:hidden">Add</span>
            </Button>
            <Button 
              onClick={() => fetchUsers(currentPage)} 
              variant="outline"
              className="text-xs sm:text-sm px-2 sm:px-4 py-2"
              size="sm"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Refresh</span>
              <span className="xs:hidden">Ref</span>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mobile-stats">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="bg-white/60 backdrop-blur-sm border-0 shadow-lg mobile-card">
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

        {/* Filters */}
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
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
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              My Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-slate-400" />
                <p className="text-slate-600 mt-2">Loading customers...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-600 mb-2">No customers found</h3>
                <p className="text-slate-500 mb-6">Start by adding your first customer</p>
                <Button onClick={() => setShowCreateUser(true)} className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user._id} className="border rounded-lg p-4 bg-white hover:bg-slate-50 transition-colors mobile-card">
                    <div className="flex flex-col gap-4 mobile-user-card">
                      <div className="flex items-center space-x-4 flex-1 mobile-user-info">
                        <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-lg font-semibold flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-semibold text-slate-800">{user.name}</h4>
                            <Badge className={getStatusColor(user.status)}>
                              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                            <div>
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                <span>{user.email}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                <span>{user.phone}</span>
                              </div>
                            </div>
                            <div>
                              <div>Joined: {formatDate(user.createdAt)}</div>
                              {user.lastLogin && (
                                <div>Last login: {formatDate(user.lastLogin)}</div>
                              )}
                            </div>
                            <div>
                              {user.totalPaid !== undefined && (
                                <div className="flex items-center gap-1">
                                  <IndianRupee className="h-3 w-3" />
                                  <span>Paid: ₹{formatIndianNumber(user.totalPaid)}</span>
                                </div>
                              )}
                              {user.pendingAmount !== undefined && user.pendingAmount > 0 && (
                                <div className="text-red-600">
                                  Pending: ₹{formatIndianNumber(user.pendingAmount)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mobile-user-actions">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleCreateInvoice(user._id)}
                          className="mobile-btn flex-1"
                        >
                          <FileText className="h-4 w-4" />
                          <span className="ml-1 hidden sm:inline">Invoice</span>
                        </Button>
                        
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 mobile-btn flex-1"
                          onClick={() => handlePrintReceipt(user._id)}
                        >
                          <Printer className="h-4 w-4" />
                          <span className="ml-1 hidden sm:inline">Print</span>
                        </Button>
                        
                        {user.status === 'active' ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStatusChange(user._id, 'inactive')}
                            className="mobile-btn flex-1"
                          >
                            <span className="hidden sm:inline">Deactivate</span>
                            <span className="sm:hidden">Deact</span>
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700 mobile-btn flex-1"
                            onClick={() => handleStatusChange(user._id, 'active')}
                          >
                            <span className="hidden sm:inline">Activate</span>
                            <span className="sm:hidden">Act</span>
                          </Button>
                        )}
                        
                        <>
                          {isDesktopApp() ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 bg-gray-100 cursor-not-allowed mobile-btn flex-1"
                              disabled
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="ml-1 hidden sm:inline">Delete (Offline)</span>
                            </Button>
                          ) : null}
                          {!isDesktopApp() ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 mobile-btn flex-1"
                              onClick={() => handleDeleteUser(user._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <span className="text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create User Modal */}
        {showCreateUser && (
          <CreateUserModal onClose={() => setShowCreateUser(false)} onSuccess={fetchUsers} />
        )}
      </div>
    </div>
  );
}

// Create User Modal Component (same as admin)
function CreateUserModal({ onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    password: '',
    address: ''
  });

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
        onSuccess(); // Refresh user data
        onClose(); // Close modal
        alert('Customer created successfully!');
      } else {
        setError(result.error || 'Failed to create customer');
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
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Add New Customer</CardTitle>
          <CardDescription>Create a new customer account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium">Full Name</label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter full name"
                className="mt-1"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="Enter email address"
                className="mt-1"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                required
                placeholder="Enter phone number"
                className="mt-1"
              />
            </div>
            
            <div>
              <label htmlFor="address" className="text-sm font-medium">Address</label>
              <Input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter address (optional)"
                className="mt-1"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="Enter password"
                minLength={6}
                className="mt-1"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? 'Creating...' : 'Create Customer'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}