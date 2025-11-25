import React from 'react';

interface A4InvoiceTemplateProps {
  invoice: any;
}

export function A4InvoiceTemplate({ invoice }: A4InvoiceTemplateProps) {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f6fa',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '900px',
        minHeight: '1100px',
        background: '#fff',
        fontFamily: 'Courier New, monospace',
        fontSize: '18px',
        color: '#000',
        padding: '48px 56px',
        margin: '0 auto',
        boxSizing: 'border-box',
        fontWeight: 'normal',
        textAlign: 'center',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Logo */}
        <img src="/icon.png" alt="Company Logo" style={{ height: '60px', width: '60px', borderRadius: '12px', marginBottom: '8px' }} />
        {/* Header */}
        <div style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '2px'}}>Mobile Receipt</div>
          <div style={{borderTop: '1px dashed #000', margin: '3px 0', width: '100%'}}></div>
          {/* Company Details */}
          <div style={{fontSize: '13px', fontWeight: 'bold', marginBottom: '1px'}}>SHREE ENIYAA CHITFUNDS (P) LTD.</div>
          <div style={{fontSize: '11px', marginBottom: '1px'}}>Mahadhana Street, Mayiladuthurai – 609 001.</div>
          <div style={{borderTop: '1px dashed #000', margin: '3px 0', width: '100%'}}></div>
          {/* Receipt Details - Left Aligned with consistent spacing */}
          <div style={{textAlign: 'left', fontSize: '12px', fontFamily: 'monospace'}}>
            <div style={{margin: '1px 0'}}>Receipt No     : {invoice.receiptNo || 'N/A'}</div>
            <div style={{margin: '1px 0'}}>Date/Time      : {invoice.issueDate ? new Date(invoice.issueDate).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : 'N/A'}</div>
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
          <div style={{fontSize: '13px', fontWeight: 'bold', textAlign: 'center', margin: '2px 0'}}>
            Total Received : ₹ {(invoice.totalReceivedAmount || invoice.receivedAmount || 0).toLocaleString('en-IN')}
          </div>
          <div style={{borderTop: '1px dashed #000', margin: '3px 0', width: '100%'}}></div>
          {/* Footer */}
          <div style={{textAlign: 'center', fontSize: '11px', margin: '1px 0'}}>
            Issued By : {invoice.issuedBy || invoice.collectedBy?.name || invoice.staff?.name || 'ADMIN'}
          </div>
          <div style={{textAlign: 'center', fontSize: '10px', margin: '2px 0'}}>
            For Any Enquiry : 96266 66527 / 90035 62126
          </div>
          <div style={{textAlign: 'center', fontSize: '10px', margin: '2px 0', color: '#666'}}>
            Thank you for your business!
          </div>
          {/* Receipt ID at bottom */}
          <div style={{borderTop: '1px dashed #000', margin: '3px 0', width: '100%'}}></div>
          <div style={{textAlign: 'center', fontSize: '11px', margin: '2px 0'}}>
            Receipt ID: {invoice.receiptNo || invoice._id || '0027'}
          </div>
          <div style={{textAlign: 'center', fontSize: '10px', color: '#888'}}>
            Optimized for A4 printers
          </div>
      </div>
    </div>
  );
}
