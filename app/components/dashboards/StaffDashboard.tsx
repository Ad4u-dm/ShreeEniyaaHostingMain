'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  User,
  IndianRupee, 
  Calendar, 
  TrendingUp,
  AlertTriangle,
  Clock,
  Target,
  CheckCircle,
  Search,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Bell,
  BarChart3,
  UserCheck,
  Wallet,
  Receipt,
  Settings,
  Home,
  MessageCircle,
  Filter,
  Download,
  RefreshCw,
  Plus,
  LogOut
} from 'lucide-react';
import { formatIndianNumber } from '@/lib/helpers';
import MemberRegistrationModal from '@/app/components/modals/MemberRegistrationModal';

interface StaffDashboardData {
  stats: {
    myEnrollments: number;
    myActiveEnrollments: number;
    myTodayPayments: number;
    myMonthlyCollection: number;
    myPendingPayments: number;
    monthlyCommission: number;
  };
  myActivity: {
    enrollments: any[];
    payments: any[];
  };
  duePayments: any[];
}

interface Customer {
  _id: string;
  userId: {
    _id: string;
    name: string;
    phone: string;
    email: string;
    address?: any;
  };
  planId: {
    planName: string;
    monthlyAmount: number;
  };
  enrollmentId: string;
  memberNumber: number;
  status: string;
  totalPaid: number;
  lastPayment?: any;
  overdueCount: number;
  overdueAmount: number;
}

export default function StaffDashboard() {
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCollecting, setIsCollecting] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceStats, setInvoiceStats] = useState<any>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showInvoiceCreationModal, setShowInvoiceCreationModal] = useState(false);
  const [selectedCustomerForInvoice, setSelectedCustomerForInvoice] = useState<Customer | null>(null);
  const [showBulkCollectionModal, setShowBulkCollectionModal] = useState(false);
  const [showReceiptHistoryModal, setShowReceiptHistoryModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [showMemberDetailsModal, setShowMemberDetailsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Customer | null>(null);
  const [memberEnrollments, setMemberEnrollments] = useState<any[]>([]);
  const [memberPayments, setMemberPayments] = useState<any[]>([]);
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [editMemberData, setEditMemberData] = useState<any>({});
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchCustomers();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/staff', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const result = await response.json();
      setData(result.dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`/api/staff/customers?search=${searchTerm}&status=${filterStatus}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setCustomers(result.customers || []);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const handleCollectPayment = async (paymentId: string, amount: number) => {
    setIsCollecting(true);
    try {
      const response = await fetch('/api/staff/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          paymentId,
          amount,
          paymentMethod: 'cash',
          collectionMethod: 'office'
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Payment collected successfully! Receipt: ${result.payment.receiptNumber}`);
        fetchDashboardData();
        fetchCustomers();
      } else {
        alert('Failed to collect payment');
      }
    } catch (error) {
      console.error('Payment collection error:', error);
      alert('Error collecting payment');
    } finally {
      setIsCollecting(false);
    }
  };

  const handleSendReminder = async (type: string) => {
    try {
      const response = await fetch('/api/staff/communication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          action: 'send_reminder',
          data: {
            recipients: type === 'due' ? 'all-due' : 'overdue',
            template: type === 'due' 
              ? 'Dear {customerName}, your payment of ₹{amount} for {planName} is due today. Please make payment to avoid late charges. Thank you.'
              : 'Dear {customerName}, your payment of ₹{amount} for {planName} is overdue by {days} days. Please contact us immediately to avoid penalties.',
            communicationType: 'sms'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${result.messagesSent} reminders sent successfully!`);
      } else {
        alert('Failed to send reminders');
      }
    } catch (error) {
      console.error('Reminder sending error:', error);
      alert('Error sending reminders');
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/staff/invoices?type=my_invoices', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setInvoices(result.invoices || []);
        setInvoiceStats(result.summary || {});
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  };

  const handleCreateInvoice = async (enrollmentId: string, customerId: string) => {
    setIsCreatingInvoice(true);
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

      const response = await fetch('/api/chitfund/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          enrollmentId,
          action: 'create',
          options: {
            dueDate: dueDate.toISOString(),
            includeLateFee: true,
            notes: 'Payment request for pending installments'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Invoice created successfully! Total Amount: ₹${result.totalAmount.toLocaleString()}`);
        fetchInvoices();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Invoice creation error:', error);
      alert('Error creating invoice');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleInvoiceAction = async (invoiceId: string, action: string, data?: any) => {
    try {
      const response = await fetch('/api/staff/invoices', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          invoiceId,
          action,
          data
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (action === 'mark_paid' && result.paymentId) {
          // Auto-generate receipt when payment is marked as paid
          await handleGenerateReceipt(result.paymentId);
          alert(`✅ Payment recorded successfully!\n📄 Receipt generated: ${result.receiptNumber || 'N/A'}`);
        } else {
          alert(result.message);
        }
        
        fetchInvoices();
      } else {
        alert(`Failed to ${action.replace('_', ' ')} invoice`);
      }
    } catch (error) {
      console.error('Invoice action error:', error);
      alert('Error performing invoice action');
    }
  };

  const handleGenerateReceipt = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/payments/${paymentId}/receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ format: 'thermal' })
      });

      if (response.ok) {
        const result = await response.json();
        return result.receiptUrl;
      }
    } catch (error) {
      console.error('Receipt generation error:', error);
    }
    return null;
  };

  const handleBulkReminders = async () => {
    try {
      const response = await fetch('/api/staff/communication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          type: 'bulk_reminder',
          target: 'overdue_payments'
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Reminders sent successfully!\n📱 SMS: ${result.smsCount || 0}\n📧 Email: ${result.emailCount || 0}`);
      } else {
        alert('❌ Failed to send reminders');
      }
    } catch (error) {
      console.error('Bulk reminders error:', error);
      alert('❌ Error sending reminders');
    }
  };

  const handleExportPayments = async () => {
    try {
      const response = await fetch('/api/staff/reports?type=payments&format=csv', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `payments-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        alert('📊 Payment report downloaded successfully!');
      } else {
        alert('❌ Failed to export payments');
      }
    } catch (error) {
      console.error('Export payments error:', error);
      alert('❌ Error exporting payments');
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetch('/api/payments?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data.payments || []);
      }
    } catch (error) {
      console.error('Fetch payment history error:', error);
    }
  };

  const handleViewMemberDetails = async (customer: Customer) => {
    setSelectedMember(customer);
    setEditMemberData({
      name: customer.userId.name,
      phone: customer.userId.phone,
      email: customer.userId.email,
      address: customer.userId.address || {}
    });
    
    // Fetch member's enrollments
    try {
      const enrollmentsResponse = await fetch(`/api/enrollments?userId=${customer.userId._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (enrollmentsResponse.ok) {
        const enrollmentsData = await enrollmentsResponse.json();
        setMemberEnrollments(enrollmentsData.enrollments || []);
      }
    } catch (error) {
      console.error('Fetch member enrollments error:', error);
    }
    
    // Fetch member's payment history
    try {
      const paymentsResponse = await fetch(`/api/payments?userId=${customer.userId._id}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        setMemberPayments(paymentsData.payments || []);
      }
    } catch (error) {
      console.error('Fetch member payments error:', error);
    }
    
    setShowMemberDetailsModal(true);
  };

  const handleUpdateMember = async () => {
    try {
      const response = await fetch(`/api/users/${selectedMember?.userId._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(editMemberData)
      });

      if (response.ok) {
        alert('✅ Member details updated successfully!');
        setIsEditingMember(false);
        fetchCustomers(); // Refresh the customer list
      } else {
        alert('❌ Failed to update member details');
      }
    } catch (error) {
      console.error('Update member error:', error);
      alert('❌ Error updating member details');
    }
  };

  const handleSendSMS = async (customer: Customer, message?: string) => {
    const defaultMessage = `Dear ${customer.userId.name}, this is a message from our chit fund regarding your account. Please contact us if you have any questions.`;
    const smsMessage = message || prompt('Enter SMS message:', defaultMessage);
    
    if (!smsMessage) return;
    
    try {
      const response = await fetch('/api/staff/communication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          type: 'sms',
          recipients: [customer.userId._id],
          message: smsMessage
        })
      });

      if (response.ok) {
        alert('📱 SMS sent successfully!');
      } else {
        alert('❌ Failed to send SMS');
      }
    } catch (error) {
      console.error('Send SMS error:', error);
      alert('❌ Error sending SMS');
    }
  };

  const handleGenerateMemberReceipt = async (customerId: string) => {
    try {
      // First, check if there are recent payments to generate receipt for
      const paymentsResponse = await fetch(`/api/payments?userId=${customerId}&limit=1`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        if (paymentsData.payments && paymentsData.payments.length > 0) {
          const latestPayment = paymentsData.payments[0];
          const receiptUrl = await handleGenerateReceipt(latestPayment.paymentId);
          if (receiptUrl) {
            window.open(receiptUrl, '_blank');
          } else {
            alert('📄 Receipt generated! Check receipt history for details.');
          }
        } else {
          alert('❌ No recent payments found to generate receipt for this member.');
        }
      }
    } catch (error) {
      console.error('Generate member receipt error:', error);
      alert('❌ Error generating receipt');
    }
  };

  const handleMemberPaymentCollection = (customer: Customer) => {
    const amount = customer.planId?.monthlyAmount || 0;
    if (amount > 0) {
      // Open payment collection modal with customer info
      setSelectedCustomerForPayment(customer);
      setShowPaymentModal(true);
    } else {
      alert('❌ Unable to determine payment amount for this member.');
    }
  };

  const handleDownloadInvoice = async (enrollmentId: string) => {
    try {
      const response = await fetch('/api/chitfund/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          enrollmentId,
          action: 'generate_pdf',
          options: {
            includeLateFee: true
          }
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Invoice-${enrollmentId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to generate PDF');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Error generating PDF');
    }
  };

  const handleSendInvoice = async (enrollmentId: string) => {
    try {
      const response = await fetch('/api/chitfund/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          enrollmentId,
          action: 'send_email',
          options: {
            includeLateFee: true
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to send invoice');
      }
    } catch (error) {
      console.error('Email sending error:', error);
      alert('Error sending invoice');
    }
  };

  const handleBulkInvoice = async (customerIds: string[]) => {
    try {
      const response = await fetch('/api/chitfund/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          action: 'bulk_create',
          options: {
            customerIds,
            includeLateFee: true,
            notes: 'Bulk invoice generation'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Bulk invoice creation completed. Successful: ${result.results.successful}, Failed: ${result.results.failed}`);
        fetchInvoices();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to create bulk invoices');
      }
    } catch (error) {
      console.error('Bulk invoice error:', error);
      alert('Error creating bulk invoices');
    }
  };

  const handleViewInvoice = (invoiceId: string, format: string = 'html') => {
    const url = `/api/staff/invoices/${invoiceId}?format=${format}`;
    window.open(url, '_blank');
  };

  const handleMemberCreated = (newMember: any) => {
    // Refresh the customers list to include the new member
    fetchCustomers();
    
    // Show success message and option to create invoice immediately
    const createInvoice = confirm(
      `Member ${newMember.name} registered successfully!\n` +
      `Member Number: ${newMember.memberNumber}\n` +
      `Enrollment ID: ${newMember.enrollmentId}\n\n` +
      `Would you like to create an invoice for this member now?`
    );
    
    if (createInvoice) {
      // Switch to invoice tab and create invoice
      setActiveTab('invoices');
      setTimeout(() => {
        handleCreateInvoice(newMember.enrollmentId, newMember.userId);
      }, 500);
    }
  };

  const handleLogout = () => {
    const confirmLogout = confirm('Are you sure you want to logout?');
    if (confirmLogout) {
      // Clear authentication data
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user-data');
      
      // Redirect to login page
      window.location.href = '/login';
    }
  };

  useEffect(() => {
    if (activeTab === 'customers') {
      fetchCustomers();
    } else if (activeTab === 'invoices') {
      fetchInvoices();
    }
  }, [searchTerm, filterStatus, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button onClick={fetchDashboardData} className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const statCards = [
    {
      title: 'My Customers',
      value: `${data.stats.myActiveEnrollments}/${data.stats.myEnrollments}`,
      subtitle: 'Active/Total',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Today\'s Collections',
      value: data.stats.myTodayPayments,
      subtitle: 'Payments received',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Monthly Collection',
      value: `₹${formatIndianNumber(data.stats.myMonthlyCollection)}`,
      subtitle: 'This month',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Pending Payments',
      value: data.stats.myPendingPayments,
      subtitle: 'Due payments',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Monthly Commission',
      value: `₹${formatIndianNumber(data.stats.monthlyCommission)}`,
      subtitle: 'Expected earnings',
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Due Today',
      value: data.duePayments.filter(p => {
        const today = new Date();
        const dueDate = new Date(p.dueDate);
        return dueDate.toDateString() === today.toDateString();
      }).length,
      subtitle: 'Payments due',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-sm shadow-lg border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Staff Panel</h1>
              <p className="text-slate-600 mt-1">Complete Customer & Collection Management</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={fetchDashboardData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="default" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button onClick={handleLogout} variant="destructive" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-7 bg-white/70 backdrop-blur-sm">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="customers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Customers
              </TabsTrigger>
              <TabsTrigger value="collections" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Collections
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="field" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Field Work
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="communication" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Communication
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {statCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={index} className="bg-white/70 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-600">
                          {stat.title}
                        </CardTitle>
                        <div className={`p-2 rounded-full ${stat.bgColor}`}>
                          <Icon className={`h-4 w-4 ${stat.color}`} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
                        <p className="text-xs text-slate-500 mt-1">{stat.subtitle}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Due Payments */}
              {data.duePayments.length > 0 && (
                <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-slate-800 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Due Payments
                    </CardTitle>
                    <CardDescription>Customers with pending payments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.duePayments.slice(0, 10).map((payment, index) => {
                        const dueDate = new Date(payment.dueDate);
                        const today = new Date();
                        const isOverdue = dueDate < today;
                        const daysPast = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                        
                        return (
                          <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border-l-4 border-l-red-400">
                            <div>
                              <p className="font-medium text-slate-800">{payment.userId?.name}</p>
                              <p className="text-sm text-slate-600">{payment.planId?.planName}</p>
                              <p className="text-xs text-slate-500">{payment.userId?.phone}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-red-600">
                                ₹{payment.amount?.toLocaleString('en-IN')}
                              </p>
                              <p className="text-xs text-slate-500">
                                Due: {dueDate.toLocaleDateString('en-IN')}
                              </p>
                              {isOverdue && (
                                <Badge variant="destructive" className="text-xs">
                                  {daysPast} days overdue
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* My Recent Enrollments */}
                <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-slate-800">My Recent Enrollments</CardTitle>
                    <CardDescription>Customers I've enrolled recently</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.myActivity.enrollments.slice(0, 5).map((enrollment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-slate-800">{enrollment.userId?.name}</p>
                            <p className="text-sm text-slate-600">{enrollment.planId?.planName}</p>
                            <p className="text-xs text-slate-500">{enrollment.userId?.phone}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary">Member #{enrollment.memberNumber}</Badge>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(enrollment.createdAt).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>
                      ))}
                      {data.myActivity.enrollments.length === 0 && (
                        <p className="text-slate-500 text-center py-8">No recent enrollments</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* My Recent Collections */}
                <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-slate-800">My Recent Collections</CardTitle>
                    <CardDescription>Payments I've collected recently</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {data.myActivity.payments.slice(0, 5).map((payment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-slate-800">{payment.userId?.name}</p>
                            <p className="text-sm text-slate-600">{payment.planId?.planName}</p>
                            <p className="text-xs text-slate-500">Receipt: {payment.receiptNumber}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-emerald-600">
                              ₹{payment.amount.toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(payment.createdAt).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </div>
                      ))}
                      {data.myActivity.payments.length === 0 && (
                        <p className="text-slate-500 text-center py-8">No recent payments</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Customers Tab */}
            <TabsContent value="customers" className="space-y-6">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-slate-800 flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        My Customers
                      </CardTitle>
                      <CardDescription>Manage your assigned customers</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setShowMemberModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Register New Member
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-6">
                    <div className="flex-1">
                      <Input
                        placeholder="Search customers by name, phone, or enrollment ID..."
                        className="w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={fetchCustomers}>
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {customers.map((customer, index) => (
                      <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="bg-blue-100 p-3 rounded-full">
                              <UserCheck className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-800">{customer.userId?.name}</h3>
                              <p className="text-sm text-slate-600">{customer.planId?.planName}</p>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {customer.userId?.phone}
                                </span>
                                <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                                  {customer.status}
                                </Badge>
                                {customer.overdueCount > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {customer.overdueCount} overdue
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-slate-800">Member #{customer.memberNumber}</p>
                            <p className="text-sm text-slate-600">₹{customer.planId?.monthlyAmount?.toLocaleString('en-IN')}/month</p>
                            <p className="text-xs text-slate-500">Paid: ₹{customer.totalPaid?.toLocaleString('en-IN')}</p>
                            <div className="flex gap-2 mt-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => window.open(`tel:${customer.userId?.phone}`)}
                                title="Call Member"
                                className="hover:bg-green-50 hover:border-green-300"
                              >
                                <Phone className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleViewMemberDetails(customer)}
                                title="View Member Details"
                                className="hover:bg-blue-50 hover:border-blue-300"
                              >
                                <FileText className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleMemberPaymentCollection(customer)}
                                title="Collect Payment"
                                className="hover:bg-purple-600 bg-purple-500 text-white"
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleCreateInvoice(customer._id, customer.userId._id)}
                                disabled={isCreatingInvoice}
                                title="Create Invoice"
                                className="hover:bg-orange-50 hover:border-orange-300"
                              >
                                <FileText className="h-4 w-4 text-orange-600" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Collections Tab */}
            <TabsContent value="collections" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100">Today's Target</p>
                        <p className="text-2xl font-bold">₹50,000</p>
                      </div>
                      <Target className="h-8 w-8 text-green-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100">Collected Today</p>
                        <p className="text-2xl font-bold">₹{formatIndianNumber(data.stats.myMonthlyCollection)}</p>
                      </div>
                      <Wallet className="h-8 w-8 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100">Commission</p>
                        <p className="text-2xl font-bold">₹{formatIndianNumber(data.stats.monthlyCommission)}</p>
                      </div>
                      <IndianRupee className="h-8 w-8 text-purple-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-slate-800 flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Payment Collection
                      </CardTitle>
                      <CardDescription>Collect payments and generate receipts</CardDescription>
                    </div>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Collection
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-4">💰 Due Today</h3>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {data.duePayments.slice(0, 8).map((payment, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200 hover:shadow-md transition-all duration-200">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-800">👤 {payment.userId?.name}</p>
                                {payment.daysPastDue > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    ⚠️ {payment.daysPastDue} days overdue
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 flex items-center gap-1">
                                <IndianRupee className="h-3 w-3" />
                                {payment.amount?.toLocaleString('en-IN')}
                              </p>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due: {new Date(payment.dueDate).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button 
                                size="sm" 
                                onClick={() => handleCollectPayment(payment._id, payment.amount)}
                                disabled={isCollecting}
                                className="bg-green-500 hover:bg-green-600 text-white"
                              >
                                {isCollecting ? '⏳ Processing...' : '💰 Collect'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.open(`tel:${payment.userId?.phone}`, '_blank')}
                                className="text-xs"
                              >
                                📞 Call
                              </Button>
                            </div>
                          </div>
                        ))}
                        {data.duePayments.length === 0 && (
                          <div className="text-center py-6">
                            <div className="bg-green-50 rounded-lg p-4">
                              <p className="text-green-600 font-medium">🎉 All caught up!</p>
                              <p className="text-green-500 text-sm">No payments due today</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-4">🔧 Quick Actions</h3>
                      <div className="space-y-3">
                        <Button 
                          className="w-full justify-start bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                          onClick={() => setShowBulkCollectionModal(true)}
                        >
                          <Wallet className="h-4 w-4 mr-2" />
                          💰 Bulk Collection
                        </Button>
                        <Button 
                          className="w-full justify-start bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                          onClick={() => setShowReceiptHistoryModal(true)}
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          📄 Receipt History
                        </Button>
                        <Button 
                          className="w-full justify-start bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                          onClick={() => {
                            const overdueCount = data.duePayments.filter(p => p.daysPastDue > 0).length;
                            if (overdueCount > 0) {
                              const confirmMessage = `🔔 Send payment reminders to ${overdueCount} overdue customers?\n\n📱 This will send SMS and email notifications.`;
                              if (confirm(confirmMessage)) {
                                handleBulkReminders();
                              }
                            } else {
                              alert('🎉 No overdue payments to remind about!');
                            }
                          }}
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          🔔 Send Reminders
                        </Button>
                        <Button 
                          className="w-full justify-start" 
                          variant="outline"
                          onClick={() => handleExportPayments()}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          📊 Export Report
                        </Button>
                      </div>
                      
                      <div className="mt-6">
                        <h4 className="font-medium mb-3 text-slate-700">📈 Today's Summary</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                            <span className="text-sm text-slate-600">Collections:</span>
                            <span className="font-medium text-green-600">₹{data.stats.myMonthlyCollection?.toLocaleString('en-IN') || '0'}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                            <span className="text-sm text-slate-600">Receipts Generated:</span>
                            <span className="font-medium text-blue-600">{data.stats.myTodayPayments || 0}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                            <span className="text-sm text-slate-600">Pending Due:</span>
                            <span className="font-medium text-orange-600">{data.duePayments.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100">Total Invoices</p>
                        <p className="text-2xl font-bold">{invoiceStats?.total || 0}</p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-yellow-100">Sent</p>
                        <p className="text-2xl font-bold">{invoiceStats?.sent || 0}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-yellow-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100">Paid</p>
                        <p className="text-2xl font-bold">{invoiceStats?.paid || 0}</p>
                      </div>
                      <IndianRupee className="h-8 w-8 text-green-200" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-red-100">Overdue</p>
                        <p className="text-2xl font-bold">{invoiceStats?.overdue || 0}</p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-red-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-slate-800 flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Invoice Management
                      </CardTitle>
                      <CardDescription>Create, send, and manage customer invoices</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={fetchInvoices} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Quick Actions */}
                    <Card className="p-4">
                      <h3 className="font-semibold mb-4">Quick Actions</h3>
                      <div className="space-y-3">
                        <Button 
                          className="w-full justify-start bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200" 
                          onClick={() => {
                            // Show modal to select customer for invoice creation
                            if (customers.length > 0) {
                              setShowInvoiceCreationModal(true);
                            } else {
                              const registerMember = confirm(
                                '🚫 No customers found!\n\n' +
                                'You need to register members first to create invoices.\n\n' +
                                '👥 Would you like to register a new member now?'
                              );
                              if (registerMember) {
                                setActiveTab('customers');
                                setTimeout(() => setShowMemberModal(true), 300);
                              }
                            }
                          }}
                          disabled={isCreatingInvoice}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {isCreatingInvoice ? '⏳ Creating Invoice...' : '📄 Create New Invoice'}
                        </Button>
                        <Button 
                          className="w-full justify-start bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200" 
                          onClick={() => {
                            const eligibleCustomers = customers.filter(c => c.status === 'active').slice(0, 5);
                            if (eligibleCustomers.length > 0) {
                              const count = eligibleCustomers.length;
                              const confirmMessage = `📊 Generate ${count} invoices for your top active customers?\n\n` +
                                `This will create invoices for:\n` +
                                eligibleCustomers.map((c, i) => `${i + 1}. ${c.userId.name}`).join('\n') +
                                `\n\n💡 This helps you quickly bill your most active customers.`;
                              
                              if (confirm(confirmMessage)) {
                                handleBulkInvoice(eligibleCustomers.map(c => c.userId._id));
                              }
                            } else {
                              const registerMembers = confirm(
                                '🚫 No active customers found for bulk invoice generation!\n\n' +
                                '👥 Would you like to register new members first?'
                              );
                              if (registerMembers) {
                                setActiveTab('customers');
                                setTimeout(() => setShowMemberModal(true), 300);
                              }
                            }
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          📋 Bulk Invoice (Top 5)
                        </Button>
                        <Button 
                          className="w-full justify-start bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg transition-all duration-200" 
                          onClick={() => {
                            const overdueCustomers = customers.filter(c => 
                              c.status === 'overdue' || c.overdueAmount > 0
                            );
                            
                            if (overdueCustomers.length > 0) {
                              const confirmMessage = `🔔 Send payment reminders to ${overdueCustomers.length} overdue customers?\n\n` +
                                `This will notify customers who have missed their payment deadlines.\n\n` +
                                `📱 Reminders will be sent via SMS and email.`;
                              
                              if (confirm(confirmMessage)) {
                                handleSendReminder('payment');
                              }
                            } else {
                              alert('🎉 Great news! No overdue payments found.\n\nAll your customers are up to date with their payments.');
                            }
                          }}
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          🔔 Send Reminders
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <Settings className="h-4 w-4 mr-2" />
                          Invoice Settings
                        </Button>
                      </div>
                    </Card>

                    {/* Recent Invoices */}
                    <Card className="p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">📋 Recent Invoices</h3>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setActiveTab('invoices')}
                          className="text-xs"
                        >
                          View All
                        </Button>
                      </div>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {invoices.length > 0 ? invoices.slice(0, 8).map((invoice, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg hover:shadow-md transition-all duration-200 border border-slate-200">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-800">📄 {invoice.invoiceId}</p>
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(invoice.createdAt).toLocaleDateString('en-IN')}
                                </div>
                              </div>
                              <p className="text-sm text-slate-600 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {invoice.customerDetails.name}
                              </p>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-slate-800 flex items-center gap-1">
                                <IndianRupee className="h-3 w-3" />
                                {invoice.totalAmount.toLocaleString('en-IN')}
                              </p>
                              <Badge 
                                variant={
                                  invoice.status === 'paid' ? 'default' : 
                                  invoice.status === 'sent' ? 'secondary' :
                                  invoice.status === 'overdue' ? 'destructive' : 'outline'
                                }
                                className="text-xs mt-1"
                              >
                                {invoice.status === 'paid' ? '✅ Paid' :
                                 invoice.status === 'sent' ? '📤 Sent' :
                                 invoice.status === 'overdue' ? '⚠️ Overdue' : '📝 Draft'}
                              </Badge>
                              <div className="flex gap-1 mt-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleDownloadInvoice(invoice.enrollmentId || invoice._id)}
                                  title="Download PDF"
                                  className="h-6 w-6 p-0 hover:bg-blue-50 hover:border-blue-300"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                                {invoice.status !== 'paid' && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleSendInvoice(invoice.enrollmentId || invoice._id)}
                                    title="Send Email"
                                  >
                                    <Bell className="h-3 w-3" />
                                  </Button>
                                )}
                                {invoice.status === 'sent' && (
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleInvoiceAction(invoice._id, 'mark_paid', {
                                      amount: invoice.totalAmount,
                                      paymentMethod: 'cash'
                                    })}
                                  >
                                    Mark Paid
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="text-center py-8">
                            <div className="bg-slate-50 rounded-lg p-6">
                              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                              <p className="text-slate-500 font-medium">📋 No invoices created yet</p>
                              <p className="text-slate-400 text-sm mt-1">Click "Create New Invoice" to get started</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Detailed Invoice List */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">All Invoices</h3>
                      <div className="flex gap-2">
                        <Select defaultValue="all">
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Filter by status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {invoices.map((invoice, index) => (
                        <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="bg-indigo-100 p-3 rounded-full">
                                <FileText className="h-6 w-6 text-indigo-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-800">{invoice.invoiceId}</h3>
                                <p className="text-sm text-slate-600">{invoice.customerDetails.name}</p>
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-xs text-slate-500">
                                    Created: {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    Due: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
                                  </span>
                                  <Badge 
                                    variant={
                                      invoice.status === 'paid' ? 'default' : 
                                      invoice.status === 'sent' ? 'secondary' :
                                      invoice.status === 'overdue' ? 'destructive' : 'outline'
                                    }
                                  >
                                    {invoice.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-slate-800">₹{invoice.totalAmount.toLocaleString('en-IN')}</p>
                              <p className="text-sm text-slate-600">{invoice.items.length} items</p>
                              <div className="flex gap-2 mt-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleViewInvoice(invoice._id)}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleViewInvoice(invoice._id, 'pdf')}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                {invoice.status === 'draft' && (
                                  <Button 
                                    size="sm"
                                    onClick={() => handleInvoiceAction(invoice._id, 'send')}
                                  >
                                    Send
                                  </Button>
                                )}
                                {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                                  <Button 
                                    size="sm"
                                    onClick={() => handleInvoiceAction(invoice._id, 'mark_paid', {
                                      amount: invoice.totalAmount,
                                      paymentMethod: 'cash'
                                    })}
                                  >
                                    Mark Paid
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Field Work Tab */}
            <TabsContent value="field" className="space-y-6">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Field Collection
                  </CardTitle>
                  <CardDescription>Mobile-friendly tools for field work</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-4">
                      <h3 className="font-semibold mb-4">Today's Route</h3>
                      <div className="space-y-3">
                        {data.duePayments.slice(0, 3).map((payment, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <MapPin className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{payment.userId?.name}</p>
                              <p className="text-sm text-slate-600">{payment.userId?.address?.street}</p>
                              <p className="text-xs text-slate-500">₹{payment.amount?.toLocaleString('en-IN')} due</p>
                            </div>
                            <Button size="sm" variant="outline">
                              Navigate
                            </Button>
                          </div>
                        ))}
                      </div>
                    </Card>
                    <Card className="p-4">
                      <h3 className="font-semibold mb-4">Quick Actions</h3>
                      <div className="space-y-3">
                        <Button className="w-full justify-start" variant="outline">
                          <Phone className="h-4 w-4 mr-2" />
                          Call Customer
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <Receipt className="h-4 w-4 mr-2" />
                          Generate Receipt
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Send Reminder
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <MapPin className="h-4 w-4 mr-2" />
                          Update Location
                        </Button>
                      </div>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-6">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-slate-800 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Reports & Analytics
                      </CardTitle>
                      <CardDescription>Track your performance and analytics</CardDescription>
                    </div>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-lg text-white">
                      <p className="text-blue-100">This Month</p>
                      <p className="text-2xl font-bold">₹{formatIndianNumber(data.stats.myMonthlyCollection)}</p>
                      <p className="text-sm text-blue-200">Collection</p>
                    </div>
                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-lg text-white">
                      <p className="text-green-100">Success Rate</p>
                      <p className="text-2xl font-bold">85%</p>
                      <p className="text-sm text-green-200">Collections</p>
                    </div>
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-lg text-white">
                      <p className="text-purple-100">Commission</p>
                      <p className="text-2xl font-bold">₹{formatIndianNumber(data.stats.monthlyCommission)}</p>
                      <p className="text-sm text-purple-200">Earned</p>
                    </div>
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-lg text-white">
                      <p className="text-orange-100">Customers</p>
                      <p className="text-2xl font-bold">{data.stats.myActiveEnrollments}</p>
                      <p className="text-sm text-orange-200">Active</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-4">
                      <h3 className="font-semibold mb-4">Monthly Performance</h3>
                      <div className="h-64 bg-slate-100 rounded-lg flex items-center justify-center">
                        <p className="text-slate-500">Performance Chart Placeholder</p>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <h3 className="font-semibold mb-4">Collection Trends</h3>
                      <div className="h-64 bg-slate-100 rounded-lg flex items-center justify-center">
                        <p className="text-slate-500">Trends Chart Placeholder</p>
                      </div>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Communication Tab */}
            <TabsContent value="communication" className="space-y-6">
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Customer Communication
                  </CardTitle>
                  <CardDescription>Send reminders and manage communications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-4">
                      <h3 className="font-semibold mb-4">Send Reminders</h3>
                      <div className="space-y-4">
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reminder type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="payment-due">Payment Due</SelectItem>
                            <SelectItem value="payment-overdue">Payment Overdue</SelectItem>
                            <SelectItem value="meeting-reminder">Meeting Reminder</SelectItem>
                            <SelectItem value="document-required">Document Required</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select customers" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all-due">All Due Today</SelectItem>
                            <SelectItem value="overdue">Overdue Customers</SelectItem>
                            <SelectItem value="custom">Custom Selection</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          className="w-full" 
                          onClick={() => handleSendReminder('due')}
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          Send Reminders
                        </Button>
                      </div>
                    </Card>
                    <Card className="p-4">
                      <h3 className="font-semibold mb-4">Recent Communications</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="bg-green-100 p-2 rounded-full">
                            <MessageCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">Payment reminder sent</p>
                            <p className="text-sm text-slate-600">To: Raj Kumar</p>
                            <p className="text-xs text-slate-500">2 hours ago</p>
                          </div>
                          <Badge variant="secondary">SMS</Badge>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <Phone className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">Follow-up call</p>
                            <p className="text-sm text-slate-600">To: Priya Sharma</p>
                            <p className="text-xs text-slate-500">1 day ago</p>
                          </div>
                          <Badge variant="secondary">Call</Badge>
                        </div>
                      </div>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Member Registration Modal */}
      <MemberRegistrationModal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        onMemberCreated={handleMemberCreated}
      />

      {/* Invoice Creation Modal */}
      {showInvoiceCreationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">📄 Create New Invoice</h2>
                  <p className="text-slate-600 mt-1">Select a customer to generate their invoice</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInvoiceCreationModal(false)}
                  className="hover:bg-slate-100"
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <h3 className="font-semibold mb-3 text-slate-700">🧑‍🤝‍🧑 Select Customer:</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {customers.map((customer) => (
                    <div
                      key={customer._id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedCustomerForInvoice?._id === customer._id
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => setSelectedCustomerForInvoice(customer)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">👤 {customer.userId.name}</p>
                          <p className="text-sm text-slate-600">📞 {customer.userId.phone}</p>
                          <p className="text-sm text-slate-600">📧 {customer.userId.email}</p>
                          <p className="text-sm text-blue-600 font-medium">📋 {customer.planId.planName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-slate-700">
                            💰 ₹{customer.planId.monthlyAmount.toLocaleString('en-IN')}
                          </p>
                          <Badge 
                            variant={customer.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs mt-1"
                          >
                            {customer.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowInvoiceCreationModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedCustomerForInvoice) {
                      handleCreateInvoice(selectedCustomerForInvoice._id, selectedCustomerForInvoice.userId._id);
                      setShowInvoiceCreationModal(false);
                      setSelectedCustomerForInvoice(null);
                    }
                  }}
                  disabled={!selectedCustomerForInvoice || isCreatingInvoice}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  {isCreatingInvoice ? '⏳ Creating...' : '📄 Create Invoice'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt History Modal */}
      {showReceiptHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">📄 Receipt History</h2>
                  <p className="text-slate-600 mt-1">View and manage all payment receipts</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowReceiptHistoryModal(false);
                    setPaymentHistory([]);
                  }}
                  className="hover:bg-slate-100"
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <Button
                  onClick={fetchPaymentHistory}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  🔄 Refresh History
                </Button>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {paymentHistory.map((payment, index) => (
                  <div
                    key={payment._id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800">📄 {payment.receiptNumber}</p>
                        <Badge 
                          variant={payment.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {payment.status === 'completed' ? '✅ Paid' : '⏳ Pending'}
                        </Badge>
                        {payment.receiptGenerated && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            📄 Receipt Generated
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {payment.userId?.name}
                      </p>
                      <p className="text-sm text-slate-600 flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" />
                        ₹{payment.amount.toLocaleString('en-IN')} - {payment.paymentMethod.toUpperCase()}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(payment.paidDate).toLocaleDateString('en-IN')} {new Date(payment.paidDate).toLocaleTimeString('en-IN')}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {payment.receiptGenerated ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/receipt/thermal/${payment.paymentId}`, '_blank')}
                          className="hover:bg-blue-50 hover:border-blue-300"
                        >
                          👁️ View Receipt
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleGenerateReceipt(payment.paymentId)}
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          📄 Generate Receipt
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`tel:${payment.userId?.phone}`, '_blank')}
                        className="text-xs"
                      >
                        📞 Call Customer
                      </Button>
                    </div>
                  </div>
                ))}
                {paymentHistory.length === 0 && (
                  <div className="text-center py-8">
                    <div className="bg-slate-50 rounded-lg p-6">
                      <Receipt className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">📄 No payment history found</p>
                      <p className="text-slate-400 text-sm mt-1">Click "Refresh History" to load recent payments</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Member Details Modal */}
      {showMemberDetailsModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">👤 Member Details</h3>
              <button
                onClick={() => {
                  setShowMemberDetailsModal(false);
                  setIsEditingMember(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Panel - Member Info */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-lg">Personal Information</h4>
                    <button
                      onClick={() => setIsEditingMember(!isEditingMember)}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                    >
                      {isEditingMember ? '📝 Cancel Edit' : '✏️ Edit Details'}
                    </button>
                  </div>

                  {isEditingMember ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <input
                          type="text"
                          value={editMemberData.name}
                          onChange={(e) => setEditMemberData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Phone</label>
                        <input
                          type="text"
                          value={editMemberData.phone}
                          onChange={(e) => setEditMemberData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                          type="email"
                          value={editMemberData.email}
                          onChange={(e) => setEditMemberData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Address</label>
                        <textarea
                          value={editMemberData.address?.street || ''}
                          onChange={(e) => setEditMemberData(prev => ({ 
                            ...prev, 
                            address: { ...prev.address, street: e.target.value }
                          }))}
                          className="w-full p-2 border rounded"
                          rows={3}
                        />
                      </div>
                      <button
                        onClick={handleUpdateMember}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full"
                      >
                        💾 Save Changes
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <p><strong>Name:</strong> {selectedMember.userId.name}</p>
                      <p><strong>Phone:</strong> {selectedMember.userId.phone}</p>
                      <p><strong>Email:</strong> {selectedMember.userId.email}</p>
                      <p><strong>Address:</strong> {selectedMember.userId.address?.street || 'Not provided'}</p>
                      <p><strong>Member ID:</strong> {selectedMember.memberNumber || 'N/A'}</p>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg mb-3">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSendSMS(selectedMember)}
                      className="bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600"
                    >
                      📱 Send SMS
                    </button>
                    <button
                      onClick={() => handleGenerateMemberReceipt(selectedMember.userId._id)}
                      className="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600"
                    >
                      📄 Generate Receipt
                    </button>
                    <button
                      onClick={() => handleMemberPaymentCollection(selectedMember)}
                      className="bg-purple-500 text-white px-3 py-2 rounded text-sm hover:bg-purple-600"
                    >
                      💰 Collect Payment
                    </button>
                    <button
                      onClick={() => window.open(`tel:${selectedMember.userId.phone}`, '_self')}
                      className="bg-orange-500 text-white px-3 py-2 rounded text-sm hover:bg-orange-600"
                    >
                      📞 Call Member
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Panel - Enrollments & Payments */}
              <div className="space-y-4">
                {/* Enrolled Plans */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg mb-3">📋 Enrolled Plans ({memberEnrollments.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {memberEnrollments.length > 0 ? (
                      memberEnrollments.map((enrollment: any) => (
                        <div key={enrollment._id} className="bg-white p-3 rounded border text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{enrollment.planId?.planName || 'Unknown Plan'}</p>
                              <p className="text-gray-600">Amount: ₹{enrollment.planId?.totalAmount}</p>
                              <p className="text-gray-600">{enrollment.planId?.duration} months</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              enrollment.status === 'active' ? 'bg-green-100 text-green-800' :
                              enrollment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {enrollment.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Enrolled: {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No active enrollments</p>
                    )}
                  </div>
                </div>

                {/* Recent Payments */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-lg mb-3">💳 Recent Payments ({memberPayments.length})</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {memberPayments.length > 0 ? (
                      memberPayments.map((payment: any) => (
                        <div key={payment._id} className="bg-white p-3 rounded border text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">₹{payment.amount}</p>
                              <p className="text-gray-600">{payment.planId?.planName || 'Unknown Plan'}</p>
                              <p className="text-gray-600">{payment.paymentType}</p>
                            </div>
                            <div className="text-right text-xs text-gray-500">
                              <p>{new Date(payment.paymentDate).toLocaleDateString()}</p>
                              <p>#{payment.receiptNumber}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No payment history</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}