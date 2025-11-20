'use client';

import React from 'react';

interface ThermalReceiptProps {
  invoice: any;
}

export function ThermalReceiptTemplate({ invoice }: ThermalReceiptProps) {
  console.log('=== THERMAL RECEIPT DEBUG ===');
  console.log('Invoice prop received:', invoice);
  console.log('Invoice receiptData:', invoice?.receiptData);
  console.log('Invoice planDetails:', invoice?.planDetails);
  console.log('Invoice planId:', invoice?.planId);
  console.log('Plan name sources:');
  console.log('  invoice.planId?.name:', invoice?.planId?.name);
  console.log('  invoice.planDetails?.planName:', invoice?.planDetails?.planName);
  console.log('  invoice.planId?.planName:', invoice?.planId?.planName);
  console.log('  invoice.planName:', invoice?.planName);
  
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

  const formatDateTime = (date: string) => {
    const dt = new Date(date);
    const dateStr = dt.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const timeStr = dt.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return `${dateStr}`;
  };

  return (
    <div style={{
      width: '80mm',
      fontFamily: 'Courier New, monospace',
      fontSize: '10px',
      lineHeight: '1.2',
      color: '#000',
      background: 'white',
      padding: '4px',
      margin: '0 auto',
      boxSizing: 'border-box',
      fontWeight: 'normal',
      textAlign: 'center'
    }}>
      
      {/* Header */}
      <div style={{fontSize: '12px', fontWeight: 'bold', marginBottom: '2px'}}>Mobile Receipt</div>
      <div style={{borderTop: '1px dashed #000', margin: '3px 0', width: '100%'}}></div>
      
      {/* Company Details */}
      <div style={{fontSize: '11px', fontWeight: 'bold', marginBottom: '1px'}}>SHREE ENIYAA CHITFUNDS (P) LTD.</div>
      <div style={{fontSize: '9px', marginBottom: '1px'}}>Mahadhana Street, Mayiladuthurai – 609 001.</div>
      <div style={{borderTop: '1px dashed #000', margin: '3px 0', width: '100%'}}></div>
      
      {/* Receipt Details - Left Aligned with consistent spacing */}
      <div style={{textAlign: 'left', fontSize: '10px', fontFamily: 'monospace'}}>
        <div style={{margin: '1px 0'}}>Receipt No     : {invoice.receiptNo || 'N/A'}</div>
        <div style={{margin: '1px 0'}}>Date/Time      : {formatDateTime(invoice.issueDate || invoice.createdAt || new Date().toISOString())}</div>
        <div style={{margin: '1px 0'}}>Member No      : {invoice.memberNumber || 'N/A'}</div>
        <div style={{margin: '1px 0'}}>Member Name    : {invoice.memberName || invoice.customerId?.name || 'N/A'}</div>
        <div style={{margin: '1px 0'}}>Group Name     : {invoice.planId?.name || invoice.planDetails?.planName || invoice.planId?.planName || invoice.planName || 'N/A'}</div>
        <div style={{margin: '1px 0'}}>Due No         : {invoice.dueNumber || '1'}</div>
        <div style={{margin: '1px 0'}}>Due Amount     : ₹ {(invoice.dueAmount || 0).toLocaleString('en-IN')}</div>
        <div style={{margin: '1px 0'}}>Arrear Amount  : ₹ {(invoice.arrearAmount || 0).toLocaleString('en-IN')}</div>
        <div style={{margin: '1px 0'}}>Received Amount: ₹ {(invoice.receivedAmount || 0).toLocaleString('en-IN')}</div>
        <div style={{margin: '1px 0'}}>Balance Amount : ₹ {(invoice.balanceAmount || 0).toLocaleString('en-IN')}</div>
      </div>
      
      <div style={{borderTop: '1px dashed #000', margin: '3px 0', width: '100%'}}></div>
      
      {/* Total */}
      <div style={{fontSize: '11px', fontWeight: 'bold', textAlign: 'center', margin: '2px 0'}}>
        Total Received : ₹ {(invoice.totalReceivedAmount || invoice.receivedAmount || 0).toLocaleString('en-IN')}
      </div>
      
      <div style={{borderTop: '1px dashed #000', margin: '3px 0', width: '100%'}}></div>
      
      {/* Footer */}
      <div style={{textAlign: 'center', fontSize: '9px', margin: '1px 0'}}>
        Issued By : {invoice.issuedBy || invoice.collectedBy?.name || invoice.staff?.name || 'ADMIN'}
      </div>
      <div style={{textAlign: 'center', fontSize: '8px', margin: '2px 0'}}>
        For Any Enquiry : 96266 66527 / 90035 62126
      </div>
      <div style={{textAlign: 'center', fontSize: '8px', margin: '2px 0', color: '#666'}}>
        Thank you for your business!
      </div>
      
      {/* Receipt ID at bottom */}
      <div style={{borderTop: '1px dashed #000', margin: '3px 0', width: '100%'}}></div>
      <div style={{textAlign: 'center', fontSize: '9px', margin: '2px 0'}}>
        Receipt ID: {invoice.receiptNo || invoice._id || '0027'}
      </div>
      <div style={{textAlign: 'center', fontSize: '8px', color: '#888'}}>
        Optimized for thermal printers
      </div>
      
    </div>
  );
}