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

    // Generate monthly data with equal distribution
    const baseAmount = Math.round(newPlan.totalAmount / newPlan.duration);
    const monthlyData = [];
    
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Create New Plan</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                  <Input
                    placeholder="e.g., ₹3L Plan"
                    value={newPlan.planName}
                    onChange={(e) => setNewPlan({...newPlan, planName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
                  <Input
                    type="number"
                    placeholder="e.g., 300000"
                    value={newPlan.totalAmount || ''}
                    onChange={(e) => setNewPlan({...newPlan, totalAmount: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months)</label>
                  <Input
                    type="number"
                    value={newPlan.duration}
                    onChange={(e) => setNewPlan({...newPlan, duration: Number(e.target.value)})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <Input
                    placeholder="Plan description (optional)"
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                  />
                </div>
                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                  <strong>Note:</strong> Monthly amounts will be automatically calculated with decreasing dividends. 
                  You can edit individual months after creating the plan.
                </div>
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleCreatePlan} className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Plan
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                    Cancel
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