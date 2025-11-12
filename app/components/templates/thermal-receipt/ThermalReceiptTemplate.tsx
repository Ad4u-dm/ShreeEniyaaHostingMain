'use client';

import React from 'react';

interface ThermalReceiptProps {
  invoice: any;
}

export function ThermalReceiptTemplate({ invoice }: ThermalReceiptProps) {
  console.log('=== THERMAL RECEIPT DEBUG ===');
  console.log('Invoice prop received:', invoice);
  console.log('Invoice receiptData:', invoice?.receiptData);
  
  // Use saved receiptData if available, otherwise fallback to field mapping
  const useReceiptData = invoice?.receiptData;
  console.log('Using receiptData:', useReceiptData);
  
  if (!useReceiptData) {
    console.log('No receiptData found, using field mapping fallback');
    console.log('Invoice customer:', invoice?.customerId);
    console.log('Invoice plan:', invoice?.planId);
    console.log('Invoice amount:', invoice?.amount);
    console.log('Invoice total:', invoice?.total);
    console.log('Invoice receiptNo:', invoice?.receiptNo);
    console.log('Invoice memberNumber:', invoice?.memberNumber);
    console.log('Invoice dueNumber:', invoice?.dueNumber);
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="thermal-receipt">
      <style jsx>{`
        .thermal-receipt {
          width: 100%;
          max-width: 80mm;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.5;
          color: #000;
          background: white;
          padding: 12px;
          margin: 0 auto;
          box-sizing: border-box;
        }
        
        .center {
          text-align: left;
        }
        
        .mobile-receipt {
          font-size: 12px;
          margin: 8px 0;
          text-align: center;
          font-weight: 600;
          color: #1e293b;
          letter-spacing: 0.5px;
        }
        
        .company-name {
          font-size: 15px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
          line-height: 1.3;
          color: #0f172a;
        }
        
        .address {
          font-size: 12px;
          text-align: center;
          margin-bottom: 8px;
          letter-spacing: 0.3px;
          line-height: 1.4;
          color: #334155;
        }
        
        .divider {
          border-top: 2px dashed #cbd5e1;
          margin: 8px 0;
          width: 100%;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
          font-size: 12px;
          align-items: flex-start;
          line-height: 1.4;
        }
        
        .info-label {
          flex: 0 0 48%;
          text-align: left;
          color: #475569;
        }
        
        .info-colon {
          flex: 0 0 4%;
          text-align: center;
          color: #64748b;
        }
        
        .info-value {
          flex: 1;
          text-align: left;
          font-weight: 600;
          color: #0f172a;
          word-wrap: break-word;
        }
        
        .amount-row {
          display: flex;
          justify-content: space-between;
          margin: 4px 0;
          font-size: 12px;
          line-height: 1.4;
        }
        
        .amount-label {
          flex: 0 0 58%;
          text-align: left;
          color: #475569;
        }
        
        .amount-colon {
          flex: 0 0 4%;
          text-align: center;
          color: #64748b;
        }
        
        .amount-value {
          flex: 1;
          text-align: right;
          font-weight: 700;
          color: #0f172a;
        }
        
        .total-section {
          margin-top: 8px;
          border-top: 2px dashed #cbd5e1;
          padding-top: 6px;
        }
        
        .footer-user {
          font-size: 10px;
          margin-top: 8px;
          display: flex;
          justify-content: space-between;
          color: #64748b;
        }
        
        .footer-enquiry {
          text-align: center;
          font-size: 10px;
          margin-top: 6px;
          color: #475569;
          line-height: 1.5;
        }
        
        .footer-contact {
          text-align: center;
          font-size: 10px;
          margin-top: 4px;
          color: #64748b;
          line-height: 1.5;
        }
        
        @media (max-width: 640px) {
          .thermal-receipt {
            font-size: 12px;
            padding: 10px;
          }
          
          .company-name {
            font-size: 14px;
          }
          
          .address {
            font-size: 11px;
          }
          
          .info-row,
          .amount-row {
            font-size: 11px;
          }
        }
        
        @media print {
          .thermal-receipt {
            width: 80mm !important;
            max-width: 80mm !important;
            font-size: 12px !important;
            padding: 4mm !important;
            margin: 0 !important;
          }
          
          @page {
            size: 80mm auto;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="mobile-receipt">Mobile Receipt</div>
      <div className="divider"></div>
      
      <div className="company-name">
        SHREE ENIYAA CHITFUNDS (P) LTD.
      </div>
      
      <div className="address">
        Shop no. 2 , Mahadhana Street,<br/>
        Mayiladuthurai – 609 001.
      </div>
      
      <div className="divider"></div>
      
      <div className="info-row">
        <span className="info-label">Receipt No</span>
        <span className="info-colon">:</span>
        <span className="info-value">{invoice.receiptNo || 'N/A'}</span>
      </div>
      
      <div className="info-row">
        <span className="info-label">Date / Time</span>
        <span className="info-colon">:</span>
        <span className="info-value">{formatDate(invoice.issueDate || invoice.createdAt || new Date().toISOString())}</span>
      </div>
      
      <div className="info-row">
        <span className="info-label">Member No</span>
        <span className="info-colon">:</span>
        <span className="info-value">{invoice.memberNumber || 'N/A'}</span>
      </div>
      
      <div className="info-row">
        <span className="info-label">Member Name</span>
        <span className="info-colon">:</span>
        <span className="info-value">{invoice.memberName || invoice.customerId?.name || 'N/A'}</span>
      </div>
      
      <div className="info-row">
        <span className="info-label">Due No</span>
        <span className="info-colon">:</span>
        <span className="info-value">{invoice.dueNumber || '1'}</span>
      </div>
      
      <div className="amount-row">
        <span className="amount-label">Due Amount</span>
        <span className="amount-colon">:</span>
        <span className="amount-value">{(invoice.dueAmount || 0).toLocaleString('en-IN')}</span>
      </div>
      
      <div className="amount-row">
        <span className="amount-label">Arrear Amount</span>
        <span className="amount-colon">:</span>
        <span className="amount-value">{(invoice.arrearAmount || 0).toLocaleString('en-IN')}</span>
      </div>
      
      {/* Removed Pending Amount as per client requirement */}
      
      <div className="amount-row">
        <span className="amount-label">Received Amount</span>
        <span className="amount-colon">:</span>
        <span className="amount-value">{(invoice.receivedAmount || 0).toLocaleString('en-IN')}</span>
      </div>
      
      <div className="amount-row">
        <span className="amount-label">Balance Amount</span>
        <span className="amount-colon">:</span>
        <span className="amount-value">{(invoice.balanceAmount || 0).toLocaleString('en-IN')}</span>
      </div>
      
      <div className="divider"></div>
      
      <div className="total-section">
        <div className="amount-row" style={{ fontWeight: 'bold', fontSize: '13px' }}>
          <span className="amount-label">Total Received Amount</span>
          <span className="amount-colon">:</span>
          <span className="amount-value">₹ {(invoice.totalReceivedAmount || invoice.receivedAmount || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>
      
      <div className="divider"></div>
      
      <div className="center" style={{marginTop: '10px', fontSize: '11px', textAlign: 'center', color: '#475569'}}>
        <strong>Issued By:</strong> {invoice.issuedBy || invoice.collectedBy?.name || invoice.staff?.name || 'ADMIN'}
      </div>
      
      <div className="footer-enquiry" style={{marginTop: '10px', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '8px'}}>
        <div style={{fontWeight: 'bold', marginBottom: '4px', color: '#1e293b'}}>For Any Enquiry</div>
        <div style={{marginBottom: '2px'}}>📞 96266 66527 / 90035 62126</div>
        <div>📧 shreeniyaachitfunds@gmail.com</div>
      </div>
      
      <div style={{textAlign: 'center', marginTop: '10px', fontSize: '9px', color: '#94a3b8', fontStyle: 'italic'}}>
        Thank you for your business!
      </div>
    </div>
  );
}