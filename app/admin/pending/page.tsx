'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function PendingPaymentsPage() {
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
              <h1 className="text-3xl font-bold text-slate-800">Pending Payments</h1>
              <p className="text-slate-600">Track and manage overdue payments</p>
            </div>
          </div>
        </div>

        {/* Pending Payments Content */}
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Pending Payment Management
            </CardTitle>
            <CardDescription>Monitor and follow up on overdue payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-slate-500">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Pending Payments Feature</h3>
              <p className="mb-4">This section will display customers with overdue payments and provide tools for follow-up.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <Card className="p-4">
                  <h4 className="font-semibold text-red-600 mb-2">Overdue Payments</h4>
                  <p className="text-2xl font-bold text-red-800">3</p>
                  <p className="text-sm text-slate-600">Total pending</p>
                </Card>
                <Card className="p-4">
                  <h4 className="font-semibold text-orange-600 mb-2">Amount Due</h4>
                  <p className="text-2xl font-bold text-orange-800">₹45,000</p>
                  <p className="text-sm text-slate-600">Total outstanding</p>
                </Card>
                <Card className="p-4">
                  <h4 className="font-semibold text-blue-600 mb-2">Follow-ups</h4>
                  <p className="text-2xl font-bold text-blue-800">2</p>
                  <p className="text-sm text-slate-600">Pending today</p>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}