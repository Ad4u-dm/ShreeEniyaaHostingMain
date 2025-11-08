'use client';

import React from 'react';

interface ThermalReceiptProps {
  invoice: any;
}

export function ThermalReceiptTemplate({ invoice }: ThermalReceiptProps) {
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
          width: 58mm;
          max-width: 58mm;
          font-family: 'Courier New', monospace;
          font-size: 10px;
          line-height: 1.3;
          color: black;
          background: white;
          padding: 5px;
          margin: 0 auto;
        }
        
        .center {
          text-align: center;
        }
        
        .mobile-receipt {
          font-size: 11px;
          margin: 5px 0;
          text-align: center;
          font-weight: normal;
        }
        
        .company-name {
          font-size: 12px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 2px;
          letter-spacing: 0.5px;
        }
        
        .address {
          font-size: 9px;
          text-align: center;
          margin-bottom: 3px;
          letter-spacing: 0.3px;
        }
        
        .divider {
          border-top: 1px dashed #000;
          margin: 4px 0;
          width: 100%;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 2px 0;
          font-size: 9px;
          align-items: flex-start;
        }
        
        .info-label {
          flex: 0 0 45%;
          text-align: left;
        }
        
        .info-colon {
          flex: 0 0 5%;
          text-align: center;
        }
        
        .info-value {
          flex: 1;
          text-align: left;
        }
        
        .amount-row {
          display: flex;
          justify-content: space-between;
          margin: 1px 0;
          font-size: 9px;
        }
        
        .amount-label {
          flex: 0 0 65%;
          text-align: left;
        }
        
        .amount-colon {
          flex: 0 0 5%;
          text-align: center;
        }
        
        .amount-value {
          flex: 1;
          text-align: right;
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
          text-align: center;
          font-size: 9px;
          margin-top: 3px;
        }
        
        .footer-contact {
          text-align: center;
          font-size: 9px;
          margin-top: 2px;
        }
        
        @media print {
          .thermal-receipt {
            width: 58mm;
            max-width: 58mm;
            font-size: 10px;
            padding: 2px;
          }
          
          @page {
            size: 58mm auto;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>

      <div className="mobile-receipt">Mobile Receipt</div>
      <div className="divider"></div>
      
      <div className="company-name">
        SRI SIVANATHAN CHITS (P) LTD.,
      </div>
      
      <div className="address">
        KOORAINADU, MAYILADUDHURAI-609001.
      </div>
      
      <div className="divider"></div>
      
      <div className="info-row">
        <span className="info-label">Receipt No</span>
        <span className="info-colon">:</span>
        <span className="info-value">{(invoice.invoiceNumber || `${Date.now()}`).replace('RCP', '')}</span>
      </div>
      
      <div className="info-row">
        <span className="info-label">Date / Time</span>
        <span className="info-colon">:</span>
        <span className="info-value">{formatDate(invoice.issueDate || new Date().toISOString()).replace(/\//g, '/')}</span>
      </div>
      
      <div className="info-row">
        <span className="info-label">Member No</span>
        <span className="info-colon">:</span>
        <span className="info-value">{invoice.enrollment?.memberNumber || `M${Date.now().toString().slice(-6)}`}</span>
      </div>
      
      <div className="info-row">
        <span className="info-label">Member Name</span>
        <span className="info-colon">:</span>
        <span className="info-value">{invoice.customerId?.name || invoice.customer?.name || 'N/A'}</span>
      </div>
      
      <div className="info-row">
        <span className="info-label">Due No</span>
        <span className="info-colon">:</span>
        <span className="info-value">{invoice.dueNumber || Math.ceil(Math.random() * 20)}</span>
      </div>
      
      <div className="amount-row">
        <span className="amount-label">Due Amount</span>
        <span className="amount-colon">:</span>
        <span className="amount-value">{(invoice.planId?.monthlyAmount || invoice.amount || 0).toLocaleString('en-IN')}</span>
      </div>
      
      <div className="amount-row">
        <span className="amount-label">Arrear Amount</span>
        <span className="amount-colon">:</span>
        <span className="amount-value">{(invoice.arrearAmount || 0).toLocaleString('en-IN')}</span>
      </div>
      
      <div className="amount-row">
        <span className="amount-label">Pending Amount</span>
        <span className="amount-colon">:</span>
        <span className="amount-value">{((invoice.planId?.monthlyAmount || 0) - (invoice.total || invoice.amount || 0) + (invoice.arrearAmount || 0)).toLocaleString('en-IN')}</span>
      </div>
      
      <div className="amount-row">
        <span className="amount-label">Received Amount</span>
        <span className="amount-colon">:</span>
        <span className="amount-value">{(invoice.total || invoice.amount || 0).toLocaleString('en-IN')}</span>
      </div>
      
      <div className="amount-row">
        <span className="info-label">Balance Amount</span>
        <span className="info-colon">:</span>
        <span className="amount-value">{Math.max(0, (invoice.planId?.monthlyAmount || 0) - (invoice.total || invoice.amount || 0) + (invoice.arrearAmount || 0)).toLocaleString('en-IN')}</span>
      </div>
      
      <div className="total-section">
        <div className="amount-row" style={{ fontWeight: 'bold' }}>
          <span className="amount-label">Total Received Amount</span>
          <span className="amount-colon">:</span>
          <span className="amount-value">{(invoice.total || invoice.amount || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>
      
      <div className="footer-user">
        <span>User</span>
        <span>: {invoice.collectedBy?.name || 'STAFF'}</span>
      </div>
      
      <div className="footer-enquiry">For Any Enquiry</div>
      <div className="footer-contact">: 04364-221200</div>
      
      <div className="center" style={{fontSize: '8px', marginTop: '5px'}}>
        {formatTime(invoice.issueDate || new Date().toISOString())}
      </div>
    </div>
  );
}