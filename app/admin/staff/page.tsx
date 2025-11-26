'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Filter, UserPlus, Eye, Edit, Trash2, X, Download } from 'lucide-react';

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null); // Staff ID for which to show date picker
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchStaff();
  }, [searchTerm, pagination.page]);

  const fetchStaff = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        role: 'staff', // Only fetch staff members
        ...(searchTerm && { search: searchTerm })
      });

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setStaff(result.customers || []);
        setPagination(result.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewStaff = (staffMember: any) => {
    setSelectedStaff(staffMember);
    setShowViewModal(true);
  };

  const handleEditStaff = (staffMember: any) => {
    setSelectedStaff(staffMember);
    setEditForm({
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone
    });
    setShowEditModal(true);
  };

  const handleUpdateStaff = async () => {
    try {
      const response = await fetch(`/api/users/${selectedStaff._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({...editForm, role: 'staff'})
      });

      const result = await response.json();
      if (result.success) {
        alert('Staff member updated successfully!');
        setShowEditModal(false);
        fetchStaff(); // Refresh the list
      } else {
        alert('Failed to update staff member: ' + result.message);
      }
    } catch (error) {
      console.error('Update staff error:', error);
      alert('Failed to update staff member');
    }
  };

  const handleDeleteStaff = async (staffMember: any) => {
    const confirmDelete = confirm(`Are you sure you want to delete staff member "${staffMember.name}"? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/users/${staffMember._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        alert('Staff member deleted successfully!');
        fetchStaff(); // Refresh the list
      } else {
        alert('Failed to delete staff member: ' + result.message);
      }
    } catch (error) {
      console.error('Delete staff error:', error);
      alert('Failed to delete staff member');
    }
  };

  const handleDownloadStaffReport = async (staffMember: any, date?: string) => {
    try {
      const dateParam = date ? `&date=${date}` : '';
      const staffId = staffMember.userId || staffMember._id;
      const response = await fetch(`/api/reports/staff-invoices/pdf?staffId=${staffId}${dateParam}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (!response.ok) {
        const result = await response.json();
        alert('Failed to generate report: ' + (result.error || 'Unknown error'));
        return;
      }

      // Create a blob from the response
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = date
        ? `staff-report-${staffMember.name}-${date}.pdf`
        : `staff-report-${staffMember.name}-all-time.pdf`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShowDatePicker(null);
    } catch (error) {
      console.error('Download staff report error:', error);
      alert('Failed to download report');
    }
  };

  const handleOpenPasswordModal = (staffMember: any) => {
    setSelectedStaff(staffMember);
    setPasswordForm({ password: '', confirmPassword: '' });
    setShowPasswordModal(true);
  };

  const handleChangePassword = async () => {
    if (!selectedStaff) return;
    if (!passwordForm.password || passwordForm.password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('/api/admin/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ userId: selectedStaff._id, newPassword: passwordForm.password })
      });

      const result = await response.json();
      if (result.success) {
        alert('Password changed successfully');
        setShowPasswordModal(false);
      } else {
        alert('Failed to change password: ' + (result.error || result.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Change password error:', error);
      alert('Failed to change password');
    }
  };

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
              <h1 className="text-3xl font-bold text-slate-800">Staff Management</h1>
              <p className="text-slate-600">Manage all staff members</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search staff by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Staff List */}
        <Card>
          <CardHeader>
            <CardTitle>Staff Members ({pagination.total})</CardTitle>
            <CardDescription>All staff members in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="h-12 w-12 bg-slate-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {staff.map((staffMember: any) => (
                  <div key={staffMember._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {staffMember.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{staffMember.name}</h3>
                        <p className="text-slate-600 text-sm">{staffMember.email}</p>
                        <p className="text-slate-500 text-xs">{staffMember.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-100 text-blue-800">
                        Staff
                      </Badge>
                      <div className="text-right text-sm text-slate-500">
                        <p>Joined: {new Date(staffMember.createdAt).toLocaleDateString('en-IN')}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewStaff(staffMember)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEditStaff(staffMember)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleOpenPasswordModal(staffMember)}>
                          Change
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteStaff(staffMember)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-green-50 hover:bg-green-100"
                          onClick={() => setShowDatePicker(staffMember._id)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download Report
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {staff.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <p>No staff members found matching your criteria.</p>
                  </div>
                )}
              </div>
            )}

            {/* Date Picker Modal */}
            {showDatePicker && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg max-w-md w-full p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Download Staff Report</h2>
                    <Button variant="ghost" size="sm" onClick={() => setShowDatePicker(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Date
                      </label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          const staffMember = staff.find((s: any) => s._id === showDatePicker);
                          if (staffMember) handleDownloadStaffReport(staffMember, selectedDate);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download for Date
                      </Button>
                      <Button
                        className="flex-1"
                        variant="outline"
                        onClick={() => {
                          const staffMember = staff.find((s: any) => s._id === showDatePicker);
                          if (staffMember) handleDownloadStaffReport(staffMember);
                        }}
                      >
                        Download All Time
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPagination({...pagination, page: pagination.page - 1})}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 py-2 text-sm text-slate-600">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPagination({...pagination, page: pagination.page + 1})}
                  disabled={pagination.page === pagination.pages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Staff Modal */}
        {showViewModal && selectedStaff && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Staff Details</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowViewModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-xl">
                      {selectedStaff.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedStaff.name}</h3>
                    <Badge className="bg-blue-100 text-blue-800">Staff</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm">{selectedStaff.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-sm">{selectedStaff.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">City</label>
                    <p className="text-sm">{selectedStaff.city || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">State</label>
                    <p className="text-sm">{selectedStaff.state || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Joined Date</label>
                    <p className="text-sm">{new Date(selectedStaff.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Staff Modal */}
        {showEditModal && selectedStaff && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Edit Staff Member</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    placeholder="Enter name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleUpdateStaff} className="flex-1">
                    Update Staff
                  </Button>
                  <Button variant="outline" onClick={() => setShowEditModal(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Change Password Modal */}
        {showPasswordModal && selectedStaff && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Change Password for {selectedStaff.name}</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowPasswordModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <Input
                    type="password"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm({...passwordForm, password: e.target.value})}
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleChangePassword} className="flex-1">
                    Change Password
                  </Button>
                  <Button variant="outline" onClick={() => setShowPasswordModal(false)} className="flex-1">
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