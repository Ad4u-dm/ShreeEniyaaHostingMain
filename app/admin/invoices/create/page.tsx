'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Save, Send, Eye } from 'lucide-react';
import { formatIndianNumber } from '@/lib/helpers';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

interface Plan {
  _id: string;
  planName: string;
  monthlyAmount: number;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceForm {
  customerId: string;
  planId: string;
  description: string;
  dueDate: string;
  paymentTerms: string;
  items: InvoiceItem[];
  notes: string;
  template: number;
}

export default function CreateInvoicePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<InvoiceForm>({
    customerId: '',
    planId: '',
    description: '',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentTerms: '30 days',
    items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
    notes: 'Thank you for your business!',
    template: 1
  });

  useEffect(() => {
    fetchCustomers();
    fetchPlans();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers?.map((c: any) => ({
          _id: c._id,
          name: c.name,
          email: c.email,
          phone: c.phone
        })) || []);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      setPlans([]);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, rate: 0, amount: 0 }]
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Calculate amount if quantity or rate changes
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = 0; // No tax for Chit Fund
    return subtotal + tax;
  };

  const handlePlanChange = (planId: string) => {
    const selectedPlan = plans.find(p => p._id === planId);
    if (selectedPlan) {
      setFormData({
        ...formData,
        planId,
        description: `Monthly payment for ${selectedPlan.planName}`,
        items: [{
          description: `Monthly Payment - ${selectedPlan.planName}`,
          quantity: 1,
          rate: selectedPlan.monthlyAmount,
          amount: selectedPlan.monthlyAmount
        }]
      });
    }
  };

  const handleSave = async (status: 'draft' | 'sent') => {
    setLoading(true);
    try {
      const invoiceData = {
        ...formData,
        status,
        subtotal: calculateSubtotal(),
        tax: 0,
        total: calculateTotal(),
        issueDate: new Date().toISOString()
      };

      const response = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(invoiceData)
      });

      if (response.ok) {
        alert(`Invoice ${status === 'draft' ? 'saved as draft' : 'created and sent'} successfully!`);
        window.location.href = '/admin/invoices';
      } else {
        alert('Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomer = customers.find(c => c._id === formData.customerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/admin/invoices'}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Invoices
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Create Invoice</h1>
              <p className="text-slate-600">Generate a new invoice for Chit Fund payment</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              onClick={() => handleSave('draft')}
              variant="outline"
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            <Button 
              onClick={() => handleSave('sent')}
              disabled={loading || !formData.customerId}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
              Create & Send
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Invoice Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Plan Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Customer *
                    </label>
                    <Select value={formData.customerId} onValueChange={(value) => setFormData({ ...formData, customerId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer._id} value={customer._id}>
                            {customer.name} - {customer.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Plan
                    </label>
                    <Select value={formData.planId} onValueChange={handlePlanChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan._id} value={plan._id}>
                            {plan.planName} - ₹{formatIndianNumber(plan.monthlyAmount)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Due Date *
                    </label>
                    <Input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Payment Terms
                    </label>
                    <Select value={formData.paymentTerms} onValueChange={(value) => setFormData({ ...formData, paymentTerms: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15 days">15 days</SelectItem>
                        <SelectItem value="30 days">30 days</SelectItem>
                        <SelectItem value="45 days">45 days</SelectItem>
                        <SelectItem value="60 days">60 days</SelectItem>
                        <SelectItem value="Due on receipt">Due on receipt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Invoice description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Template
                  </label>
                  <Select value={formData.template.toString()} onValueChange={(value) => setFormData({ ...formData, template: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Template 1 - Classic</SelectItem>
                      <SelectItem value="2">Template 2 - Modern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Invoice Items</CardTitle>
                  <Button onClick={addItem} variant="outline" size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-5">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Description *
                        </label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Item description"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Qty
                        </label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Rate (₹)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={item.rate}
                          onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Amount (₹)
                        </label>
                        <Input
                          value={formatIndianNumber(item.amount)}
                          disabled
                          className="bg-slate-50"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          onClick={() => removeItem(index)}
                          variant="outline"
                          size="sm"
                          disabled={formData.items.length === 1}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any additional notes or terms..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Live Receipt Preview */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Live Receipt Preview</CardTitle>
                <CardDescription>Real-time thermal receipt preview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white border rounded-lg p-4" style={{fontSize: '10px', fontFamily: 'monospace', width: '58mm', minHeight: '200px'}}>
                  <div style={{textAlign: 'center', fontWeight: 'bold', fontSize: '12px', marginBottom: '5px'}}>
                    SHREE ENIYAA CHITFUNDS (P) LTD.
                  </div>
                  <div style={{textAlign: 'center', fontSize: '9px', marginBottom: '3px'}}>
                    Shop No. 2, Irundam Thalam, No. 40, Mahathanath Street, Mayiladuthurai – 609 001.
                  </div>
                  <div style={{textAlign: 'center', marginBottom: '5px'}}>Mobile Receipt</div>
                  <div style={{borderTop: '1px dashed #000', margin: '3px 0'}}></div>
                  
                  <div style={{fontSize: '9px', margin: '2px 0'}}>
                    Receipt No: RCP{Date.now().toString().slice(-6)}
                  </div>
                  <div style={{fontSize: '9px', margin: '2px 0'}}>
                    Date / Time: {new Date().toLocaleDateString('en-IN')}
                  </div>
                  <div style={{fontSize: '9px', margin: '2px 0'}}>
                    Member Name: {selectedCustomer?.name || 'Select Customer'}
                  </div>
                  <div style={{fontSize: '9px', margin: '2px 0'}}>
                    Plan: {plans.find(p => p._id === formData.planId)?.planName || 'Select Plan'}
                  </div>
                  
                  <div style={{borderTop: '1px dashed #000', margin: '3px 0'}}></div>
                  <div style={{fontWeight: 'bold', margin: '5px 0 2px 0', fontSize: '9px'}}>Due No</div>
                  
                  <div style={{display: 'flex', justifyContent: 'space-between', margin: '1px 0', fontSize: '9px'}}>
                    <span>Due Amount</span>
                    <span>{plans.find(p => p._id === formData.planId)?.monthlyAmount?.toLocaleString('en-IN') || '0'}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', margin: '1px 0', fontSize: '9px'}}>
                    <span>Received Amount</span>
                    <span>{calculateTotal().toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', margin: '1px 0', fontSize: '9px'}}>
                    <span>Balance Amount</span>
                    <span>0</span>
                  </div>
                  
                  <div style={{borderTop: '1px dashed #000', margin: '3px 0'}}></div>
                  <div style={{marginTop: '5px', fontWeight: 'bold'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '9px'}}>
                      <span>Total Received Amount:</span>
                      <span>{calculateTotal().toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  
                  <div style={{textAlign: 'center', fontSize: '8px', marginTop: '5px'}}>
                    User: ADMIN
                  </div>
                  <div style={{textAlign: 'center', fontSize: '8px', marginTop: '3px'}}>
                    ** Any Enquiry **
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="text-sm text-slate-600">
                    <p><strong>Items:</strong> {formData.items.length}</p>
                    <p><strong>Total:</strong> ₹{formatIndianNumber(calculateTotal())}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}