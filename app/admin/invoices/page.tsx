'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Filter, Eye, Download, Send, Edit, Plus, FileText, Calendar, IndianRupee, User, Printer, Trash2, X } from 'lucide-react';
import { formatIndianNumber } from '@/lib/helpers';
import { isDesktopApp } from '@/lib/isDesktopApp';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  receiptNo?: string;
  customerId: {
    _id: string;
    userId?: string;
    name: string;
    email: string;
    phone: string;
  };
  planId: {
    _id: string;
    name: string;
    monthlyAmount: number;
  };
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  amount: number;
  dueDate: string;
  issueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  description: string;
  items: {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  receivedAmount?: number;
  receivedArrearAmount?: number;
  totalReceivedAmount?: number;
  paymentTerms: string;
  notes?: string;
  template: number;
}

interface InvoiceStats {
  totalInvoices: number;
  draftInvoices: number;
  sentInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalAmount: number;
  paidAmount: number;
  overdueAmount: number;
}

export default function InvoicesPage() {
  // Banner for offline mode (Electron only)
  const OfflineBanner = () => (
    isDesktopApp() && offlineMode ? (
      <div style={{ background: '#f59e42', color: '#fff', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>
        Offline Mode: Data may be outdated. Write actions are disabled.
      </div>
    ) : null
  );
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);

  // Advanced Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // For filter dropdowns
  const [customers, setCustomers] = useState<{_id: string; name: string}[]>([]);
  const [plans, setPlans] = useState<{_id: string; name: string}[]>([]);
  const [staffMembers, setStaffMembers] = useState<{_id: string; name: string}[]>([]);

  // Helper function to decode JWT and get user role
  const getUserRoleFromToken = () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) return null;
      
      // Decode JWT token (base64 decode the payload)
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      return payload.role;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  // Check if user is admin
  const isAdmin = () => userRole === 'admin';

  useEffect(() => {
    // Get user role from token
    const role = getUserRoleFromToken();
    setUserRole(role);

    fetchInvoices();
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm, statusFilter, dateFrom, dateTo, customerFilter, planFilter, staffFilter]);

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/admin/invoices', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      
      // Set empty state on error
      setInvoices([]);
      setStats({
        totalInvoices: 0,
        draftInvoices: 0,
        sentInvoices: 0,
        paidInvoices: 0,
        overdueInvoices: 0,
        totalAmount: 0,
        paidAmount: 0,
        overdueAmount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      // Fetch customers
      const customersRes = await fetch('/api/users?role=user&limit=1000', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth-token')}` }
      });
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData.users || []);
      }

      // Fetch plans
      const plansRes = await fetch('/api/plans', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth-token')}` }
      });
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.plans || []);
      }

      // Fetch staff members
      const staffRes = await fetch('/api/users?role=staff&limit=1000', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth-token')}` }
      });
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaffMembers(staffData.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  };

  const filterInvoices = () => {
    let filtered = invoices;

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber?.toLowerCase().includes(term) ||
        invoice.receiptNo?.toLowerCase().includes(term) ||
        invoice.customerId?.name?.toLowerCase().includes(term) ||
        invoice.customerId?.email?.toLowerCase().includes(term) ||
        invoice.description?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(invoice => new Date(invoice.issueDate) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // Include the entire day
      filtered = filtered.filter(invoice => new Date(invoice.issueDate) <= toDate);
    }

    // Customer filter
    if (customerFilter !== 'all') {
      filtered = filtered.filter(invoice => {
        // Support both _id and userId for customerId
        return invoice.customerId?._id === customerFilter || invoice.customerId?.userId === customerFilter;
      });
    }

    // Plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.planId?._id === planFilter);
    }

    // Staff filter (created by)
    if (staffFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.createdBy?._id === staffFilter);
    }

    setFilteredInvoices(filtered);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setCustomerFilter('all');
    setPlanFilter('all');
    setStaffFilter('all');
  };

  const hasActiveFilters = () => {
    return searchTerm || statusFilter !== 'all' || dateFrom || dateTo ||
           customerFilter !== 'all' || planFilter !== 'all' || staffFilter !== 'all';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowViewModal(true);
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    console.log('Printing invoice:', invoice);
    console.log('Invoice ID:', invoice._id);
    
    // Add cache buster to force fresh data
    const cacheBuster = Date.now();
    // Use backend server for dynamic receipt rendering
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
    const printUrl = `${backendUrl}/receipt/thermal/${invoice._id}?t=${cacheBuster}`;
    console.log('Print URL:', printUrl);
    
    // Open thermal receipt in new window for printing
    const printWindow = window.open(printUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    // Open regular print page in new window with download intent (for PDF)
    const printWindow = window.open(`/invoice/print/${invoice._id}?download=true`, '_blank');
    if (printWindow) {
      printWindow.focus();
      // Give user instruction via alert
      setTimeout(() => {
        alert('Use Ctrl+P (or Cmd+P on Mac) and select "Save as PDF" to download the invoice.');
      }, 1000);
    } else {
      alert('Please allow pop-ups to download the invoice PDF');
    }
  };

  const handleSendInvoice = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoice/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ invoiceId: invoice._id })
      });

      if (response.ok) {
        // Update invoice status to sent
        setInvoices(invoices.map(inv => 
          inv._id === invoice._id ? { ...inv, status: 'sent' as any } : inv
        ));
        alert('Invoice sent successfully!');
      }
    } catch (error) {
      console.error('Failed to send invoice:', error);
      alert('Failed to send invoice');
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    // Confirm deletion
    const confirmDelete = window.confirm(
      `Are you sure you want to delete invoice ${invoice.invoiceNumber}?\n\n` +
      `Customer: ${invoice.customerId.name}\n` +
      `Amount: ₹${formatIndianNumber(invoice.total)}\n` +
      `Status: ${invoice.status}\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/invoices/${invoice._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Remove invoice from local state
        setInvoices(invoices.filter(inv => inv._id !== invoice._id));
        
        // Show success message
        alert(`Invoice ${invoice.invoiceNumber} has been deleted successfully.`);
        
        // Refresh invoice data to update stats
        fetchInvoices();
        
      } else {
        throw new Error(result.error || 'Failed to delete invoice');
      }
    } catch (error: any) {
      console.error('Failed to delete invoice:', error);
      alert(`Failed to delete invoice: ${error.message}`);
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
      <OfflineBanner />
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
              <h1 className="text-3xl font-bold text-slate-800">Invoice Management</h1>
              <p className="text-slate-600">Create, view, and manage all invoices</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              onClick={() => window.location.href = '/admin/invoices/create'}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Invoice
            </Button>
            <Button 
              onClick={() => window.location.href = '/admin/utilities/update-arrears'}
              variant="outline"
              className="flex items-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
              title="Update monthly arrears (21st or last day of month)"
            >
              <IndianRupee className="h-4 w-4" />
              Update Arrears
            </Button>
            <Button onClick={fetchInvoices} variant="outline">
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <span className="text-2xl font-bold text-slate-800">{stats.totalInvoices}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold text-slate-800">
                    ₹{formatIndianNumber(stats.totalAmount)}
                  </span>
                </div>
              </CardContent>
            </Card>


          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Filter Invoices</CardTitle>
              <div className="flex items-center gap-2">
                {hasActiveFilters() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear All Filters
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <Filter className="h-4 w-4 mr-1" />
                  {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Basic Filters */}
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by invoice number, receipt number, customer name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Advanced Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date Range */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Date From
                    </label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Date To
                    </label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>

                  {/* Customer Filter */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      <User className="h-4 w-4 inline mr-1" />
                      Customer
                    </label>
                    <Select value={customerFilter} onValueChange={setCustomerFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Customers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        {customers.map((customer) => (
                          <SelectItem key={customer._id} value={customer._id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Plan Filter */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      <FileText className="h-4 w-4 inline mr-1" />
                      Plan
                    </label>
                    <Select value={planFilter} onValueChange={setPlanFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Plans" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        {plans.map((plan) => (
                          <SelectItem key={plan._id} value={plan._id}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Staff Filter */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      <User className="h-4 w-4 inline mr-1" />
                      Created By (Staff)
                    </label>
                    <Select value={staffFilter} onValueChange={setStaffFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Staff" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Staff</SelectItem>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff._id} value={staff._id}>
                            {staff.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Invoices ({filteredInvoices.length})</CardTitle>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Filter className="h-4 w-4" />
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Invoice Number</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Total Received Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Issued By</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">
                          {invoice.receiptNo ? `INV${invoice.receiptNo}` : invoice.invoiceNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-600">
                          {new Date(invoice.issueDate).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{invoice.customerId.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">
                          ₹{formatIndianNumber((invoice.receivedAmount || 0) + (invoice.receivedArrearAmount || 0))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-600">
                          {invoice.createdBy?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewInvoice(invoice)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintInvoice(invoice)}
                            className="flex items-center gap-1"
                          >
                            <Printer className="h-3 w-3" />
                            Print
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadInvoice(invoice)}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            PDF
                          </Button>
                          {invoice.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendInvoice(invoice)}
                              className="flex items-center gap-1"
                            >
                              <Send className="h-3 w-3" />
                              Send
                            </Button>
                          )}
                          {isAdmin() && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteInvoice(invoice)}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredInvoices.length === 0 && (
                <div className="text-center py-8 text-slate-600">
                  No invoices found matching your criteria.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoice View Modal */}
        {showViewModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">Invoice Details</h2>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => handlePrintInvoice(selectedInvoice)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                    <Button
                      onClick={() => handleDownloadInvoice(selectedInvoice)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowViewModal(false)}
                    >
                      Close
                    </Button>
                  </div>
                </div>

                {/* Invoice Preview */}
                <div className="bg-white border rounded-lg p-8">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h1 className="text-3xl font-bold text-slate-800">INVOICE</h1>
                      <p className="text-slate-600 mt-2">{selectedInvoice.invoiceNumber}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(selectedInvoice.status)}>
                        {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-3">Bill To:</h3>
                      <div className="space-y-1">
                        <p className="font-medium">{selectedInvoice.customerId.name}</p>
                        <p className="text-slate-600">{selectedInvoice.customerId.email}</p>
                        <p className="text-slate-600">{selectedInvoice.customerId.phone}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-3">Invoice Details:</h3>
                      <div className="space-y-1">
                        <p><span className="text-slate-600">Issue Date:</span> {new Date(selectedInvoice.issueDate).toLocaleDateString('en-IN')}</p>
                        <p><span className="text-slate-600">Due Date:</span> {new Date(selectedInvoice.dueDate).toLocaleDateString('en-IN')}</p>
                        <p><span className="text-slate-600">Payment Terms:</span> {selectedInvoice.paymentTerms}</p>
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="mb-8">
                    <table className="w-full border-collapse border border-slate-200">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="border border-slate-200 px-4 py-2 text-left">Description</th>
                          <th className="border border-slate-200 px-4 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items.map((item, index) => (
                          <tr key={index}>
                            <td className="border border-slate-200 px-4 py-2">{item.description}</td>
                            <td className="border border-slate-200 px-4 py-2 text-right">₹{formatIndianNumber(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end mb-8">
                    <div className="w-64">
                      <div className="flex justify-between py-2">
                        <span className="text-slate-600">Subtotal:</span>
                        <span>₹{formatIndianNumber(selectedInvoice.subtotal)}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-600">Tax:</span>
                        <span>₹{formatIndianNumber(selectedInvoice.tax)}</span>
                      </div>
                      <div className="flex justify-between py-2 font-bold text-lg border-t border-slate-200">
                        <span>Total:</span>
                        <span>₹{formatIndianNumber(selectedInvoice.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedInvoice.notes && (
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-2">Notes:</h3>
                      <p className="text-slate-600">{selectedInvoice.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}