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
    <div style={{
  width: '80mm',
  fontFamily: 'Courier New, monospace',
  fontSize: '9px',
  lineHeight: '1',
  color: '#000',
  background: 'white',
  padding: '0',
  margin: '0 auto',
  boxSizing: 'border-box',
  fontWeight: 'normal'
    }}>
      <div style={{textAlign: 'left', margin: '0', fontWeight: 'normal'}}>Mobile Receipt</div>
      <div style={{borderTop: '1px dashed #000', margin: '2px 0', width: '100%'}}></div>
      <div style={{textAlign: 'left', fontWeight: 'normal'}}>SHREE ENIYAA CHITFUNDS (P) LTD.</div>
      <div style={{textAlign: 'left', fontWeight: 'normal'}}>Mahadhana Street, Mayiladuthurai – 609 001.</div>
      <div style={{borderTop: '1px dashed #000', margin: '2px 0', width: '100%'}}></div>
      <div style={{textAlign: 'left', margin: '0'}}>Receipt No : {invoice.receiptNo || 'N/A'}</div>
      <div style={{textAlign: 'left', margin: '0'}}>Date/Time : {formatDate(invoice.issueDate || invoice.createdAt || new Date().toISOString())}</div>
      <div style={{textAlign: 'left', margin: '0'}}>Member No : {invoice.memberNumber || 'N/A'}</div>
      <div style={{textAlign: 'left', margin: '0'}}>Member Name : {invoice.memberName || invoice.customerId?.name || 'N/A'}</div>
      <div style={{textAlign: 'left', margin: '0'}}>Due No : {invoice.dueNumber || '1'}</div>
      <div style={{textAlign: 'left', margin: '0'}}>Due Amount : {(invoice.dueAmount || 0).toLocaleString('en-IN')}</div>
      <div style={{textAlign: 'left', margin: '0'}}>Arrear Amount : {(invoice.arrearAmount || 0).toLocaleString('en-IN')}</div>
      <div style={{textAlign: 'left', margin: '0'}}>Pending Amount : {(invoice.pendingAmount || 0).toLocaleString('en-IN')}</div>
      <div style={{textAlign: 'left', margin: '0'}}>Received Amount : {(invoice.receivedAmount || 0).toLocaleString('en-IN')}</div>
      <div style={{textAlign: 'left', margin: '0'}}>Balance Amount : {(invoice.balanceAmount || 0).toLocaleString('en-IN')}</div>
      <div style={{borderTop: '1px dashed #000', margin: '2px 0', width: '100%'}}></div>
      <div style={{textAlign: 'left', margin: '0'}}>Total Received : ₹ {(invoice.totalReceivedAmount || invoice.receivedAmount || 0).toLocaleString('en-IN')}</div>
      <div style={{borderTop: '1px dashed #000', margin: '2px 0', width: '100%'}}></div>
      <div style={{textAlign: 'left', margin: '0'}}>Issued By : {invoice.issuedBy || invoice.collectedBy?.name || invoice.staff?.name || 'ADMIN'}</div>
      <div style={{textAlign: 'left', margin: '0'}}>For Any Enquiry : 96266 66527 / 90035 62126</div>
      <div style={{textAlign: 'left', margin: '0', fontSize: '10px', color: '#888'}}>Thank you for your business!</div>
    </div>
  );
}