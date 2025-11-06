'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, IndianRupee, Calendar, TrendingUp, Users, FileText, Plus, Edit, Eye, X, Save, Trash2 } from 'lucide-react';
import { formatIndianNumber } from '@/lib/helpers';

interface MonthlyData {
  monthNumber: number;
  installmentAmount: number;
  dividend: number;
  payableAmount: number;
}

interface Plan {
  _id: string;
  planId: string;
  planName: string;
  totalAmount: number;
  duration: number;
  monthlyAmount?: number;
  monthlyData: MonthlyData[];
  totalMembers: number;
  commissionRate: number;
  processingFee: number;
  description?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [newPlan, setNewPlan] = useState({
    planName: '',
    totalAmount: 0,
    duration: 20,
    totalMembers: 20,
    commissionRate: 5,
    processingFee: 0,
    description: ''
  });
  const [createMode, setCreateMode] = useState<'auto' | 'manual'>('auto');
  const [manualMonthlyData, setManualMonthlyData] = useState<MonthlyData[]>([]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setPlans(result.plans);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan({...plan});
    setShowEditModal(true);
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;

    try {
      const response = await fetch(`/api/plans/${editingPlan._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(editingPlan)
      });

      const result = await response.json();
      if (result.success) {
        alert('Plan updated successfully!');
        setShowEditModal(false);
        fetchPlans();
      } else {
        alert('Failed to update plan: ' + result.message);
      }
    } catch (error) {
      console.error('Update plan error:', error);
      alert('Failed to update plan');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    const confirmDelete = confirm('Are you sure you want to deactivate this plan?');
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      const result = await response.json();
      if (result.success) {
        alert('Plan deactivated successfully!');
        fetchPlans();
      } else {
        alert('Failed to deactivate plan: ' + result.message);
      }
    } catch (error) {
      console.error('Delete plan error:', error);
      alert('Failed to deactivate plan');
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlan.planName || !newPlan.totalAmount || !newPlan.duration) {
      alert('Please fill in all required fields');
      return;
    }

    let monthlyData;
    
    if (createMode === 'manual') {
      // Use manually configured monthly data
      if (manualMonthlyData.length !== newPlan.duration) {
        alert('Please configure all monthly data before creating the plan');
        return;
      }
      monthlyData = manualMonthlyData;
    } else {
      // Generate monthly data with equal distribution (auto mode)
      const baseAmount = Math.round(newPlan.totalAmount / newPlan.duration);
      monthlyData = [];
      
      for (let i = 1; i <= newPlan.duration; i++) {
        // Decrease dividend each month (starting high, ending low)
        const dividend = Math.round((baseAmount * 0.4) * ((newPlan.duration - i + 1) / newPlan.duration));
        const installmentAmount = baseAmount;
        const payableAmount = installmentAmount - dividend;
        
        monthlyData.push({
          monthNumber: i,
          installmentAmount,
          dividend,
          payableAmount
        });
      }
    }

    const planData = {
      ...newPlan,
      monthlyData
    };

    try {
      const response = await fetch('/api/plans/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(planData)
      });

      const result = await response.json();
      if (result.success) {
        alert('Plan created successfully!');
        setShowCreateModal(false);
        setCreateMode('auto');
        setManualMonthlyData([]);
        setNewPlan({
          planName: '',
          totalAmount: 0,
          duration: 20,
          totalMembers: 20,
          commissionRate: 5,
          processingFee: 0,
          description: ''
        });
        fetchPlans();
      } else {
        alert('Failed to create plan: ' + result.error);
      }
    } catch (error) {
      console.error('Create plan error:', error);
      alert('Failed to create plan');
    }
  };

  const updateMonthlyData = (monthIndex: number, field: keyof MonthlyData, value: number) => {
    if (!editingPlan) return;
    
    const updatedMonthlyData = [...editingPlan.monthlyData];
    updatedMonthlyData[monthIndex] = {
      ...updatedMonthlyData[monthIndex],
      [field]: value
    };
    
    // Recalculate payableAmount if installmentAmount or dividend changes
    if (field === 'installmentAmount' || field === 'dividend') {
      updatedMonthlyData[monthIndex].payableAmount = 
        updatedMonthlyData[monthIndex].installmentAmount - updatedMonthlyData[monthIndex].dividend;
    }
    
    setEditingPlan({
      ...editingPlan,
      monthlyData: updatedMonthlyData
    });
  };

  const updateManualMonthlyData = (monthIndex: number, field: keyof MonthlyData, value: number) => {
    const updatedMonthlyData = [...manualMonthlyData];
    updatedMonthlyData[monthIndex] = {
      ...updatedMonthlyData[monthIndex],
      [field]: value
    };
    
    // Recalculate payableAmount if installmentAmount or dividend changes
    if (field === 'installmentAmount' || field === 'dividend') {
      updatedMonthlyData[monthIndex].payableAmount = 
        updatedMonthlyData[monthIndex].installmentAmount - updatedMonthlyData[monthIndex].dividend;
    }
    
    setManualMonthlyData(updatedMonthlyData);
  };

  const handleDurationChange = (duration: number) => {
    setNewPlan({...newPlan, duration});
    
    if (createMode === 'manual') {
      // Generate default monthly data structure when duration changes
      const baseAmount = newPlan.totalAmount > 0 ? Math.round(newPlan.totalAmount / duration) : 5000;
      const newMonthlyData = [];
      
      for (let i = 1; i <= duration; i++) {
        const dividend = Math.round((baseAmount * 0.3) * ((duration - i + 1) / duration));
        const installmentAmount = baseAmount;
        const payableAmount = installmentAmount - dividend;
        
        newMonthlyData.push({
          monthNumber: i,
          installmentAmount,
          dividend,
          payableAmount
        });
      }
      
      setManualMonthlyData(newMonthlyData);
    }
  };

  const generateAutoMonthlyData = () => {
    if (!newPlan.totalAmount || !newPlan.duration) return;
    
    const baseAmount = Math.round(newPlan.totalAmount / newPlan.duration);
    const newMonthlyData = [];
    
    for (let i = 1; i <= newPlan.duration; i++) {
      const dividend = Math.round((baseAmount * 0.3) * ((newPlan.duration - i + 1) / newPlan.duration));
      const installmentAmount = baseAmount;
      const payableAmount = installmentAmount - dividend;
      
      newMonthlyData.push({
        monthNumber: i,
        installmentAmount,
        dividend,
        payableAmount
      });
    }
    
    setManualMonthlyData(newMonthlyData);
  };

  const getPlanColor = (totalAmount: number) => {
    if (totalAmount >= 1000000) return 'border-red-200 bg-red-50';
    if (totalAmount >= 500000) return 'border-purple-200 bg-purple-50';
    if (totalAmount >= 200000) return 'border-green-200 bg-green-50';
    if (totalAmount >= 100000) return 'border-blue-200 bg-blue-50';
    return 'border-gray-200 bg-gray-50';
  };

  const getPlanBadgeColor = (totalAmount: number) => {
    if (totalAmount >= 1000000) return 'bg-red-100 text-red-800';
    if (totalAmount >= 500000) return 'bg-purple-100 text-purple-800';
    if (totalAmount >= 200000) return 'bg-green-100 text-green-800';
    if (totalAmount >= 100000) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Available Plans</h1>
              <p className="text-slate-600">ChitFund investment plans and details</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-slate-200 rounded w-2/3 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-200 rounded"></div>
                    <div className="h-3 bg-slate-200 rounded w-4/5"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {plans.map((plan) => (
                <Card
                  key={plan._id}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-xl transform hover:scale-105 ${getPlanColor(plan.totalAmount)}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-bold text-slate-800">
                        {plan.planName}
                      </CardTitle>
                      <Badge className={getPlanBadgeColor(plan.totalAmount)}>
                        {plan.duration}M
                      </Badge>
                    </div>
                    <CardDescription className="text-slate-600">
                      Complete in {plan.duration} months • {plan.totalMembers} members
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Total Value</span>
                        <span className="font-bold text-xl text-green-600">
                          ₹{formatIndianNumber(plan.totalAmount)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Avg. Monthly</span>
                        <span className="font-semibold text-blue-600">
                          ₹{formatIndianNumber(plan.monthlyAmount || Math.round(plan.totalAmount / plan.duration))}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Commission</span>
                        <span className="font-semibold text-purple-600">
                          {plan.commissionRate}%
                        </span>
                      </div>
                      
                      <div className="pt-2 border-t flex gap-2">
                        <Button 
                          className="flex-1 text-sm" 
                          variant="outline"
                          onClick={() => setSelectedPlan(plan)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          className="flex-1 text-sm" 
                          variant="outline"
                          onClick={() => handleEditPlan(plan)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          className="text-sm text-red-600 hover:text-red-700" 
                          variant="outline"
                          onClick={() => handleDeletePlan(plan._id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Selected Plan Details */}
            {selectedPlan && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold text-slate-800">
                        {selectedPlan.planName} - Detailed Breakdown
                      </CardTitle>
                      <CardDescription>
                        Month-wise installment and dividend details
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setSelectedPlan(null)}>
                      Close Details
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Plan Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <IndianRupee className="h-5 w-5" />
                        <span className="font-semibold">Total Value</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-800">
                        ₹{formatIndianNumber(selectedPlan.totalAmount)}
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600 mb-2">
                        <Calendar className="h-5 w-5" />
                        <span className="font-semibold">Duration</span>
                      </div>
                      <p className="text-2xl font-bold text-green-800">
                        {selectedPlan.duration} Months
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-purple-600 mb-2">
                        <TrendingUp className="h-5 w-5" />
                        <span className="font-semibold">Max Dividend</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-800">
                        ₹{formatIndianNumber(selectedPlan.monthlyData[0]?.dividend || 0)}
                      </p>
                    </div>
                    
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-600 mb-2">
                        <FileText className="h-5 w-5" />
                        <span className="font-semibold">Monthly EMI</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-800">
                        ₹{formatIndianNumber(selectedPlan.monthlyData[0]?.installmentAmount || 0)}
                      </p>
                    </div>
                  </div>

                  {/* Monthly Breakdown Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border p-3 text-left font-semibold">Month</th>
                          <th className="border p-3 text-right font-semibold">Installment</th>
                          <th className="border p-3 text-right font-semibold">Dividend</th>
                          <th className="border p-3 text-right font-semibold">Payable Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPlan.monthlyData.map((monthData: any, index: number) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="border p-3 font-medium">Month {monthData.monthNumber}</td>
                            <td className="border p-3 text-right">₹{formatIndianNumber(monthData.installmentAmount)}</td>
                            <td className="border p-3 text-right text-green-600 font-semibold">
                              ₹{formatIndianNumber(monthData.dividend)}
                            </td>
                            <td className="border p-3 text-right text-blue-600 font-semibold">
                              ₹{formatIndianNumber(monthData.payableAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Create Plan Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-800">Create New Plan</h2>
                    <p className="text-slate-600">Add a new ChitFund investment plan with custom or auto-generated amounts</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setShowCreateModal(false);
                    setCreateMode('auto');
                    setManualMonthlyData([]);
                  }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-6">
                {/* Creation Mode Selection */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">Creation Mode</h3>
                  <div className="flex gap-4">
                    <Button
                      variant={createMode === 'auto' ? 'default' : 'outline'}
                      onClick={() => setCreateMode('auto')}
                      className="flex-1"
                    >
                      Auto Generate
                    </Button>
                    <Button
                      variant={createMode === 'manual' ? 'default' : 'outline'}
                      onClick={() => {
                        setCreateMode('manual');
                        if (newPlan.totalAmount && newPlan.duration) {
                          generateAutoMonthlyData();
                        }
                      }}
                      className="flex-1"
                    >
                      Month-wise Custom
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {createMode === 'auto' ? 
                      'Amounts will be automatically calculated with decreasing dividends' : 
                      'Customize installment and dividend for each month individually'
                    }
                  </p>
                </div>

                {/* Basic Plan Details */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">Basic Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
                      <Input
                        placeholder="e.g., ₹3L Plan"
                        value={newPlan.planName}
                        onChange={(e) => setNewPlan({...newPlan, planName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹) *</label>
                      <Input
                        type="number"
                        placeholder="e.g., 300000"
                        value={newPlan.totalAmount || ''}
                        onChange={(e) => {
                          const amount = Number(e.target.value);
                          setNewPlan({...newPlan, totalAmount: amount});
                          if (createMode === 'manual' && amount && newPlan.duration) {
                            generateAutoMonthlyData();
                          }
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months) *</label>
                      <Input
                        type="number"
                        value={newPlan.duration}
                        onChange={(e) => handleDurationChange(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Members</label>
                      <Input
                        type="number"
                        value={newPlan.totalMembers}
                        onChange={(e) => setNewPlan({...newPlan, totalMembers: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Commission (%)</label>
                      <Input
                        type="number"
                        value={newPlan.commissionRate}
                        onChange={(e) => setNewPlan({...newPlan, commissionRate: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Processing Fee (₹)</label>
                      <Input
                        type="number"
                        value={newPlan.processingFee}
                        onChange={(e) => setNewPlan({...newPlan, processingFee: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <Input
                      placeholder="Plan description (optional)"
                      value={newPlan.description}
                      onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                    />
                  </div>
                </div>

                {/* Month-wise Data Table (Only in Manual Mode) */}
                {createMode === 'manual' && manualMonthlyData.length > 0 && (
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-slate-700">Month-wise Amounts</h3>
                      <Button
                        variant="outline" 
                        size="sm"
                        onClick={generateAutoMonthlyData}
                      >
                        Reset to Auto-Generated
                      </Button>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-semibold text-slate-700">Month</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-700">Installment (₹)</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-700">Dividend (₹)</th>
                            <th className="text-left py-2 px-3 font-semibold text-slate-700">Payable (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {manualMonthlyData.map((month, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}>
                              <td className="py-2 px-3 font-medium text-slate-600">
                                Month {month.monthNumber}
                              </td>
                              <td className="py-2 px-3">
                                <Input
                                  type="number"
                                  value={month.installmentAmount}
                                  onChange={(e) => updateManualMonthlyData(index, 'installmentAmount', Number(e.target.value))}
                                  className="w-28 text-sm"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <Input
                                  type="number"
                                  value={month.dividend}
                                  onChange={(e) => updateManualMonthlyData(index, 'dividend', Number(e.target.value))}
                                  className="w-28 text-sm"
                                />
                              </td>
                              <td className="py-2 px-3">
                                <div className="w-28 text-sm py-2 px-3 bg-gray-100 rounded border">
                                  ₹{month.payableAmount.toLocaleString('en-IN')}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded">
                      <strong>Note:</strong> Payable Amount is automatically calculated as Installment Amount - Dividend. 
                      Edit installment or dividend amounts to adjust payables.
                    </div>
                  </div>
                )}

                {/* Auto Mode Preview */}
                {createMode === 'auto' && newPlan.totalAmount && newPlan.duration && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">Preview (Auto-Generated)</h3>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-semibold">Average Monthly Installment:</span>
                          <p className="text-lg font-bold text-blue-700">
                            ₹{Math.round(newPlan.totalAmount / newPlan.duration).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <span className="font-semibold">Starting Dividend:</span>
                          <p className="text-lg font-bold text-green-700">
                            ₹{Math.round((Math.round(newPlan.totalAmount / newPlan.duration) * 0.4)).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <span className="font-semibold">Ending Dividend:</span>
                          <p className="text-lg font-bold text-purple-700">
                            ₹{Math.round((Math.round(newPlan.totalAmount / newPlan.duration) * 0.4) / newPlan.duration).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-3">
                        Dividends will decrease gradually each month. You can switch to "Month-wise Custom" for manual control.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end border-t pt-4">
                  <Button variant="outline" onClick={() => {
                    setShowCreateModal(false);
                    setCreateMode('auto');
                    setManualMonthlyData([]);
                  }}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreatePlan} 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!newPlan.planName || !newPlan.totalAmount || !newPlan.duration}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Plan
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Plan Modal */}
        {showEditModal && editingPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-800">Edit Plan: {editingPlan.planName}</h2>
                    <p className="text-slate-600">Modify plan details and month-wise amounts</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="p-6">
                {/* Basic Plan Details */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">Basic Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                      <Input
                        value={editingPlan.planName}
                        onChange={(e) => setEditingPlan({...editingPlan, planName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
                      <Input
                        type="number"
                        value={editingPlan.totalAmount}
                        onChange={(e) => setEditingPlan({...editingPlan, totalAmount: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months)</label>
                      <Input
                        type="number"
                        value={editingPlan.duration}
                        onChange={(e) => setEditingPlan({...editingPlan, duration: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Members</label>
                      <Input
                        type="number"
                        value={editingPlan.totalMembers}
                        onChange={(e) => setEditingPlan({...editingPlan, totalMembers: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Commission (%)</label>
                      <Input
                        type="number"
                        value={editingPlan.commissionRate}
                        onChange={(e) => setEditingPlan({...editingPlan, commissionRate: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Processing Fee (₹)</label>
                      <Input
                        type="number"
                        value={editingPlan.processingFee}
                        onChange={(e) => setEditingPlan({...editingPlan, processingFee: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <Input
                      value={editingPlan.description || ''}
                      onChange={(e) => setEditingPlan({...editingPlan, description: e.target.value})}
                      placeholder="Plan description (optional)"
                    />
                  </div>
                </div>

                {/* Month-wise Data Table */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-700 mb-4">Month-wise Amounts</h3>
                  <div className="bg-slate-50 p-4 rounded-lg overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-semibold text-slate-700">Month</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-700">Installment (₹)</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-700">Dividend (₹)</th>
                          <th className="text-left py-2 px-3 font-semibold text-slate-700">Payable (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editingPlan.monthlyData.map((month, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}>
                            <td className="py-2 px-3 font-medium text-slate-600">
                              Month {month.monthNumber}
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                value={month.installmentAmount}
                                onChange={(e) => updateMonthlyData(index, 'installmentAmount', Number(e.target.value))}
                                className="w-28 text-sm"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                value={month.dividend}
                                onChange={(e) => updateMonthlyData(index, 'dividend', Number(e.target.value))}
                                className="w-28 text-sm"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <div className="w-28 text-sm py-2 px-3 bg-gray-100 rounded border">
                                ₹{month.payableAmount.toLocaleString('en-IN')}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded">
                    <strong>Note:</strong> Payable Amount is automatically calculated as Installment Amount - Dividend. 
                    Edit installment or dividend amounts to adjust payables.
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end border-t pt-4">
                  <Button variant="outline" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSavePlan} className="bg-blue-600 hover:bg-blue-700">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}