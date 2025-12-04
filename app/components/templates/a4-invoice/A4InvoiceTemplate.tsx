import React from 'react';

interface A4InvoiceTemplateProps {
  invoice: any;
}

export function A4InvoiceTemplate({ invoice }: A4InvoiceTemplateProps) {
  return (
    <div style={{
      minHeight: '297mm', // A4 height
      width: '210mm', // A4 width
      background: '#fff',
      padding: '0',
      margin: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pageBreakAfter: 'avoid',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '900px',
        minHeight: '90%',
        background: '#fff',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        fontSize: '18px',
        color: '#222',
        padding: '32px 40px',
        margin: '0 auto',
        boxSizing: 'border-box',
        fontWeight: 'normal',
        textAlign: 'left',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        display: 'block',
        pageBreakInside: 'avoid',
      }}>
        {/* Logo */}
        <img src="/icon.png" alt="Company Logo" style={{ height: '60px', width: '60px', borderRadius: '8px', marginBottom: '8px', display: 'block' }} />
        {/* Header */}
        <h1 style={{fontSize: '22px', fontWeight: 'bold', marginBottom: '8px', color: '#1a237e'}}>Mobile Receipt</h1>
        <div style={{borderTop: '2px solid #1a237e', margin: '8px 0', width: '100%'}}></div>
        {/* Company Details */}
        <div style={{fontSize: '16px', fontWeight: 'bold', marginBottom: '4px'}}>SHREE ENIYAA CHITFUNDS (P) LTD.</div>
        <div style={{fontSize: '14px', marginBottom: '4px'}}>Mahadhana Street, Mayiladuthurai – 609 001.</div>
        <div style={{borderTop: '1px solid #bdbdbd', margin: '8px 0', width: '100%'}}></div>
        {/* Receipt Details - Left Aligned with professional spacing */}
        <div style={{textAlign: 'left', fontSize: '15px', fontFamily: 'monospace', marginTop: '12px', marginBottom: '12px'}}>
          <div style={{margin: '4px 0'}}>Receipt No     : <b>{invoice.receiptNo || 'N/A'}</b></div>
          <div style={{margin: '4px 0'}}>Date/Time      : <b>{invoice.issueDate ? new Date(invoice.issueDate).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : 'N/A'}</b></div>
          <div style={{margin: '4px 0'}}>Member No      : <b>{invoice.memberNumber || 'N/A'}</b></div>
          <div style={{margin: '4px 0'}}>Member Name    : <b>{invoice.memberName || invoice.customerId?.name || 'N/A'}</b></div>
          <div style={{margin: '4px 0'}}>Group Name     : <b>{invoice.planId?.name || invoice.planDetails?.planName || invoice.planId?.planName || invoice.planName || 'N/A'}</b></div>
          <div style={{margin: '4px 0'}}>Due No         : <b>{invoice.dueNumber || '1'}</b></div>
          <div style={{margin: '4px 0'}}>Due Amount     : <b>₹ {(invoice.dueAmount || 0).toLocaleString('en-IN')}</b></div>
          <div style={{margin: '4px 0'}}>Arrear Amount  : <b>₹ {(invoice.balanceArrear || invoice.arrearAmount || 0).toLocaleString('en-IN')}</b></div>
          <div style={{margin: '4px 0'}}>Received Amount: <b>₹ {(invoice.receivedAmount || 0).toLocaleString('en-IN')}</b></div>
          <div style={{margin: '4px 0'}}>Balance Amount : <b>₹ {(invoice.balanceAmount || 0).toLocaleString('en-IN')}</b></div>
        </div>
        <div style={{borderTop: '1px solid #bdbdbd', margin: '8px 0', width: '100%'}}></div>
        {/* Total */}
        <div style={{fontSize: '17px', fontWeight: 'bold', textAlign: 'right', margin: '8px 0'}}>
          Total Received : <span style={{color:'#1a237e'}}>₹ {(invoice.totalReceivedAmount || invoice.receivedAmount || 0).toLocaleString('en-IN')}</span>
        </div>
        <div style={{borderTop: '1px solid #bdbdbd', margin: '8px 0', width: '100%'}}></div>
        {/* Footer */}
        <div style={{textAlign: 'left', fontSize: '14px', margin: '8px 0'}}>
          Issued By : <b>{invoice.issuedBy || invoice.collectedBy?.name || invoice.staff?.name || 'ADMIN'}</b>
        </div>
        <div style={{textAlign: 'left', fontSize: '13px', margin: '4px 0'}}>
          For Any Enquiry : <b>96266 66527 / 90035 62126</b>
        </div>
        <div style={{textAlign: 'left', fontSize: '13px', margin: '4px 0', color: '#666'}}>
          Thank you for your business!
        </div>
        {/* Receipt ID at bottom */}
        <div style={{borderTop: '1px solid #bdbdbd', margin: '8px 0', width: '100%'}}></div>
        <div style={{textAlign: 'left', fontSize: '13px', margin: '4px 0'}}>
          Receipt ID: <b>{invoice.receiptNo || invoice._id || '0027'}</b>
        </div>
        <div style={{textAlign: 'left', fontSize: '12px', color: '#888'}}>
          Optimized for A4 printers
        </div>
      </div>
    </div>
  );
}
