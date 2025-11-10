'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ThermalReceiptTemplate } from '@/app/components/templates/thermal-receipt/ThermalReceiptTemplate';
import { Loader2 } from 'lucide-react';

export default function ThermalReceiptPage() {
  const params = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/invoices/${params.id}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setInvoice(data.invoice);
          } else {
            setError('Invoice not found');
          }
        } else {
          setError('Failed to fetch invoice');
        }
      } catch (error) {
        console.error('Error fetching invoice:', error);
        setError('Error loading invoice');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [params.id]);

  useEffect(() => {
    // Auto-print when invoice is loaded
    if (invoice && !loading) {
      const timer = setTimeout(() => {
        window.print();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [invoice, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading thermal receipt...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.close()} 
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 flex justify-center">
      <style jsx global>{`
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: 80mm auto;
            margin: 0 !important;
          }
        }
        
        /* Thermal printer specific styles */
        .thermal-printer-ready {
          width: 80mm;
          max-width: 80mm;
        }
      `}</style>
      
      <div className="no-print mb-4 text-center">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">80mm Thermal Receipt</h2>
          <p className="text-sm text-blue-600 mb-3">Optimized for 80mm thermal roll printers</p>
          <div className="text-xs text-blue-500 mb-3">
            <p>✓ 80mm width compatible</p>
            <p>✓ Auto-feed supported</p>
            <p>✓ High contrast for thermal printing</p>
          </div>
        </div>
        
        <div className="flex gap-2 justify-center">
          <button 
            onClick={() => window.print()} 
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
          >
            🖨️ Print to Thermal Printer
          </button>
          <button 
            onClick={() => window.close()} 
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
      
      <div className="thermal-printer-ready">
        <ThermalReceiptTemplate invoice={invoice} />
      </div>
    </div>
  );
}