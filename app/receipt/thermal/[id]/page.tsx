'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ThermalReceiptTemplate } from '@/app/components/templates/thermal-receipt/ThermalReceiptTemplate';
import { Loader2, Bluetooth, Printer } from 'lucide-react';

export default function ThermalReceiptPage() {
  const params = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printStatus, setPrintStatus] = useState<string>('');
  const [bridgeAvailable, setBridgeAvailable] = useState<boolean | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect Android
    setIsAndroid(/Android/i.test(navigator.userAgent));
    
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

  // Check if Bluetooth bridge is available
  useEffect(() => {
    const checkBridge = async () => {
      // Try localhost first (for PC or Android app with local bridge)
      try {
        const response = await fetch('http://127.0.0.1:9000/health', {
          method: 'GET',
          signal: AbortSignal.timeout(2000), // 2 second timeout
        });
        if (response.ok) {
          setBridgeAvailable(true);
          return;
        }
      } catch (error) {
        // Localhost failed, try network bridge detection
      }

      // If localhost failed and we're on a phone accessing via network,
      // try the server's host (bridge might be on same machine as Next.js)
      try {
        const serverHost = window.location.hostname;
        if (serverHost !== 'localhost' && serverHost !== '127.0.0.1') {
          const response = await fetch(`http://${serverHost}:9000/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000),
          });
          setBridgeAvailable(response.ok);
          return;
        }
      } catch (error) {
        // Network bridge not available
      }

      setBridgeAvailable(false);
    };

    checkBridge();
  }, []);

  // Print via Bluetooth bridge
  const printViaBluetooth = async () => {
    setPrintStatus('Connecting to printer...');
    
    try {
      // Fetch ESC/POS data from API
      const escposResponse = await fetch('/api/invoice/escpos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: params.id }),
      });

      if (!escposResponse.ok) {
        throw new Error('Failed to generate receipt data');
      }

      const { data: escposData } = await escposResponse.json();

      // Determine bridge URL (localhost or network)
      let bridgeUrl = 'http://127.0.0.1:9000/print';
      const serverHost = window.location.hostname;
      if (serverHost !== 'localhost' && serverHost !== '127.0.0.1') {
        // Accessing from network, try bridge on same host as server
        bridgeUrl = `http://${serverHost}:9000/print`;
      }

      // Send to Bluetooth bridge
      setPrintStatus('Sending to printer...');
      const printResponse = await fetch(bridgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: escposData }),
      });

      if (!printResponse.ok) {
        throw new Error('Failed to print');
      }

      const result = await printResponse.json();
      
      if (result.success) {
        setPrintStatus('✅ Printed successfully!');
        setTimeout(() => setPrintStatus(''), 3000);
      } else {
        throw new Error(result.error || 'Print failed');
      }

    } catch (error: any) {
      console.error('Bluetooth print error:', error);
      setPrintStatus(`❌ ${error.message}`);
      
      // Fallback to browser print dialog
      setTimeout(() => {
        if (confirm('Bluetooth printing failed. Use browser print dialog instead?')) {
          window.print();
        }
        setPrintStatus('');
      }, 2000);
    }
  };

  // Handle print button click
  const handlePrint = () => {
    if (bridgeAvailable) {
      printViaBluetooth();
    } else {
      window.print();
    }
  };

  useEffect(() => {
    // Don't auto-print anymore - let user choose
    // The print button will handle it
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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-2 sm:p-4 md:p-6">
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
          width: 100%;
          max-width: 80mm;
          margin: 0 auto;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        @media (min-width: 640px) {
          .thermal-printer-ready {
            border: 1px solid #e2e8f0;
          }
        }
      `}</style>
      
      <div className="max-w-md mx-auto">
        {/* Header - No Print */}
        <div className="no-print mb-3 sm:mb-4">
          <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Printer className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-800">Thermal Receipt</h2>
                  <p className="text-xs text-slate-500">80mm format</p>
                </div>
              </div>
            </div>
            
            {/* Bridge status indicator */}
            {bridgeAvailable === true && (
              <div className="flex items-center gap-2 text-green-700 text-xs sm:text-sm bg-green-50 border border-green-200 rounded-md p-2 mb-3">
                <Bluetooth className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">Bluetooth Bridge Connected</span>
              </div>
            )}
            
            {bridgeAvailable === false && isAndroid && (
              <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mb-3">
                <div className="flex items-center gap-2 text-orange-800 text-sm font-semibold mb-2">
                  <span>📱</span>
                  <span>Android Device Detected</span>
                </div>
                <p className="text-orange-700 text-xs mb-2">
                  Install the Bluetooth Bridge app for direct thermal printing.
                </p>
                <a 
                  href="/download/InvoifyBridge.apk" 
                  className="inline-block px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 transition-colors"
                  download
                >
                  Download Bridge App
                </a>
              </div>
            )}
            
            {bridgeAvailable === false && !isAndroid && (
              <div className="flex items-center gap-2 text-yellow-700 text-xs bg-yellow-50 border border-yellow-200 rounded-md p-2 mb-3">
                <span>⚠️</span>
                <span>Bluetooth bridge offline - will use browser print</span>
              </div>
            )}
            
            {/* Print status message */}
            {printStatus && (
              <div className={`text-xs sm:text-sm font-medium p-2 rounded-md mb-3 ${
                printStatus.includes('✅') 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : printStatus.includes('❌') 
                    ? 'bg-red-50 text-red-700 border border-red-200' 
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {printStatus}
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button 
              onClick={handlePrint}
              disabled={!!printStatus && !printStatus.includes('✅')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                printStatus && !printStatus.includes('✅') 
                  ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                  : bridgeAvailable 
                    ? 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white shadow-md hover:shadow-lg' 
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {bridgeAvailable ? <Bluetooth className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
              <span className="text-sm sm:text-base">{bridgeAvailable ? 'Print via Bluetooth' : 'Print Receipt'}</span>
            </button>
            <button 
              onClick={() => window.close()} 
              className="px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 active:bg-slate-800 transition-colors shadow-md text-sm sm:text-base font-medium"
            >
              Close
            </button>
          </div>
        </div>
        
        {/* Receipt Preview */}
        <div className="thermal-printer-ready">
          <ThermalReceiptTemplate invoice={invoice} />
        </div>
        
        {/* Footer Info - No Print */}
        <div className="no-print mt-3 sm:mt-4">
          <div className="bg-white rounded-lg shadow-md p-3 text-center">
            <p className="text-xs text-slate-600">
              <span className="font-medium">Receipt ID:</span> {invoice?.receiptNo || 'N/A'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Optimized for 80mm thermal printers
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}