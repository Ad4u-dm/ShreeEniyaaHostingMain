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
        SHREE ENIYAA CHITFUNDS (P) LTD.
      </div>
      
      <div className="address">
        Shop No. 2, Irundam Thalam,<br/>
        No. 40, Mahathanath Street,<br/>
        Mayiladuthurai – 609 001.
      </div>
      
      <div className="divider"></div>
      
      <div className="info-row">
        <span className="info-label">Receipt No</span>
        <span className="info-colon">:</span>
        <span className="info-value">{invoice.receiptNumber || invoice.invoiceNumber || `RCP${String(Math.floor(Math.random() * 900000) + 100000)}`}</span>
      </div>
      
      <div className="info-row">
        <span className="info-label">Date / Time</span>
        <span className="info-colon">:</span>
        <span className="info-value">{formatDate(invoice.issueDate || invoice.createdAt || new Date().toISOString())}</span>
      </div>
      
      <div className="info-row">
        <span className="info-label">Member No</span>
        <span className="info-colon">:</span>
        <span className="info-value">{invoice.enrollment?.memberNumber || invoice.memberNumber || '2154'}</span>
      </div>
      
      <div className="info-row">
        <span className="info-label">Member Name</span>
        <span className="info-colon">:</span>
        <span className="info-value">{invoice.customerId?.name || invoice.customer?.name || 'GOPALAKRISHNAN A'}</span>
      </div>
      
      <div className="divider"></div>
      
      <div className="info-row">
        <span className="info-label">Plan</span>
        <span className="info-colon">:</span>
        <span className="info-value">{invoice.planId?.planName || 'Select Plan'}</span>
      </div>
      
      <div className="divider"></div>
      
      <div className="info-row">
        <span className="info-label">Due No</span>
        <span className="info-colon">:</span>
        <span className="info-value">{invoice.dueNumber || invoice.installmentNumber || '14'}</span>
      </div>
      
      <div className="amount-row">
        <span className="amount-label">Due Amount</span>
        <span className="amount-colon">:</span>
        <span className="amount-value">{(invoice.planId?.monthlyAmount || invoice.planId?.installmentAmount || invoice.dueAmount || 9100).toLocaleString('en-IN')}</span>
      </div>
      
      <div className="amount-row">
        <span className="amount-label">Arrear Amount</span>
        <span className="amount-colon">:</span>
        <span className="amount-value">{(invoice.arrearAmount || invoice.penaltyAmount || 0).toLocaleString('en-IN')}</span>
      </div>
      
      <div className="amount-row">
        <span className="amount-label">Pending Amount</span>
        <span className="amount-colon">:</span>
        <span className="amount-value">{(invoice.pendingAmount || Math.max(0, (invoice.planId?.monthlyAmount || 9100) - (invoice.total || invoice.amount || 8800))).toLocaleString('en-IN')}</span>
      </div>
      
      <div className="amount-row">
        <span className="amount-label">Received Amount</span>
        <span className="amount-colon">:</span>
        <span className="amount-value">{(invoice.receivedAmount || invoice.amount || invoice.total || 8200).toLocaleString('en-IN')}</span>
      </div>
      
      <div className="amount-row">
        <span className="amount-label">Balance Amount</span>
        <span className="amount-colon">:</span>
        <span className="amount-value">{(invoice.balanceAmount || Math.max(0, (invoice.planId?.monthlyAmount || 9100) - (invoice.total || invoice.amount || 8800) + (invoice.arrearAmount || 0))).toLocaleString('en-IN')}</span>
      </div>
      
      <div className="divider"></div>
      
      <div className="total-section">
        <div className="amount-row" style={{ fontWeight: 'bold' }}>
          <span className="amount-label">Total Received Amount</span>
          <span className="amount-colon">:</span>
          <span className="amount-value">{(invoice.receivedAmount || invoice.total || invoice.amount || 300).toLocaleString('en-IN')}</span>
        </div>
      </div>
      
      <div className="center" style={{marginTop: '8px', fontSize: '9px'}}>
        User : {invoice.collectedBy?.name || invoice.staff?.name || 'ADMIN'}
      </div>
      
      <div className="center" style={{marginTop: '3px', fontSize: '8px'}}>
        ** Any Enquiry **<br/>
        📞 96266 66527 / 90035 62126<br/>
        📧 shreeniyaachitfunds@gmail.com
      </div>
    </div>
  );
}