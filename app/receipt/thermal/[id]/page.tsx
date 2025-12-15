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
      const attempts = [
        // Try localhost first (if bridge is on same machine)
        'http://127.0.0.1:9000/health',
        'http://localhost:9000/health',
      ];
      
      // If not localhost, also try the server's IP (for Android bridge on phone)
      const serverHost = window.location.hostname;
      if (serverHost !== 'localhost' && serverHost !== '127.0.0.1') {
        // Try the web server's host
        attempts.push(`http://${serverHost}:9000/health`);
      }
      
      // Try each URL with a short timeout
      for (const url of attempts) {
        try {
          const response = await fetch(url, {
            method: 'GET',
            signal: AbortSignal.timeout(1500),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Bridge found at:', url, data);
            setBridgeAvailable(true);
            // Store the working bridge URL for later use
            sessionStorage.setItem('bridgeUrl', url.replace('/health', ''));
            return;
          }
        } catch (error) {
          console.log(`❌ Bridge not available at ${url}`);
          // Continue to next attempt
        }
      }
      
      console.log('⚠️ No bridge available');
      setBridgeAvailable(false);
    };

    checkBridge();
  }, []);

  // Print via Bluetooth bridge
  const printViaBluetooth = async () => {
    setPrintStatus('Connecting to printer...');

    try {
      // Fetch ESC/POS data from API (auth cookie sent automatically)
      const escposResponse = await fetch('/api/invoice/escpos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invoiceId: params.id }),
        credentials: 'include' // Important: ensures cookies are sent
      });

      if (!escposResponse.ok) {
        const errorData = await escposResponse.json().catch(() => ({}));
        const errorDetails = `
          Status: ${escposResponse.status}
          Error: ${errorData.error || 'Unknown'}
          Details: ${errorData.details || 'No details'}
          Message: ${errorData.message || 'No message'}
        `;
        console.error('ESC/POS API Error:', errorDetails);
        throw new Error(errorDetails);
      }

      const { data: escposData } = await escposResponse.json();

      // Get the bridge URL (previously detected and stored)
      let bridgeUrl = sessionStorage.getItem('bridgeUrl');
      
      // Fallback if not stored
      if (!bridgeUrl) {
        bridgeUrl = 'http://127.0.0.1:9000';
        const serverHost = window.location.hostname;
        if (serverHost !== 'localhost' && serverHost !== '127.0.0.1') {
          bridgeUrl = `http://${serverHost}:9000`;
        }
      }

      // Send to Bluetooth bridge
      setPrintStatus('Sending to printer...');
      console.log('Printing to bridge:', `${bridgeUrl}/print`);
      
      const printResponse = await fetch(`${bridgeUrl}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: escposData }),
      });

      if (!printResponse.ok) {
        const errorData = await printResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to print');
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
                  <span>⚠️</span>
                  <span>Bluetooth Bridge Not Connected</span>
                </div>
                <div className="text-orange-700 text-xs space-y-2">
                  <p className="font-medium">Quick Fixes:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Open the <strong>Invoify Bridge</strong> app</li>
                    <li>Tap <strong>"START SERVICE"</strong></li>
                    <li>Ensure both devices are on <strong>same WiFi</strong></li>
                    <li>Check printer is turned ON</li>
                    <li>Refresh this page</li>
                  </ol>
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium hover:text-orange-900">
                      Need help? Click here
                    </summary>
                    <div className="mt-2 p-2 bg-white rounded text-xs space-y-1">
                      <p>✅ Same WiFi network on both devices</p>
                      <p>✅ Bridge app service running (green)</p>
                      <p>✅ Bluetooth printer paired and ON</p>
                      <p className="mt-2 text-orange-600 font-medium">
                        Still having issues? Check PHONE_BLUETOOTH_PRINTING_GUIDE.md
                      </p>
                    </div>
                  </details>
                </div>
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