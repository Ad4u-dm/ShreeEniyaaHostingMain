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
          width: 80mm;
          max-width: 80mm;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          color: black;
          background: white;
          padding: 8px;
          margin: 0 auto;
          box-sizing: border-box;
        }
        
        .center {
          text-align: left;
        }
        
        .mobile-receipt {
          font-size: 11px;
          margin: 5px 0;
          text-align: center;
          font-weight: normal;
        }
        
        .company-name {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 3px;
          letter-spacing: 0.5px;
          line-height: 1.2;
        }
        
        .address {
          font-size: 11px;
          text-align: center;
          margin-bottom: 4px;
          letter-spacing: 0.3px;
          line-height: 1.3;
        }
        
        .divider {
          border-top: 1px dashed #000;
          margin: 4px 0;
          width: 100%;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
          font-size: 11px;
          align-items: flex-start;
        }
        
        .info-label {
          flex: 0 0 50%;
          text-align: left;
        }
        
        .info-colon {
          flex: 0 0 5%;
          text-align: center;
        }
        
        .info-value {
          flex: 1;
          text-align: left;
          font-weight: 500;
        }
        
        .amount-row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
          font-size: 11px;
        }
        
        .amount-label {
          flex: 0 0 60%;
          text-align: left;
        }
        
        .amount-colon {
          flex: 0 0 5%;
          text-align: center;
        }
        
        .amount-value {
          flex: 1;
          text-align: right;
          font-weight: 600;
        }
        
        .total-section {
          margin-top: 5px;
          font-size: 9px;
          border-top: 1px dashed #000;
          padding-top: 3px;
        }
        
        .footer-user {
          font-size: 9px;
          margin-top: 5px;
          display: flex;
          justify-content: space-between;
        }
        
        .footer-enquiry {
          text-align: left;
          font-size: 9px;
          margin-top: 3px;
        }
        
        .footer-contact {
          text-align: left;
          font-size: 9px;
          margin-top: 2px;
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
        <div className="amount-row" style={{ fontWeight: 'bold' }}>
          <span className="amount-label">Total Received Amount</span>
          <span className="amount-colon">:</span>
          <span className="amount-value">{(invoice.totalReceivedAmount || invoice.receivedAmount || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>
      
      <div className="center" style={{marginTop: '8px', fontSize: '9px'}}>
        By: {invoice.issuedBy || invoice.collectedBy?.name || invoice.staff?.name || 'ADMIN'}
      </div>
      
      <div className="center" style={{marginTop: '3px', fontSize: '8px'}}>
        ** Any Enquiry **<br/>
        📞 96266 66527 / 90035 62126<br/>
        📧 shreeniyaachitfunds@gmail.com
      </div>
    </div>
  );
}