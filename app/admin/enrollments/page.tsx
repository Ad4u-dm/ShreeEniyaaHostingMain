'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Users } from 'lucide-react';

export default function EnrollmentsPage() {
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
              <h1 className="text-3xl font-bold text-slate-800">Enrollments Management</h1>
              <p className="text-slate-600">Track and manage customer enrollments</p>
            </div>
          </div>
        </div>

        {/* Enrollments Content */}
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              Active Enrollments
            </CardTitle>
            <CardDescription>Monitor customer plan enrollments and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-slate-500">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Enrollment Management</h3>
              <p className="mb-4">This section will show all customer enrollments with plan details and status tracking.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <Card className="p-4">
                  <h4 className="font-semibold text-green-600 mb-2">Active Enrollments</h4>
                  <p className="text-2xl font-bold text-green-800">11</p>
                  <p className="text-sm text-slate-600">Currently active</p>
                </Card>
                <Card className="p-4">
                  <h4 className="font-semibold text-blue-600 mb-2">Total Enrollments</h4>
                  <p className="text-2xl font-bold text-blue-800">11</p>
                  <p className="text-sm text-slate-600">All time</p>
                </Card>
                <Card className="p-4">
                  <h4 className="font-semibold text-purple-600 mb-2">Average Duration</h4>
                  <p className="text-2xl font-bold text-purple-800">18</p>
                  <p className="text-sm text-slate-600">Months per plan</p>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}