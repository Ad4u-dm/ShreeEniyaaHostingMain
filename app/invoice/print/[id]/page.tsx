'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ThermalReceiptTemplate } from '@/app/components/templates/thermal-receipt/ThermalReceiptTemplate';
import { Loader2 } from 'lucide-react';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  customerId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address?: string;
  };
  planId: {
    _id: string;
    name: string;
    monthlyAmount: number;
  };
  amount: number;
  dueDate: string;
  issueDate: string;
  status: string;
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

export default function PrintInvoicePage() {
  // Helper functions to safely extract data from potentially populated fields
  const getCustomerName = (customerId: any) => typeof customerId === "object" && customerId ? customerId.name : 'Unknown Customer';
  const getCustomerEmail = (customerId: any) => typeof customerId === "object" && customerId ? customerId.email : 'No email';
  const getCustomerPhone = (customerId: any) => typeof customerId === "object" && customerId ? customerId.phone : 'No phone';
  const getCustomerAddress = (customerId: any) => typeof customerId === "object" && customerId ? customerId.address : 'Address not provided';

  const params = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        console.log('=== PRINT PAGE DEBUG ===');
        console.log('Fetching invoice with ID:', params.id);
        console.log('Full URL:', window.location.href);
        
        const apiUrl = `/api/invoices/${params.id}`;
        console.log('API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Raw API response:', data);
          console.log('Invoice data:', data.invoice);
          console.log('Invoice ID fields:', {
            '_id': data.invoice?._id,
            'invoiceNumber': data.invoice?.invoiceNumber,
            'receiptNo': data.invoice?.receiptNo,
            'invoiceId': data.invoice?.invoiceId
          });
          console.log('Customer data:', data.invoice?.customerId);
          console.log('Plan data:', data.invoice?.planId);
          
          setInvoice(data.invoice);
          
          // Check if this is a download request or print request
          const urlParams = new URLSearchParams(window.location.search);
          const isDownload = urlParams.get('download') === 'true';
          
          // Auto-print after data loads (but not if it's a download request)
          setTimeout(() => {
            if (!isDownload) {
              console.log('Auto-printing invoice...');
              window.print();
            } else {
              console.log('Download mode - not auto-printing');
            }
          }, 1000);
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch invoice:', response.status, response.statusText, errorText);
          setError('Invoice not found');
        }
      } catch (err) {
        setError('Failed to load invoice');
        console.error('Error fetching invoice:', err);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      console.log('Params ID found:', params.id);
      fetchInvoice();
    } else {
      console.error('No params.id found!');
      setError('No invoice ID provided');
      setLoading(false);
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Invoice not found'}</p>
          <button 
            onClick={() => window.close()} 
            className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  // Convert invoice data to the format expected by InvoiceTemplate1
  const invoiceData = {
    sender: {
      name: "Shri Iniya Chit Funds",
      address: "Your Company Address",
      city: "Your City",
      zipCode: "PIN Code",
      country: "India"
    },
    receiver: {
      name: getCustomerName(invoice.customerId),
      email: getCustomerEmail(invoice.customerId),
      phone: getCustomerPhone(invoice.customerId),
      address: getCustomerAddress(invoice.customerId)
    },
    details: {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: new Date(invoice.issueDate).toLocaleDateString('en-IN'),
      dueDate: new Date(invoice.dueDate).toLocaleDateString('en-IN'),
      invoiceLogo: "", // Add your logo here
      currency: {
        code: "INR",
        symbol: "₹"
      }
    },
    items: invoice.items.map(item => ({
      name: item.description,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.rate,
      total: item.amount
    })),
    summary: {
      subtotal: invoice.subtotal,
      totalTax: invoice.tax,
      totalAmount: invoice.total,
      currency: "INR"
    },
    paymentInformation: {
      bankName: "Your Bank Name",
      accountName: "Shri Iniya Chit Funds",
      accountNumber: "XXXX-XXXX-XXXX",
      paymentTerms: invoice.paymentTerms
    },
    additionalNotes: invoice.notes || ""
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
        
        @page {
          margin: 0.5in;
          size: A4;
        }
      `}</style>
      
      <div className="min-h-screen bg-white">
        {/* Print Controls - Hidden during print */}
        <div className="no-print p-4 bg-slate-100 border-b">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="text-lg font-semibold">Invoice #{invoice.invoiceNumber}</h1>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              >
                🖨️ Print Invoice
              </button>
              <button
                onClick={() => window.close()}
                className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Invoice Content - This will be printed */}
        <div className="print-area p-8 max-w-4xl mx-auto">
          <ThermalReceiptTemplate invoice={invoice} />
        </div>
      </div>
    </>
  );
}