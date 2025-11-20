'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Send, 
  Users, 
  History, 
  CheckCircle, 
  XCircle, 
  Clock,
  Search,
  Filter,
  Download,
  Eye,
  LogOut,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email: string;
  planName?: string;
}

interface SMSTemplate {
  id: string;
  name: string;
  description: string;
  variables: string[];
}

interface SMSLog {
  _id: string;
  userId: {
    _id: string;
    name: string;
    phone: string;
  };
  phone: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  sentAt: string;
  requestId?: string;
  errorMessage?: string;
  sentBy: {
    _id: string;
    name: string;
  };
}

// Electron-only offline banner
const OfflineBanner = () => (
  typeof window !== 'undefined' && window.navigator && window.navigator.userAgent.includes('Electron') ? (
    <div className="bg-yellow-100 text-yellow-800 p-2 rounded mb-4 text-center text-sm">
      Offline mode enabled (Electron desktop app). Sending SMS is disabled.
    </div>
  ) : null
);

export default function SMSManagementPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingLoading, setSendingLoading] = useState(false);
  
  // Send SMS form state
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [templateData, setTemplateData] = useState<Record<string, string>>({});
  
  // Filters and pagination
  const [customerSearch, setCustomerSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0
  });

  useEffect(() => {
    fetchCustomers();
    fetchTemplates();
    fetchSMSLogs();
  }, []);

  useEffect(() => {
    fetchSMSLogs();
  }, [currentPage, statusFilter, logSearch]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/staff/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/sms/send', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchSMSLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(logSearch && { phone: logSearch })
      });

      const response = await fetch(`/api/sms/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSmsLogs(data.logs || []);
        setStats(data.stats || stats);
        setCurrentPage(data.pagination?.page || 1);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching SMS logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = async () => {
    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer');
      return;
    }

    if (!selectedTemplate && !customMessage) {
      alert('Please select a template or enter a custom message');
      return;
    }

    setSendingLoading(true);
    try {
      const recipients = selectedCustomers.map(customerId => {
        const customer = customers.find(c => c._id === customerId);
        return {
          userId: customerId,
          name: customer?.name,
          phone: customer?.phone
        };
      });

      const payload: any = {
        recipients,
        templateData
      };

      if (selectedTemplate && selectedTemplate !== 'custom') {
        payload.template = selectedTemplate;
      } else {
        payload.message = customMessage;
      }

      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`SMS sent successfully! ${result.summary.sent} sent, ${result.summary.failed} failed`);
        setSelectedCustomers([]);
        setSelectedTemplate('');
        setCustomMessage('');
        setTemplateData({});
        fetchSMSLogs(); // Refresh logs
      } else {
        alert(result.error || 'Failed to send SMS');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      alert('Error sending SMS');
    } finally {
      setSendingLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth-token');
    window.location.href = '/login';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800">Sent</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone.includes(customerSearch)
  );

  const selectedTemplate_obj = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto p-4 max-w-7xl">
        <OfflineBanner />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/staff/invoices">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Invoices
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">SMS Management</h1>
              <p className="text-slate-600 mt-1">Send messages to customers</p>
            </div>
          </div>

          <Button 
            onClick={handleLogout} 
            variant="outline" 
            className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400" 
            size="sm"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total SMS</p>
                  <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Sent</p>
                  <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="send" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Send SMS
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              SMS History
            </TabsTrigger>
          </TabsList>

          {/* Send SMS Tab */}
          <TabsContent value="send" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Customer Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Select Recipients
                  </CardTitle>
                  <CardDescription>Choose customers to send SMS</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer._id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedCustomers.includes(customer._id)
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                        onClick={() => {
                          setSelectedCustomers(prev =>
                            prev.includes(customer._id)
                              ? prev.filter(id => id !== customer._id)
                              : [...prev, customer._id]
                          );
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-800">{customer.name}</p>
                            <p className="text-sm text-slate-600">{customer.phone}</p>
                            {customer.planName && (
                              <p className="text-xs text-slate-500">{customer.planName}</p>
                            )}
                          </div>
                          {selectedCustomers.includes(customer._id) && (
                            <CheckCircle className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-sm text-slate-600">
                    Selected: {selectedCustomers.length} customers
                  </div>
                </CardContent>
              </Card>

              {/* Message Composition */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Compose Message
                  </CardTitle>
                  <CardDescription>Choose template or write custom message</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Message Template</label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTemplate && selectedTemplate !== 'custom' && selectedTemplate_obj && (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600">{selectedTemplate_obj.description}</p>
                      <div className="space-y-2">
                        {selectedTemplate_obj.variables.map((variable) => (
                          <div key={variable}>
                            <label className="text-sm font-medium text-slate-700 capitalize">
                              {variable.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </label>
                            <Input
                              placeholder={`Enter ${variable}...`}
                              value={templateData[variable] || ''}
                              onChange={(e) => setTemplateData(prev => ({
                                ...prev,
                                [variable]: e.target.value
                              }))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(selectedTemplate === 'custom' || !selectedTemplate) && (
                    <div>
                      <label className="text-sm font-medium text-slate-700">Custom Message</label>
                      <Textarea
                        placeholder="Type your message here..."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        rows={4}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Character count: {customMessage.length}/160
                      </p>
                    </div>
                  )}

                  <Button 
                    onClick={handleSendSMS} 
                    disabled={sendingLoading || selectedCustomers.length === 0}
                    className="w-full"
                  >
                    {sendingLoading ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send SMS ({selectedCustomers.length} recipients)
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* SMS History Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>SMS History</CardTitle>
                    <CardDescription>View all sent messages</CardDescription>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                      <Input
                        placeholder="Search phone..."
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                        className="pl-10 w-40"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Clock className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {smsLogs.map((log) => (
                      <div key={log._id} className="border rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-slate-800">{log.userId?.name}</p>
                            <p className="text-sm text-slate-600">{log.phone}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(log.status)}
                            <span className="text-xs text-slate-500">
                              {new Date(log.sentAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">
                          {log.message}
                        </p>
                        {log.errorMessage && (
                          <p className="text-xs text-red-600 mt-1">
                            Error: {log.errorMessage}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          Sent by: {log.sentBy?.name}
                        </p>
                      </div>
                    ))}
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-center gap-2 mt-6">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <span className="flex items-center px-4 py-2 text-sm text-slate-600">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}