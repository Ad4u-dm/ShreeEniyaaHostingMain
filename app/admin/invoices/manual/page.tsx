"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Calendar } from 'lucide-react';

export default function ManualInvoicePage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [planId, setPlanId] = useState('');
  const [dueNumber, setDueNumber] = useState('1');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [receivedAmount, setReceivedAmount] = useState('0');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/users?role=user&limit=1000')
      .then(r => r.ok ? r.json() : null)
      .then(d => setCustomers(d?.users || []))
      .catch(() => setCustomers([]));

    fetch('/api/plans')
      .then(r => r.ok ? r.json() : null)
      .then(d => setPlans(d?.plans || []))
      .catch(() => setPlans([]));
  }, []);

  const getUserIdFromToken = () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) return '';
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.id || '';
    } catch (e) {
      return '';
    }
  };

  const handleSubmit = async () => {
    if (!customerId || !planId) return alert('Select customer and plan');
    setSubmitting(true);
    const createdBy = getUserIdFromToken();

    const customer = customers.find(c => c._id === customerId) || {};
    const plan = plans.find(p => p._id === planId) || {};

    const payload = {
      customerId,
      planId,
      createdBy,
      customerDetails: {
        name: customer.name || '',
        phone: customer.phone || ''
      },
      planDetails: {
        planName: plan.planName || plan.name || ''
      },
      invoiceDate,
      receivedAmount: Number(receivedAmount) || 0,
      manualDueNumber: Number(dueNumber)
    };

    try {
      const res = await fetch('/api/admin/invoices/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth-token')}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('Invoice created (manual) successfully');
        window.location.href = '/admin/invoices';
      } else {
        alert('Failed: ' + (data.error || JSON.stringify(data)));
      }
    } catch (error) {
      console.error(error);
      alert('Failed to create manual invoice');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => window.history.back()} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Manual Invoice Creation</h1>
        </div>

        <div className="space-y-4 bg-white p-6 rounded shadow">
          <div>
            <label className="block text-sm font-medium mb-1">Customer</label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Select Customer</SelectItem>
                {customers.map(c => (
                  <SelectItem key={c._id} value={c._id}>{c.name} - {c.phone}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Plan</label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Select Plan</SelectItem>
                {plans.map(p => (
                  <SelectItem key={p._id} value={p._id}>{p.planName || p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Due Number (Month)</label>
            <Input value={dueNumber} onChange={(e) => setDueNumber(e.target.value)} type="number" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Invoice Date</label>
            <Input value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} type="date" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Received Amount</label>
            <Input value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)} type="number" />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4" /> Create Manual Invoice
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/admin/invoices'}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
