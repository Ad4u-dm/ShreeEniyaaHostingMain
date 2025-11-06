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
          line-height: 1.2;
          color: black;
          background: white;
          padding: 5px;
          margin: 0 auto;
        }
        
        .center {
          text-align: center;
        }
        
        .header {
          text-align: center;
          font-weight: bold;
          font-size: 12px;
          margin-bottom: 5px;
        }
        
        .company-name {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 2px;
        }
        
        .address {
          font-size: 9px;
          text-align: center;
          margin-bottom: 3px;
        }
        
        .divider {
          border-top: 1px dashed #000;
          margin: 3px 0;
        }
        
        .receipt-info {
          font-size: 9px;
          margin: 2px 0;
        }
        
        .items-header {
          font-weight: bold;
          margin: 5px 0 2px 0;
        }
        
        .item-row {
          display: flex;
          justify-content: space-between;
          margin: 1px 0;
          font-size: 9px;
        }
        
        .total-section {
          margin-top: 5px;
          font-weight: bold;
        }
        
        .footer {
          text-align: center;
          font-size: 8px;
          margin-top: 5px;
        }
        
        .enquiry {
          text-align: center;
          font-size: 8px;
          margin-top: 3px;
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

      <div className="company-name">
        SRI INIYA CHIT FUND
      </div>
      
      <div className="address">
        KOVILNADU, MAYILADUDHURAI-609001
      </div>
      
      <div className="center">Mobile Receipt</div>
      
      <div className="divider"></div>
      
      <div className="receipt-info">
        Receipt No: {invoice.invoiceNumber || `RCP${Date.now()}`}
      </div>
      
      <div className="receipt-info">
        Date / Time: {formatDate(invoice.issueDate || new Date().toISOString())}
      </div>
      
      <div className="receipt-info">
        Member No: {invoice.enrollment?.memberNumber || invoice.customerId?._id?.slice(-4) || '----'}
      </div>
      
      <div className="receipt-info">
        Member Name: {invoice.customerId?.name || invoice.customer?.name || 'N/A'}
      </div>
      
      <div className="receipt-info">
        Ticket No: {invoice.planId?._id?.slice(-4) || '----'}
      </div>
      
      <div className="divider"></div>
      
      <div className="items-header">Due No</div>
      
      <div className="item-row">
        <span>Due Amount</span>
        <span>{invoice.planId?.monthlyAmount || invoice.amount || 0}</span>
      </div>
      
      <div className="item-row">
        <span>Arrear Amount</span>
        <span>0</span>
      </div>
      
      <div className="item-row">
        <span>Pending Amount</span>
        <span>0</span>
      </div>
      
      <div className="item-row">
        <span>Received Amount</span>
        <span>{invoice.total || invoice.amount || 0}</span>
      </div>
      
      <div className="item-row">
        <span>Balance Amount</span>
        <span>0</span>
      </div>
      
      <div className="divider"></div>
      
      <div className="total-section">
        <div className="item-row">
          <span>Total Received Amount: </span>
          <span>{invoice.total || invoice.amount || 0}</span>
        </div>
      </div>
      
      <div className="footer">
        User: {invoice.collectedBy?.name || 'ADMIN'}
      </div>
      
      <div className="enquiry">
        ** Any Enquiry **
      </div>
      
      <div className="center" style={{fontSize: '8px', marginTop: '5px'}}>
        {formatTime(invoice.issueDate || new Date().toISOString())}
      </div>
    </div>
  );
}