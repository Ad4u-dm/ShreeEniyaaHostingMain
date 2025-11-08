'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, IndianRupee, Calendar, BarChart3, PieChart, Download } from 'lucide-react';
import { formatIndianNumber } from '@/lib/helpers';

interface RevenueData {
  daily: { date: string; amount: number; payments: number }[];
  monthly: { month: string; amount: number; payments: number }[];
  yearly: { year: string; amount: number; payments: number }[];
  stats: {
    todayRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    totalRevenue: number;
    averageDaily: number;
    averageMonthly: number;
    growth: {
      daily: number;
      monthly: number;
      yearly: number;
    };
  };
  planWise: { planName: string; amount: number; count: number }[];
  paymentMethods: { method: string; amount: number; count: number }[];
}

export default function RevenuePage() {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    try {
      const response = await fetch('/api/admin/revenue', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRevenueData(data.revenue);
      }
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
      
      // Set empty state on error
      setRevenueData({
        daily: [],
        monthly: [],
        yearly: [],
        stats: {
          todayRevenue: 0,
          monthlyRevenue: 0,
          yearlyRevenue: 0,
          totalRevenue: 0,
          averageDaily: 0,
          averageMonthly: 0,
          growth: {
            daily: 0,
            monthly: 0,
            yearly: 0
          }
        },
        planWise: [],
        paymentMethods: []
      });
    } finally {
      setLoading(false);
    }
  };

  const exportRevenue = () => {
    if (!revenueData) return;
    
    const csvData = revenueData[selectedPeriod].map(item => [
      selectedPeriod === 'daily' ? (item as any).date :
      selectedPeriod === 'monthly' ? (item as any).month : (item as any).year,
      item.amount,
      item.payments
    ]);

    const headers = [
      selectedPeriod === 'daily' ? 'Date' : 
      selectedPeriod === 'monthly' ? 'Month' : 'Year',
      'Revenue', 
      'Payments'
    ];

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!revenueData) return null;

  const getCurrentData = () => revenueData[selectedPeriod];

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
              <h1 className="text-3xl font-bold text-slate-800">Revenue Analytics</h1>
              <p className="text-slate-600">Track business performance and financial insights</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              onClick={exportRevenue}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button 
              onClick={fetchRevenueData}
              variant="outline"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Today's Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold text-slate-800">
                  ₹{formatIndianNumber(revenueData.stats.todayRevenue)}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">+{revenueData.stats.growth.daily}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold text-slate-800">
                  ₹{formatIndianNumber(revenueData.stats.monthlyRevenue)}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-blue-600">+{revenueData.stats.growth.monthly}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Yearly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-purple-500" />
                <span className="text-2xl font-bold text-slate-800">
                  ₹{formatIndianNumber(revenueData.stats.yearlyRevenue)}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3 text-purple-500" />
                <span className="text-xs text-purple-600">+{revenueData.stats.growth.yearly}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-emerald-500" />
                <span className="text-2xl font-bold text-slate-800">
                  ₹{formatIndianNumber(revenueData.stats.totalRevenue)}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2">All time earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Period Selection and Chart */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue Trends
                </CardTitle>
                <CardDescription>Revenue performance over time</CardDescription>
              </div>
              <div className="flex gap-2">
                {(['daily', 'monthly', 'yearly'] as const).map((period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod(period)}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80 overflow-x-auto">
              <div className="min-w-[600px] h-full">
                {/* Simple bar chart representation */}
                <div className="flex items-end gap-2 h-64 p-4">
                  {getCurrentData().slice(-20).map((item, index) => {
                    const maxAmount = Math.max(...getCurrentData().map(d => d.amount));
                    const height = (item.amount / maxAmount) * 100;
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className="text-xs text-slate-600 text-center">
                          ₹{formatIndianNumber(item.amount)}
                        </div>
                        <div 
                          className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                          style={{ height: `${height}%`, minHeight: '4px' }}
                          title={`Revenue: ₹${formatIndianNumber(item.amount)}`}
                        ></div>
                        <div className="text-xs text-slate-500 text-center">
                          {selectedPeriod === 'daily' 
                            ? new Date((item as any).date).getDate()
                            : selectedPeriod === 'monthly' 
                            ? (item as any).month 
                            : (item as any).year
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan-wise and Payment Method Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Plan-wise Revenue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Plan-wise Revenue
              </CardTitle>
              <CardDescription>Revenue breakdown by investment plans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueData.planWise.map((plan, index) => {
                  const totalPlanRevenue = revenueData.planWise.reduce((sum, p) => sum + p.amount, 0);
                  const percentage = (plan.amount / totalPlanRevenue) * 100;
                  
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-4 h-4 rounded ${
                            index === 0 ? 'bg-blue-500' :
                            index === 1 ? 'bg-green-500' :
                            index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                          }`}
                        ></div>
                        <div>
                          <p className="font-medium text-slate-800">{plan.planName}</p>
                          <p className="text-sm text-slate-600">{plan.count} payments</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-800">
                          ₹{formatIndianNumber(plan.amount)}
                        </p>
                        <p className="text-sm text-slate-600">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="h-5 w-5" />
                Payment Methods
              </CardTitle>
              <CardDescription>Revenue breakdown by payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueData.paymentMethods.map((method, index) => {
                  const totalMethodRevenue = revenueData.paymentMethods.reduce((sum, m) => sum + m.amount, 0);
                  const percentage = (method.amount / totalMethodRevenue) * 100;
                  
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-4 h-4 rounded ${
                            index === 0 ? 'bg-emerald-500' :
                            index === 1 ? 'bg-cyan-500' :
                            index === 2 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                        ></div>
                        <div>
                          <p className="font-medium text-slate-800">{method.method}</p>
                          <p className="text-sm text-slate-600">{method.count} transactions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-800">
                          ₹{formatIndianNumber(method.amount)}
                        </p>
                        <p className="text-sm text-slate-600">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}