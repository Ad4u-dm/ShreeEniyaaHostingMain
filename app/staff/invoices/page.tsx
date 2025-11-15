'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Filter, Eye, Download, Send, Edit, Plus, FileText, Calendar, IndianRupee, User, Printer } from 'lucide-react';
import { formatIndianNumber } from '@/lib/helpers';
import Link from 'next/link';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  receiptNo?: string;
  customerId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  planId: {
    _id: string;
    name: string;
    monthlyAmount: number;
  };
  amount: number;
  dueDate: string;
  issueDate: string;
  status: 'draft' | 'sent' | 'overdue' | 'cancelled';
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
  paymentTerms: string;
  notes?: string;
  template: number;
}

interface InvoiceStats {
  totalInvoices: number;
  draftInvoices: number;
  sentInvoices: number;
  overdueInvoices: number;
  totalAmount: number;
  pendingAmount: number;
}

export default function StaffInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoices: 0,
    draftInvoices: 0,
    sentInvoices: 0,
    overdueInvoices: 0,
    totalAmount: 0,
    pendingAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const fetchInvoices = async (page: number = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth-token');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(selectedCustomer && { customerId: selectedCustomer }),
      });

      const response = await fetch(`/api/staff/invoices?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInvoices(data.invoices || []);
        setStats(data.stats || stats);
        setCurrentPage(data.pagination?.page || 1);
        setTotalPages(data.pagination?.pages || 1);
      } else {
        console.error('Failed to fetch invoices');
      }
    } catch (error) {
      console.error('Invoice fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(currentPage);
  }, [currentPage, searchTerm, statusFilter, selectedCustomer]);

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchInvoices(currentPage);
        alert('Invoice status updated successfully!');
      } else {
        alert('Failed to update invoice status');
      }
    } catch (error) {
      console.error('Status change error:', error);
      alert('Failed to update invoice status');
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        fetchInvoices(currentPage);
        alert('Invoice sent successfully!');
      } else {
        alert('Failed to send invoice');
      }
    } catch (error) {
      console.error('Send invoice error:', error);
      alert('Failed to send invoice');
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowViewModal(true);
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    window.open(`/invoice/print/${invoice._id}`, '_blank');
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    window.open(`/api/invoices/${invoice._id}/pdf`, '_blank');
  };

  const handlePrintReceipt = (invoiceId: string) => {
    window.location.href = `/receipt/thermal/${invoiceId}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const statCards = [
    {
      title: 'Total Invoices',
      value: stats.totalInvoices,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Draft Invoices',
      value: stats.draftInvoices,
      icon: Edit,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
    {
      title: 'Sent Invoices',
      value: stats.sentInvoices,
      icon: Send,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Overdue',
      value: stats.overdueInvoices,
      icon: Calendar,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-2 sm:p-4 md:p-6 mobile-spacing">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Navigation - Only Invoices */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-2 sm:mb-4 text-sm sm:text-base mobile-nav">
          <Link href="/staff/invoices" className="text-blue-600 hover:text-blue-800 font-medium">
            Invoices
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mobile-flex-col">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">Invoice Management</h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">Manage invoices for your customers</p>
          </div>

          <div className="flex gap-2 mobile-btn-group">
            <Link href="/staff/invoices/create">
              <Button className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm px-2 sm:px-4 py-2" size="sm">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Create Invoice</span>
                <span className="xs:hidden">Create</span>
              </Button>
            </Link>
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
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    placeholder="Search invoices..."
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
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Invoices List */}
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoices
            </CardTitle>
            <CardDescription>Your created invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-600 mt-4">Loading invoices...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-600 mb-2">No invoices found</h3>
                <p className="text-slate-500 mb-6">Create your first invoice to get started</p>
                <Link href="/staff/invoices/create">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div key={invoice._id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow mobile-card">
                    <div className="flex flex-col gap-4 mobile-user-card">
                      <div className="flex-1 mobile-user-info">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-slate-800">#{invoice.invoiceNumber}</h4>
                          <Badge className={getStatusBadgeClass(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">
                          <User className="h-4 w-4 inline mr-1" />
                          {invoice.customerId.name}
                        </p>
                        <p className="text-sm text-slate-600 mb-1">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          Due: {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-slate-600">
                          <IndianRupee className="h-4 w-4 inline mr-1" />
                          {formatIndianNumber(invoice.total)}
                        </p>
                      </div>

                      <div className="flex gap-2 mobile-user-actions">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewInvoice(invoice)}
                          className="mobile-btn flex-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="ml-1 hidden sm:inline">View</span>
                        </Button>

                        {invoice.status === 'draft' && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 mobile-btn flex-1"
                            onClick={() => handleSendInvoice(invoice._id)}
                          >
                            <Send className="h-4 w-4" />
                            <span className="ml-1 hidden sm:inline">Send</span>
                          </Button>
                        )}

                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700 mobile-btn flex-1"
                          onClick={() => handlePrintReceipt(invoice._id)}
                        >
                          <Printer className="h-4 w-4" />
                          <span className="ml-1 hidden sm:inline">Print</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="px-3 py-2 text-sm text-slate-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            )}
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
                      {selectedInvoice.receiptNo && (
                        <p className="text-slate-600 text-sm">Receipt No: {selectedInvoice.receiptNo}</p>
                      )}
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
                          <th className="border border-slate-200 px-4 py-2 text-right">Qty</th>
                          <th className="border border-slate-200 px-4 py-2 text-right">Rate</th>
                          <th className="border border-slate-200 px-4 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items.map((item, index) => (
                          <tr key={index}>
                            <td className="border border-slate-200 px-4 py-2">{item.description}</td>
                            <td className="border border-slate-200 px-4 py-2 text-right">{item.quantity}</td>
                            <td className="border border-slate-200 px-4 py-2 text-right">₹{formatIndianNumber(item.rate)}</td>
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