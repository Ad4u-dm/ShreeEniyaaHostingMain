'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Filter, Eye, Download, Send, Edit, Plus, FileText, Calendar, IndianRupee, User, Printer } from 'lucide-react';
import { formatIndianNumber } from '@/lib/helpers';

interface Invoice {
  _id: string;
  invoiceNumber: string;
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchTerm, statusFilter]);

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

  const filterInvoices = () => {
    let filtered = invoices;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(term) ||
        invoice.customerId.name.toLowerCase().includes(term) ||
        invoice.customerId.email.toLowerCase().includes(term) ||
        invoice.description.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    setFilteredInvoices(filtered);
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
    // Open invoice in new window for printing
    const printWindow = window.open(`/invoice/print/${invoice._id}`, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoice/export?id=${invoice._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoice.invoiceNumber}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download invoice:', error);
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

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Paid Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-emerald-500" />
                  <span className="text-2xl font-bold text-slate-800">
                    ₹{formatIndianNumber(stats.paidAmount)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Overdue Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold text-slate-800">
                    ₹{formatIndianNumber(stats.overdueAmount)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by invoice number, customer name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map((status) => (
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
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Invoice</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Due Date</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-slate-800">{invoice.invoiceNumber}</div>
                          <div className="text-sm text-slate-600">
                            {new Date(invoice.issueDate).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-slate-800">{invoice.customerId.name}</div>
                          <div className="text-sm text-slate-600">{invoice.customerId.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">
                          ₹{formatIndianNumber(invoice.total)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-slate-800">
                          {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
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