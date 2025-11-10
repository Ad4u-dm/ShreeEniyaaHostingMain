'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Send, Eye } from 'lucide-react';
import { formatIndianNumber } from '@/lib/helpers';

interface Customer {
  _id: string;
  userId?: string;
  name: string;
  email?: string;
  phone: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

interface Plan {
  _id: string;
  planName: string;
  monthlyAmount: number;
  duration?: number;
  totalAmount?: number;
}

interface InvoiceForm {
  customerId: string;
  planId: string;
  description: string;
  dueDate: string;
  paymentTerms: string;
  notes: string;
  template: number;
  receivedAmount?: number;
  receiptDetails: {
    memberNo: string;
    dueNo: string;
    paymentMonth: string; // Which month this payment is for (YYYY-MM)
    dueAmount: number;
    arrearAmount: number;
    pendingAmount: number;
    receivedAmount: number;
    balanceAmount: number;
    issuedBy: string;
  };
}

export default function CreateInvoicePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextReceiptNo, setNextReceiptNo] = useState<string>('');
  const [customerEnrollments, setCustomerEnrollments] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Get previous balance from the latest invoice for the customer
  const getPreviousBalance = async (customerId: string, planId: string) => {
    try {
      const response = await fetch(`/api/invoices?customerId=${customerId}&planId=${planId}&latest=true`);
      if (response.ok) {
        const data = await response.json();
        // Return the balance amount from the latest invoice, or monthly due if no previous invoice
        return data.invoice?.balanceAmount || null;
      }
    } catch (error) {
      console.error('Error fetching previous balance:', error);
    }
    return null;
  };

  // Calculate balance amount: Previous balance - today's payment (or monthly due if no previous invoice)
  const calculateDailyBalance = (paymentMonth: string, todayPayment: number, monthlyAmount: number, previousBalance: number | null = null) => {
    // If we have previous balance from latest invoice, use it; otherwise start with monthly due
    const startingBalance = previousBalance !== null ? previousBalance : monthlyAmount;
    
    // Balance = Previous Balance - Today's Payment
    const balance = startingBalance - todayPayment;
    
    return Math.max(0, balance); // Balance cannot be negative
  };

  // Calculate chit fund amounts based on plan and payment history
  const calculateChitFundAmounts = async (paymentMonth: string) => {
    if (!formData.customerId || !formData.planId) return;

    // Ensure planId is a string, not an object
    const planIdStr = typeof formData.planId === 'string' ? formData.planId : 
                     (formData.planId as any)?._id || String(formData.planId);
    
    console.log('calculateChitFundAmounts:', {
      customerId: formData.customerId,
      planId: formData.planId,
      planIdStr,
      paymentMonth
    });

    try {
      // Get customer's payment history to calculate arrears
      const historyResponse = await fetch(`/api/customers/${formData.customerId}/payment-history?planId=${planIdStr}`);
      const historyData = await historyResponse.json();

      const selectedPlan = plans.find(p => p._id === planIdStr);
      if (!selectedPlan) {
        console.error('Plan not found:', planIdStr, 'Available plans:', plans.map(p => p._id));
        return;
      }

      const monthlyDue = selectedPlan.monthlyAmount || 0;
      
      // Get customer enrollment start date to calculate realistic arrears
      const selectedCustomer = customers.find(c => c._id === formData.customerId);
      const customerEnrollment = customerEnrollments.find(
        enrollment => {
          const userMatch = enrollment.userId?.userId === selectedCustomer?.userId;
          const planMatch = (enrollment.planId === planIdStr) || (enrollment.planId?._id === planIdStr);
          const statusMatch = enrollment.status === 'active';
          
          console.log('Enrollment lookup debug:', {
            enrollmentId: enrollment._id,
            userMatch,
            planMatch,
            statusMatch,
            enrollmentUserId: enrollment.userId?.userId,
            customerUserId: selectedCustomer?.userId,
            enrollmentPlanId: enrollment.planId,
            targetPlanId: planIdStr
          });
          
          return userMatch && planMatch && statusMatch;
        }
      );
      
      console.log('Enrollment info for arrear calculation:', {
        customerEnrollment,
        enrollmentDate: customerEnrollment?.enrollmentDate,
        createdAt: customerEnrollment?.createdAt
      });
      
      // Calculate arrear amount (unpaid months since enrollment)
      const paymentHistory = historyData.payments || [];
      const currentDate = new Date(paymentMonth + '-01');
      let arrearAmount = 0;
      
      // Get enrollment start date
      const enrollmentStartDate = customerEnrollment?.enrollmentDate || customerEnrollment?.createdAt;
      
      if (enrollmentStartDate) {
        const enrollmentDate = new Date(enrollmentStartDate);
        const enrollmentMonth = enrollmentDate.toISOString().slice(0, 7);
        
        console.log('Calculating arrears from enrollment month:', enrollmentMonth, 'to current month:', paymentMonth);
        
        // Only check months from enrollment start to current month
        const startDate = new Date(enrollmentMonth + '-01');
        const endDate = new Date(currentDate);
        
        // Calculate how many months since enrollment
        let monthsToCheck = 0;
        const tempDate = new Date(startDate);
        while (tempDate < endDate) {
          monthsToCheck++;
          tempDate.setMonth(tempDate.getMonth() + 1);
        }
        
        console.log('Months to check for arrears:', monthsToCheck);
        
        // Check each month since enrollment
        for (let i = 0; i < monthsToCheck; i++) {
          const checkMonth = new Date(startDate);
          checkMonth.setMonth(checkMonth.getMonth() + i);
          const checkMonthStr = checkMonth.toISOString().slice(0, 7);
          
          console.log('Checking month:', checkMonthStr);
          
          const paidForMonth = paymentHistory.find((p: any) => p.paymentMonth === checkMonthStr);
          const paidAmount = paidForMonth?.amount || 0;
          
          console.log('Payment for month', checkMonthStr, ':', paidAmount, 'due:', monthlyDue);
          
          if (paidAmount < monthlyDue) {
            const shortage = monthlyDue - paidAmount;
            arrearAmount += shortage;
            console.log('Added to arrears:', shortage, 'total arrears now:', arrearAmount);
          }
        }
      } else {
        // Fallback: If no enrollment date, assume recent enrollment (only check last 2 months)
        console.log('No enrollment date found, checking last 2 months only');
        for (let i = 1; i <= 2; i++) {
          const checkMonth = new Date(currentDate);
          checkMonth.setMonth(checkMonth.getMonth() - i);
          const checkMonthStr = checkMonth.toISOString().slice(0, 7);
          
          const paidForMonth = paymentHistory.find((p: any) => p.paymentMonth === checkMonthStr);
          const paidAmount = paidForMonth?.amount || 0;
          
          if (paidAmount < monthlyDue) {
            arrearAmount += monthlyDue - paidAmount;
          }
        }
      }
      
      console.log('Final arrear calculation:', {
        totalArrearAmount: arrearAmount,
        monthlyDue,
        enrollmentStart: enrollmentStartDate
      });

      // Calculate daily due amount (monthly due / days in month)
      const [year, month] = paymentMonth.split('-');
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      const dailyDue = Math.round(monthlyDue / daysInMonth);
      
      // Get previous balance from latest invoice
      const previousBalance = await getPreviousBalance(formData.customerId, planIdStr);
      
      // Calculate balance amount using correct chit fund logic
      const balanceAmount = calculateDailyBalance(paymentMonth, dailyDue, monthlyDue, previousBalance);
      
      console.log('Balance calculation debug:', {
        paymentMonth,
        monthlyDue,
        daysInMonth,
        dailyDue,
        previousBalance,
        paymentHistory,
        calculatedBalance: balanceAmount
      });

      // Update receipt details with calculated amounts
      setFormData(prev => ({
        ...prev,
        receiptDetails: {
          ...prev.receiptDetails,
          dueAmount: monthlyDue,
          arrearAmount: arrearAmount,
          receivedAmount: dailyDue,  // Daily due amount
          balanceAmount: balanceAmount,
        }
      }));

    } catch (error) {
      console.error('Error calculating chit fund amounts:', error);
      // Fallback to plan amount
      const selectedPlan = plans.find(p => p._id === formData.planId);
      if (selectedPlan) {
        const monthlyAmount = selectedPlan.monthlyAmount || 0;
        const [year, month] = paymentMonth.split('-');
        const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
        const dailyDue = Math.round(monthlyAmount / daysInMonth);
        const balanceAmount = calculateDailyBalance(paymentMonth, dailyDue, monthlyAmount, null);
        
        setFormData(prev => ({
          ...prev,
          receiptDetails: {
            ...prev.receiptDetails,
            dueAmount: monthlyAmount,
            arrearAmount: 0,
            receivedAmount: dailyDue,
            balanceAmount: balanceAmount,
          }
        }));
      }
    }
  };
  const [formData, setFormData] = useState<InvoiceForm>({
    customerId: '',
    planId: '',
    description: '',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paymentTerms: '30 days',
    notes: 'Thank you for your business!',
    template: 1,
    receivedAmount: 0,
    receiptDetails: {
      memberNo: '',
      dueNo: '1',
      paymentMonth: new Date().toISOString().slice(0, 7), // Current month YYYY-MM
      dueAmount: 0,
      arrearAmount: 0,
      pendingAmount: 0,
      receivedAmount: 0,
      balanceAmount: 0,
      issuedBy: 'ADMIN'
    }
  });

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.warn('No authentication token found, redirecting to login');
        window.location.href = '/login';
        return;
      }
      setAuthChecked(true);
    };

    // Only run on client side
    if (typeof window !== 'undefined') {
      checkAuth();
    }
  }, []);

  // Helper function to check if customer is enrolled in a specific plan
  const isCustomerEnrolled = (customerId: string, planId?: string) => {
    const selectedCustomer = customers.find(c => c._id === customerId);
    if (!selectedCustomer || !selectedCustomer.userId) return false;

    return customerEnrollments.some(enrollment => {
      const userMatch = enrollment.userId?.userId === selectedCustomer.userId;
      const statusMatch = enrollment.status === 'active';
      const planMatch = planId ? 
        (enrollment.planId === planId || enrollment.planId?._id === planId) : 
        true;
      
      console.log('Enrollment check:', {
        userMatch,
        statusMatch,
        planMatch,
        enrollmentUserId: enrollment.userId?.userId,
        customerUserId: selectedCustomer.userId,
        enrollmentPlanId: enrollment.planId,
        formPlanId: planId,
        enrollmentStatus: enrollment.status
      });
      
      return userMatch && statusMatch && planMatch;
    });
  };

  useEffect(() => {
    // Only run after auth is checked and on client side
    if (typeof window !== 'undefined' && authChecked) {
      fetchCustomers();
      fetchPlans();
      fetchEnrollments();
      generateNextReceiptNumber();
    }
  }, [authChecked]);

  // Auto-populate member number when customer is selected
  useEffect(() => {
    if (selectedCustomerProfile && selectedCustomerProfile.memberNumber) {
      setFormData(prevFormData => ({
        ...prevFormData,
        receiptDetails: {
          ...prevFormData.receiptDetails,
          memberNo: selectedCustomerProfile.memberNumber
        }
      }));
    }
  }, [selectedCustomerProfile]);

  // Auto-calculate daily amounts when customer and plan are both selected
  useEffect(() => {
    const planIdStr = typeof formData.planId === 'string' ? formData.planId : 
                     (formData.planId as any)?._id || String(formData.planId);
    
    if (formData.customerId && planIdStr && plans.length > 0) {
      console.log('Auto-calculating amounts for customer:', formData.customerId, 'plan:', planIdStr);
      calculateChitFundAmounts(formData.receiptDetails.paymentMonth || new Date().toISOString().slice(0, 7));
    }
  }, [formData.customerId, typeof formData.planId === 'string' ? formData.planId : (formData.planId as any)?._id, plans.length]);

  const generateNextReceiptNumber = async () => {
    try {
      const response = await fetch('/api/receipts/next-number');
      const data = await response.json();
      
      if (data.success) {
        setNextReceiptNo(data.nextReceiptNo);
      } else {
        console.error('Failed to generate receipt number:', data.error);
        setNextReceiptNo('0001');
      }
      
    } catch (error) {
      console.error('Error generating receipt number:', error);
      setNextReceiptNo('0001');
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      
      // Try with authentication first, then fallback to no auth since /api/users doesn't require it
      const headers: any = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/users?role=user', { headers });
      
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.users?.map((c: any) => ({
          _id: c._id,
          userId: c.userId,
          name: c.name,
          email: c.email,
          phone: c.phone
        })) || []);
      } else {
        console.error('Failed to fetch customers:', response.status, response.statusText);
        if (response.status === 401) {
          console.warn('Unauthorized - may need to login again');
        }
        setCustomers([]);
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
        // Ensure we set an array - handle both direct array and object with plans property
        setPlans(Array.isArray(data) ? data : (data.plans || []));
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      setPlans([]);
    }
  };

  const fetchEnrollments = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.warn('No auth token found');
        setCustomerEnrollments([]);
        return;
      }
      
      const response = await fetch('/api/enrollments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCustomerEnrollments(data.enrollments || []);
      } else {
        console.error('Failed to fetch enrollments:', response.status, response.statusText);
        if (response.status === 401) {
          console.warn('Unauthorized - may need to login again');
        }
        setCustomerEnrollments([]);
      }
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
      setCustomerEnrollments([]);
    }
  };

  const fetchCustomerProfile = async (customerId: string) => {
    setLoadingProfile(true);
    try {
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.warn('No auth token found');
        setSelectedCustomerProfile(null);
        setLoadingProfile(false);
        return;
      }
      
      const response = await fetch(`/api/customers/${customerId}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('=== CUSTOMER PROFILE DEBUG ===');
        console.log('Full API response:', data);
        console.log('Customer object:', data.customer);
        console.log('Current enrollment:', data.customer?.currentEnrollment);
        console.log('Payment summary:', data.customer?.paymentSummary);
        console.log('Member number:', data.customer?.memberNumber);
        console.log('Credit score:', data.customer?.creditScore);
        setSelectedCustomerProfile(data.customer);
        
        // Auto-populate form fields from customer profile
        if (data.customer.currentEnrollment) {
          setFormData(prev => {
            const enrollmentPlanId = typeof data.customer.currentEnrollment.planId === 'string' 
              ? data.customer.currentEnrollment.planId 
              : data.customer.currentEnrollment.planId?._id || prev.planId;
              
            return {
              ...prev,
              planId: enrollmentPlanId, // Auto-select plan
              receiptDetails: {
                ...prev.receiptDetails,
                memberNo: data.customer.memberNumber || data.customer.currentEnrollment.memberNumber || '2154',
                dueNo: data.customer.paymentSummary?.currentDueNumber?.toString() || '1',
                dueAmount: data.customer.paymentSummary?.nextDueAmount || data.customer.currentEnrollment.monthlyAmount || 0,
                receivedAmount: data.customer.paymentSummary?.nextDueAmount || data.customer.currentEnrollment.monthlyAmount || 0,
                pendingAmount: data.customer.paymentSummary?.pendingAmount || 0,
                arrearAmount: data.customer.paymentSummary?.arrearAmount || 0
              }
            };
          });
        } else {
          // Reset form if no enrollment
          setFormData(prev => ({
            ...prev,
            planId: '',
            receiptDetails: {
              ...prev.receiptDetails,
              memberNo: '',
              dueNo: '1',
              dueAmount: 0,
              receivedAmount: 0,
              pendingAmount: 0,
              arrearAmount: 0
            }
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch customer profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCustomerChange = async (customerId: string) => {
    // Find customer's active enrollment
    const selectedCustomer = customers.find(c => c._id === customerId);
    console.log('Selected customer:', selectedCustomer);
    console.log('All customer enrollments:', customerEnrollments);
    
    const customerEnrollment = customerEnrollments.find(
      enrollment => enrollment.userId?.userId === selectedCustomer?.userId && enrollment.status === 'active'
    );
    console.log('Found customer enrollment:', customerEnrollment);
    
    // Update form data with customer first  
    const enrollmentPlanId = customerEnrollment ? 
      (typeof customerEnrollment.planId === 'string' ? 
        customerEnrollment.planId : 
        customerEnrollment.planId?._id || '') : '';
        
    setFormData(prev => ({
      ...prev,
      customerId,
      planId: enrollmentPlanId
    }));
    
    // Fetch comprehensive customer profile which will auto-populate more fields
    await fetchCustomerProfile(customerId);
    
    // If customer has an enrollment, auto-populate plan and receipt details
    if (customerEnrollment && Array.isArray(plans)) {
      const enrollmentPlanIdStr = typeof customerEnrollment.planId === 'string' ? 
        customerEnrollment.planId : 
        customerEnrollment.planId?._id || '';
        
      const selectedPlan = plans.find(p => p._id === enrollmentPlanIdStr);
      if (selectedPlan) {
        setFormData(prev => ({
          ...prev,
          customerId,
          planId: enrollmentPlanIdStr,
          receiptDetails: {
            ...prev.receiptDetails,
            dueAmount: selectedPlan.monthlyAmount || 0,
            receivedAmount: 0  // Should start at 0, user will input actual received amount
          }
        }));

        // Calculate chit fund amounts with daily balance
        setTimeout(() => {
          calculateChitFundAmounts(new Date().toISOString().slice(0, 7));
        }, 100);
      }
    }
  };

  const enrollCustomerInPlan = async (planId: string) => {
    if (!formData.customerId || !planId) {
      alert('Please select both customer and plan');
      return;
    }

    setEnrolling(true);
    try {
      // Find the selected customer to get their userId
      const selectedCustomer = customers.find(c => c._id === formData.customerId);
      if (!selectedCustomer) {
        alert('Selected customer not found');
        return;
      }

      const enrollmentData = {
        userId: selectedCustomer.userId || selectedCustomer._id, // Use userId if available, fallback to _id
        planId: planId,
        startDate: new Date().toISOString(),
        nominee: '', // Can be added to form later if needed
        assignedStaff: null // Will be set by API to current user
      };

      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(enrollmentData)
      });

      if (response.ok) {
        alert('Customer enrolled successfully!');
        // Refresh enrollments
        await fetchEnrollments();
        // Auto-populate the form with the new enrollment
        handleCustomerChange(formData.customerId);
      } else {
        const errorData = await response.json();
        alert(`Failed to enroll customer: ${errorData.error || errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error enrolling customer:', error);
      alert('Failed to enroll customer');
    } finally {
      setEnrolling(false);
    }
  };



  const handleSave = async (status: 'draft' | 'sent') => {
    setLoading(true);
    const authToken = localStorage.getItem('auth-token');
    try {
      // Get selected customer and plan data
      const selectedCustomer = customers.find(c => c._id === formData.customerId);
      const selectedPlan = plans.find(p => p._id === formData.planId);

      if (!selectedCustomer) {
        alert('Please select a customer');
        setLoading(false);
        return;
      }

      if (!selectedPlan) {
        alert('Please select a plan');
        setLoading(false);
        return;
      }

      // Find enrollment for this customer and plan
      console.log('Selected customer profile:', selectedCustomerProfile);
      console.log('Looking for plan ID:', formData.planId);
      
      let enrollmentId = null;
      
      // First check if the customer has an active enrollment for this plan
      if (selectedCustomerProfile && selectedCustomerProfile.activeEnrollment) {
        console.log('Active enrollment:', selectedCustomerProfile.activeEnrollment);
        const activeEnrollment = selectedCustomerProfile.activeEnrollment;
        
        if (activeEnrollment.planId === formData.planId || activeEnrollment.planId._id === formData.planId) {
          enrollmentId = activeEnrollment._id;
          console.log('Found active enrollment ID:', enrollmentId);
        }
      }
      
      // If no active enrollment match, check enrollment history
      if (!enrollmentId && selectedCustomerProfile && selectedCustomerProfile.enrollmentHistory) {
        console.log('Checking enrollment history:', selectedCustomerProfile.enrollmentHistory);
        
        const enrollment = selectedCustomerProfile.enrollmentHistory.find((e: any) => {
          console.log('Checking historical enrollment:', e, 'planId:', e.planId, 'planId._id:', e.planId?._id);
          return (e.planId === formData.planId || e.planId._id === formData.planId) && e.status === 'active';
        });
        
        if (enrollment) {
          enrollmentId = enrollment._id;
          console.log('Found historical enrollment ID:', enrollmentId);
        }
      }
      
      // Alternative: Try using the currentEnrollment.enrollmentId if it matches the plan
      if (!enrollmentId && selectedCustomerProfile && selectedCustomerProfile.currentEnrollment) {
        console.log('Checking currentEnrollment:', selectedCustomerProfile.currentEnrollment);
        
        if (selectedCustomerProfile.currentEnrollment.planId === formData.planId) {
          enrollmentId = selectedCustomerProfile.currentEnrollment.enrollmentId;
          console.log('Found currentEnrollment ID:', enrollmentId);
        }
      }

      if (!enrollmentId) {
        console.log('No enrollment found - trying API fallback');
        
        // Alternative: Try to find enrollment by making a direct API call
        try {
          const enrollmentResponse = await fetch(`/api/enrollments?userId=${selectedCustomer.userId || selectedCustomer._id}&planId=${formData.planId}`, {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          });
          
          if (enrollmentResponse.ok) {
            const enrollmentData = await enrollmentResponse.json();
            console.log('Enrollment API response:', enrollmentData);
            
            if (enrollmentData.enrollments && enrollmentData.enrollments.length > 0) {
              enrollmentId = enrollmentData.enrollments[0]._id;
              console.log('Found enrollment via API:', enrollmentId);
            }
          }
        } catch (error) {
          console.error('Error fetching enrollment:', error);
        }
      }

      if (!enrollmentId) {
        alert('Customer must be enrolled in the selected plan first');
        setLoading(false);
        return;
      }

      // Get current user for createdBy field
      const userResponse = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      let currentUserId = 'admin'; // Default fallback
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('User data from /api/auth/me:', userData);
        currentUserId = userData.user._id || userData.user.userId || 'admin';
        console.log('Using createdBy:', currentUserId);
      } else {
        console.error('Failed to get user data:', userResponse.status);
      }

      // Get the received amount (prioritize form receivedAmount, then receiptDetails, then plan amount)
      const receivedAmount = formData.receivedAmount || formData.receiptDetails?.receivedAmount || selectedPlan.monthlyAmount || 0;
      
      console.log('Debugging amounts:', {
        'formData.receivedAmount': formData.receivedAmount,
        'formData.receiptDetails?.receivedAmount': formData.receiptDetails?.receivedAmount,
        'selectedPlan.monthlyAmount': selectedPlan.monthlyAmount,
        'final receivedAmount': receivedAmount
      });

      if (receivedAmount <= 0) {
        alert('Please enter a valid received amount greater than 0');
        setLoading(false);
        return;
      }
      
      // Create a single item for the payment
      const paymentItem = {
        description: formData.description || `Payment for ${selectedPlan.planName}`,
        quantity: 1,
        rate: receivedAmount,
        amount: receivedAmount
      };

      const total = receivedAmount;
      const subtotal = receivedAmount;

      console.log('Payment details:', { receivedAmount, total, paymentItem });

      const invoiceData = {
        // Required fields from Invoice model
        enrollmentId,
        customerId: formData.customerId,
        planId: formData.planId,
        createdBy: currentUserId,
        totalAmount: total,
        
        // Customer details snapshot
        customerDetails: {
          name: selectedCustomer.name,
          email: selectedCustomer.email || '',
          phone: selectedCustomer.phone,
          address: {
            street: selectedCustomer.address?.street || '',
            city: selectedCustomer.address?.city || '',
            state: selectedCustomer.address?.state || '',
            pincode: selectedCustomer.address?.pincode || ''
          }
        },
        
        // Plan details snapshot
        planDetails: {
          planName: selectedPlan.planName,
          monthlyAmount: selectedPlan.monthlyAmount,
          duration: selectedPlan.duration,
          totalAmount: selectedPlan.totalAmount
        },

        // Single payment item
        items: [paymentItem],

        // Receipt fields (individual - for backward compatibility and thermal receipt)
        receiptNo: nextReceiptNo,
        memberNumber: formData.receiptDetails.memberNo,
        dueNumber: formData.receiptDetails.dueNo,
        memberName: selectedCustomer.name,
        paymentMonth: formData.receiptDetails.paymentMonth,
        dueAmount: formData.receiptDetails.dueAmount,
        arrearAmount: formData.receiptDetails.arrearAmount,
        pendingAmount: Math.max(0, (formData.receiptDetails.dueAmount + formData.receiptDetails.arrearAmount) - total),
        receivedAmount: total,
        balanceAmount: formData.receiptDetails.balanceAmount, // Use the calculated balance from form  
        totalReceivedAmount: total,
        issuedBy: formData.receiptDetails.issuedBy,
        
        // Other fields
        status,
        subtotal,
        taxAmount: 0,
        penaltyAmount: 0,
        dueDate: new Date(formData.dueDate),
        issueDate: new Date(),
        description: formData.description || `Payment for ${selectedPlan.planName}`,
        paymentTerms: formData.paymentTerms,
        notes: formData.notes,
        template: formData.template
      };

      console.log('Sending invoice data:', invoiceData);

      const response = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(invoiceData)
      });

      const result = await response.json();
      console.log('Invoice creation response:', result);

      if (response.ok) {
        alert(`Invoice ${status === 'draft' ? 'saved as draft' : 'created and sent'} successfully!`);
        // Generate next receipt number for future invoices
        generateNextReceiptNumber();
        window.location.href = '/admin/invoices';
      } else {
        console.error('Invoice creation failed:', result);
        alert(`Failed to create invoice: ${result.error || 'Unknown error'}`);
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
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Create Invoice</h1>
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
                  <Select value={formData.customerId} onValueChange={handleCustomerChange}>
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
                  {formData.customerId && !isCustomerEnrolled(formData.customerId) && (
                    <p className="text-sm text-amber-600 mt-1">
                      ⚠️ This customer is not enrolled in any plan. Select a plan and click "Enroll Customer".
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Plan
                  </label>
                  <div className="flex gap-2">
                    <Select value={formData.planId} onValueChange={(value) => {
                      const newFormData = { ...formData, planId: value };
                      setFormData(newFormData);
                      // Trigger calculation when plan changes
                      setTimeout(() => {
                        calculateChitFundAmounts(newFormData.receiptDetails.paymentMonth || new Date().toISOString().slice(0, 7));
                      }, 100);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(plans) && plans.map((plan) => (
                          <SelectItem key={plan._id} value={plan._id}>
                            {plan.planName} - ₹{formatIndianNumber(plan.monthlyAmount)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.customerId && formData.planId && !isCustomerEnrolled(formData.customerId, formData.planId) && (
                      <Button
                        type="button"
                        onClick={() => enrollCustomerInPlan(formData.planId)}
                        disabled={enrolling}
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap"
                      >
                        {enrolling ? 'Enrolling...' : 'Enroll Customer'}
                      </Button>
                    )}
                  </div>
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
            </CardContent>
          </Card>



          {/* Receipt Details */}
          <Card>
            <CardHeader>
              <CardTitle>Receipt Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Member No {selectedCustomerProfile?.memberNumber && <span className="text-xs text-green-600">(Auto-generated)</span>}
                  </label>
                  <Input
                    value={formData.receiptDetails.memberNo}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      receiptDetails: { ...formData.receiptDetails, memberNo: e.target.value }
                    })}
                    placeholder="Auto-generated from customer profile"
                    disabled={!!selectedCustomerProfile?.memberNumber}
                    className={selectedCustomerProfile?.memberNumber ? "bg-green-50 border-green-200" : ""}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Due No
                  </label>
                  <Input
                    value={formData.receiptDetails.dueNo}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      receiptDetails: { ...formData.receiptDetails, dueNo: e.target.value }
                    })}
                    placeholder="Due number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Month
                  </label>
                  <Input
                    type="month"
                    value={formData.receiptDetails.paymentMonth}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        receiptDetails: { ...formData.receiptDetails, paymentMonth: e.target.value }
                      });
                      // Recalculate amounts when month changes
                      calculateChitFundAmounts(e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Due Amount
                  </label>
                  <Input
                    type="number"
                    value={formData.receiptDetails.dueAmount}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      receiptDetails: { ...formData.receiptDetails, dueAmount: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Arrear Amount
                  </label>
                  <Input
                    type="number"
                    value={formData.receiptDetails.arrearAmount}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      receiptDetails: { ...formData.receiptDetails, arrearAmount: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Received Amount
                  </label>
                  <Input
                    type="number"
                    value={formData.receiptDetails.receivedAmount}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      receiptDetails: { ...formData.receiptDetails, receivedAmount: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="Enter received amount"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Balance Amount
                  </label>
                  <Input
                    type="number"
                    value={formData.receiptDetails.balanceAmount}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      receiptDetails: { ...formData.receiptDetails, balanceAmount: parseFloat(e.target.value) || 0 }
                    })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Issued By
                  </label>
                  <Input
                    value={formData.receiptDetails.issuedBy}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      receiptDetails: { ...formData.receiptDetails, issuedBy: e.target.value }
                    })}
                    placeholder="ADMIN"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Amount */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Description
                  </label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Payment description"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Total Received Amount (₹) *
                  </label>
                  <Input
                    type="number"
                    value={formData.receivedAmount || (formData.receiptDetails?.receivedAmount || 0)}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      setFormData({ 
                        ...formData, 
                        receivedAmount: amount,
                        receiptDetails: {
                          ...formData.receiptDetails,
                          receivedAmount: amount
                        }
                      });
                    }}
                    min="0"
                    step="0.01"
                    placeholder="Enter received amount"
                  />
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-end">
                  <div className="text-right space-y-2">
                    <div className="flex justify-between gap-8 text-lg font-bold text-green-600">
                      <span>Total Received Amount:</span>
                      <span>₹{formatIndianNumber(formData.receivedAmount || formData.receiptDetails?.receivedAmount || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
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

        {/* Live Preview */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Live Receipt Preview</CardTitle>
              <CardDescription>Real-time thermal receipt preview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-white border-2 border-dashed border-slate-200 p-4 font-mono text-xs">
                <div style={{textAlign: 'center', fontWeight: 'bold', fontSize: '12px', marginBottom: '3px'}}>
                  SHREE ENIYAA CHITFUNDS (P) LTD.
                </div>
                <div style={{fontSize: '9px', textAlign: 'center', margin: '2px 0'}}>
                  Shop no. 2 , Mahadhana Street,
                </div>
                <div style={{fontSize: '9px', textAlign: 'center', margin: '2px 0'}}>
                  Mayiladuthurai - 609 001.
                </div>
                <div style={{fontSize: '9px', textAlign: 'center', margin: '2px 0'}}>
                  Mobile Receipt
                </div>
                
                <div style={{borderTop: '1px dashed #000', margin: '3px 0'}}></div>
                
                <div style={{fontSize: '9px', margin: '2px 0'}}>
                  Receipt No: {nextReceiptNo || '0001'}
                </div>
                <div style={{fontSize: '9px', margin: '2px 0'}}>
                  Date / Time: {new Date().toLocaleDateString('en-IN')}
                </div>
                <div style={{fontSize: '9px', margin: '2px 0'}}>
                  Member No: {formData.receiptDetails.memberNo}
                </div>
                <div style={{fontSize: '9px', margin: '2px 0'}}>
                  Member Name: {selectedCustomer?.name || 'Select Customer'}
                </div>
                <div style={{fontSize: '9px', margin: '2px 0'}}>
                  Due No: {formData.receiptDetails.dueNo}
                </div>
                <div style={{fontSize: '9px', margin: '2px 0', display: 'flex', justifyContent: 'space-between'}}>
                  <span>Due Amount:</span>
                  <span>{formData.receiptDetails.dueAmount.toLocaleString('en-IN')}</span>
                </div>
                <div style={{fontSize: '9px', margin: '2px 0', display: 'flex', justifyContent: 'space-between'}}>
                  <span>Arrear Amount:</span>
                  <span>{formData.receiptDetails.arrearAmount.toLocaleString('en-IN')}</span>
                </div>
                <div style={{fontSize: '9px', margin: '2px 0', display: 'flex', justifyContent: 'space-between'}}>
                  <span>Received Amount:</span>
                  <span>{formData.receiptDetails.receivedAmount.toLocaleString('en-IN')}</span>
                </div>
                <div style={{fontSize: '9px', margin: '2px 0', display: 'flex', justifyContent: 'space-between'}}>
                  <span>Balance Amount:</span>
                  <span>{formData.receiptDetails.balanceAmount.toLocaleString('en-IN')}</span>
                </div>
                
                <div style={{borderTop: '1px dashed #000', margin: '3px 0'}}></div>
                <div style={{fontSize: '9px', margin: '2px 0', display: 'flex', justifyContent: 'space-between'}}>
                  <span>Total Received Amount:</span>
                  <span>{formData.receiptDetails.receivedAmount.toLocaleString('en-IN')}</span>
                </div>
                <div style={{fontSize: '9px', margin: '2px 0', textAlign: 'left'}}>
                  By: {formData.receiptDetails.issuedBy}
                </div>
                <div style={{fontSize: '9px', margin: '2px 0', textAlign: 'left'}}>
                  For Any Enquiry: **
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="text-sm text-slate-600">
                  <p><strong>Payment Type:</strong> Chit Fund Payment</p>
                  <p><strong>Total:</strong> ₹{formatIndianNumber(formData.receivedAmount || formData.receiptDetails?.receivedAmount || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}