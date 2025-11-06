'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, Printer, Send, Eye, FileText } from 'lucide-react';

interface InvoiceActionModalProps {
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function InvoiceActionModal({ invoice, isOpen, onClose }: InvoiceActionModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    const printWindow = window.open(`/receipt/thermal/${invoice._id}`, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/invoice/thermal-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ invoiceId: invoice._id })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `thermal-receipt-${invoice.invoiceNumber || invoice._id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('Thermal receipt PDF downloaded successfully!');
      } else {
        alert('Failed to download thermal receipt PDF');
      }
    } catch (error) {
      console.error('Failed to download thermal receipt PDF:', error);
      alert('Failed to download thermal receipt PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/invoice/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ invoiceId: invoice._id })
      });

      const result = await response.text();
      alert(result || 'Email sent successfully!');
    } catch (error) {
      console.error('Failed to send invoice:', error);
      alert('Failed to send invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = () => {
    window.open(`/admin/invoices`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Actions
            </CardTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            {invoice.invoiceNumber ? `Invoice #${invoice.invoiceNumber}` : 'Invoice Actions'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invoice Preview */}
          <div className="bg-slate-50 rounded-lg p-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="font-medium text-slate-700">Customer:</p>
                <p className="text-slate-600">{invoice.customer?.name || invoice.customerId?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="font-medium text-slate-700">Amount:</p>
                <p className="text-slate-600">₹{invoice.amounts?.total?.toLocaleString('en-IN') || invoice.total?.toLocaleString('en-IN') || invoice.amount?.toLocaleString('en-IN') || '0'}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleViewDetails}
              variant="outline"
              className="flex items-center gap-2"
              disabled={loading}
            >
              <Eye className="h-4 w-4" />
              View Details
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex items-center gap-2"
              disabled={loading}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              className="flex items-center gap-2"
              disabled={loading}
            >
              <Download className="h-4 w-4" />
              {loading ? 'Downloading...' : 'Download PDF'}
            </Button>
            <Button
              onClick={handleSend}
              variant="outline"
              className="flex items-center gap-2"
              disabled={loading}
            >
              <Send className="h-4 w-4" />
              {loading ? 'Sending...' : 'Email'}
            </Button>
          </div>

          <Button
            onClick={onClose}
            className="w-full"
            variant="secondary"
          >
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}