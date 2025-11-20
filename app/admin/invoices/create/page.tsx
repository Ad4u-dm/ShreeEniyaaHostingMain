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
  monthlyData?: Array<{
    monthNumber: number;
    dueAmount?: number;
    installmentAmount?: number;
    dividend: number;
    auctionAmount?: number;
    payableAmount?: number;
  }>;
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
  // Helper function to safely extract ID from potentially populated field
  const getId = (field: any) => typeof field === "object" && field ? field._id : field;

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
        // Return the balance and arrear amounts from the latest invoice
        return {
          balance: data.invoice?.balanceAmount || null,
          arrear: data.invoice?.arrearAmount || null
        };
      }
    } catch (error) {
      console.error('Error fetching previous balance:', error);
    }
    return { balance: null, arrear: null };
  };

  // Calculate balance amount: Previous balance - today's payment (or monthly due if no previous invoice)
  const calculateDailyBalance = (paymentMonth: string, todayPayment: number, monthlyAmount: number, previousBalance: number | null = null) => {
    // If we have previous balance from latest invoice, use it; otherwise start with monthly due
    const startingBalance = previousBalance !== null ? previousBalance : monthlyAmount;
    
    // Balance = Previous Balance - Today's Payment
    const balance = startingBalance - todayPayment;
    
    return Math.max(0, balance); // Balance cannot be negative
  };

  // Automated Chit Fund Payment Calculation
  const calculateChitFundPaymentDetails = async (customerId: string, planId: string, currentDate: Date = new Date()) => {
    try {
      // Get plan details with monthly data
      const selectedPlan = plans.find(p => p._id === planId);
      if (!selectedPlan || !selectedPlan.monthlyData) {
        console.error('Plan or monthly data not found');
        return null;
      }

      // Get customer enrollment to find start date
      const selectedCustomer = customers.find(c => c._id === customerId);
      const customerEnrollment = customerEnrollments.find(
        enrollment => enrollment.userId?.userId === selectedCustomer?.userId && enrollment.status === 'active'
      );

      if (!customerEnrollment) {
        console.error('Customer enrollment not found');
        return null;
      }

      const enrollmentDate = new Date(customerEnrollment.enrollmentDate || customerEnrollment.createdAt);
      const currentDay = currentDate.getDate();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      // Calculate which month we're in based on enrollment and current date
      let monthsElapsed = (currentYear - enrollmentDate.getFullYear()) * 12 + (currentMonth - enrollmentDate.getMonth());
      
      // If today is after the 20th, we're collecting for the current month
      // If today is before the 20th, we're still in the previous month's grace period
      if (currentDay > 20) {
        monthsElapsed += 1; // Move to next month after due date
      }

      // Ensure we don't exceed the plan duration
      monthsElapsed = Math.min(monthsElapsed, selectedPlan.monthlyData.length);
      
      // Current month index (0-based)
      const currentMonthIndex = Math.max(0, monthsElapsed - 1);
      const nextMonthIndex = Math.min(monthsElapsed, selectedPlan.monthlyData.length - 1);

      console.log('Payment calculation details:', {
        enrollmentDate,
        currentDate,
        currentDay,
        monthsElapsed,
        currentMonthIndex,
        nextMonthIndex,
        planDuration: selectedPlan.monthlyData.length
      });

      // Get payment history for this customer and plan
      const historyResponse = await fetch(`/api/invoices?customerId=${customerId}&planId=${planId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth-token')}` }
      });
      
      let paidMonths = [];
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        paidMonths = historyData.invoices || [];
      }

      // Get previous balance and arrears
      const previousData = await getPreviousBalance(customerId, planId);
      const previousBalance = previousData.balance || 0;
      const previousArrear = previousData.arrear || 0;
      let arrearAmount = 0;

      // On 21st of the month, arrears = previous balance
      // On other days, arrears = previous arrears
      if (currentDay === 21) {
        arrearAmount = previousBalance || 0;
        console.log(`On 21st: Arrears set to previous balance ₹${arrearAmount}`);
      } else {
        arrearAmount = previousArrear || 0;
        console.log(`On other days: Arrears carried over ₹${arrearAmount}`);
      }

      // Current month's due (if we're past the 20th, this is for next month)
      const currentMonthData = selectedPlan.monthlyData[currentDay > 20 ? nextMonthIndex : currentMonthIndex];
      const currentDueAmount = currentMonthData ? (currentMonthData.dueAmount || currentMonthData.installmentAmount || 0) : 0;

      // Total amount due = Arrears + current month's due
      const totalAmountDue = arrearAmount + currentDueAmount;

      return {
        currentDueAmount,
        arrearAmount,
        totalAmountDue,
        monthNumber: currentMonthIndex + 1,
        isAfterDueDate: currentDay > 20,
        dueDate: new Date(currentYear, currentMonth, 20),
        nextDueDate: new Date(currentYear, currentMonth + 1, 20)
      };

    } catch (error) {
      console.error('Error calculating chit fund payment details:', error);
      return null;
    }
  };

  const calculateChitFundAmounts = async (paymentMonth: string) => {
    if (!formData.customerId || !formData.planId) return;

    console.log('calculateChitFundAmounts:', {
      customerId: formData.customerId,
      planId: formData.planId,
      paymentMonth
    });

    try {
      // Use the new automated calculation
      const paymentDetails = await calculateChitFundPaymentDetails(
        formData.customerId, 
        formData.planId,
        new Date() // Use current date for automatic calculations
      );

      if (!paymentDetails) {
        console.error('Failed to calculate payment details');
        return;
      }

      console.log('Automated payment details:', paymentDetails);

      // Get previous balance from latest invoice
      const previousData = await getPreviousBalance(formData.customerId, formData.planId);
      const previousBalance = previousData.balance || 0;

      // Calculate daily due amount (for users who pay daily)
      const [year, month] = formData.receiptDetails.paymentMonth.split('-');
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      const dailyDue = Math.round(paymentDetails.currentDueAmount / daysInMonth);

      console.log('Balance calculation debug:', {
        paymentMonth: formData.receiptDetails.paymentMonth,
        currentDueAmount: paymentDetails.currentDueAmount,
        arrearAmount: paymentDetails.arrearAmount,
        daysInMonth,
        dailyDue,
        previousBalance
      });

        // Update form with calculated values (received amount defaults to daily due)
        setFormData(prev => {
          console.log('=== PRESERVING DUE NO IN CALCULATE AMOUNTS ===', {
            currentDueNo: prev.receiptDetails.dueNo,
            preservingDueNo: 'Not changing due number here - handled separately'
          });

          // Only update receivedAmount if it's currently 0 (initial load)
          // Don't overwrite user's manual input
          const shouldUpdateReceived = dailyDue > 0 && prev.receiptDetails.receivedAmount === 0;

          // Calculate balance based on current or new received amount
          const receivedAmount = shouldUpdateReceived ? dailyDue : prev.receiptDetails.receivedAmount;
          const totalDue = paymentDetails.currentDueAmount + paymentDetails.arrearAmount;
          const balanceAmount = Math.max(0, totalDue - receivedAmount);

          return {
            ...prev,
            receiptDetails: {
              ...prev.receiptDetails,
              // DON'T change dueNo here - it's handled separately by getNextDueNumber
              dueAmount: paymentDetails.currentDueAmount,
              arrearAmount: paymentDetails.arrearAmount,
              balanceAmount: balanceAmount,
              receivedAmount: receivedAmount,
              pendingAmount: balanceAmount
            },
            receivedAmount: receivedAmount
          };
        });
      } catch (error) {
        console.error('Error calculating chit fund amounts:', error);
      }
    };

  // Function to recalculate balance when received amount changes
  const handleReceivedAmountChange = async (newReceivedAmount: number) => {
    setFormData(prev => {
      // Pending Amount = Due Amount + Arrear Amount
      const pendingAmount = prev.receiptDetails.dueAmount + prev.receiptDetails.arrearAmount;

      // Balance Amount = Pending Amount - Received Amount
      const balanceAmount = Math.max(0, pendingAmount - newReceivedAmount);

      console.log('Balance recalculation:', {
        dueAmount: prev.receiptDetails.dueAmount,
        arrearAmount: prev.receiptDetails.arrearAmount,
        pendingAmount: pendingAmount,
        receivedAmount: newReceivedAmount,
        balanceAmount: balanceAmount
      });

      return {
        ...prev,
        receiptDetails: {
          ...prev.receiptDetails,
          receivedAmount: newReceivedAmount,
          pendingAmount: pendingAmount,
          balanceAmount: balanceAmount
        },
        receivedAmount: newReceivedAmount
      };
    });
  };

  // Calculate fixed due date (20th of current month, or next month if past 20th)
  const getFixedDueDate = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    
    // If we're past the 20th, due date is 20th of next month
    // Otherwise, due date is 20th of current month
    let dueMonth = currentDay > 20 ? currentMonth + 1 : currentMonth;
    let dueYear = currentYear;
    
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear += 1;
    }
    
    // Format as YYYY-MM-DD directly to avoid timezone issues
    const monthStr = (dueMonth + 1).toString().padStart(2, '0');
    const dayStr = '20';
    return `${dueYear}-${monthStr}-${dayStr}`;
  };

  const [formData, setFormData] = useState<InvoiceForm>({
    customerId: '',
    planId: '',
    description: '',
    dueDate: getFixedDueDate(),
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
  
  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Filter customers based on search (name or phone)
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone.toLowerCase().includes(customerSearch.toLowerCase())
  );

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

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.customer-search-container')) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper function to check if customer is enrolled in a specific plan
  const isCustomerEnrolled = (customerId: string, planId?: string) => {
    const selectedCustomer = customers.find(c => c._id === customerId);
    if (!selectedCustomer || !selectedCustomer.userId) return false;

    return customerEnrollments.some(enrollment => {
      const userMatch = enrollment.userId?.userId === selectedCustomer.userId;
      const statusMatch = enrollment.status === 'active';
      
      // Handle planId comparison - enrollment.planId can be string or populated object
      let planMatch = true;
      if (planId) {
        const enrollmentPlanId = typeof enrollment.planId === 'object' ? 
          enrollment.planId?._id : enrollment.planId;
        planMatch = enrollmentPlanId === planId;
      }
      
      console.log('Enrollment check:', {
        userMatch,
        statusMatch,
        planMatch,
        enrollmentUserId: enrollment.userId?.userId,
        customerUserId: selectedCustomer.userId,
        enrollmentPlanId: typeof enrollment.planId === 'object' ? enrollment.planId?._id : enrollment.planId,
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

  // Debug form state changes for receivedAmount
  useEffect(() => {
    console.log('=== FORM DATA RECEIVED AMOUNTS ===', {
      'formData.receivedAmount': formData.receivedAmount,
      'formData.receiptDetails.receivedAmount': formData.receiptDetails.receivedAmount,
      timestamp: new Date().toISOString()
    });
  }, [formData.receivedAmount, formData.receiptDetails.receivedAmount]);

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
        
        // Don't auto-populate plan - let handleCustomerChange handle it
        if (data.customer.currentEnrollment) {
          setFormData(prev => ({
            ...prev,
            receiptDetails: {
              ...prev.receiptDetails,
              memberNo: data.customer.memberNumber || data.customer.currentEnrollment.memberNumber || '2154',
              // Don't set amounts here - let calculateChitFundAmounts handle it
              pendingAmount: data.customer.paymentSummary?.pendingAmount || 0,
              arrearAmount: data.customer.paymentSummary?.arrearAmount || 0
            }
          }));
        } else {
          // Reset form if no enrollment
          setFormData(prev => ({
            ...prev,
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

  // Function to get next due number for customer based on payment history
  const getNextDueNumber = async (customerId: string, planId: string) => {
    console.log('=== GETTING NEXT DUE NUMBER ===', { customerId, planId });
    try {
      const apiUrl = `/api/invoices?customerId=${customerId}&planId=${planId}`;
      console.log('API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      });
      
      console.log('API Response status:', response.status, response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response data:', data);
        
        // Use the nextDueNumber directly from API response
        const nextDueNumber = data.nextDueNumber || data.paymentCount + 1 || 1;
        
        console.log('=== DUE NUMBER CALCULATION ===', {
          directNextDueNumber: data.nextDueNumber,
          fallbackPaymentCount: data.paymentCount,
          finalNextDueNumber: nextDueNumber
        });
        
        return nextDueNumber;
      } else {
        console.error('API Response error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching payment history for due number:', error);
    }
    
    // Default to 1 if no history found or error
    console.log('=== DEFAULTING TO DUE NUMBER 1 ===');
    return 1;
  };

  const handleCustomerChange = async (customerId: string) => {
    // Find customer's active enrollment
    const selectedCustomer = customers.find(c => c._id === customerId);
    console.log('Selected customer:', selectedCustomer);
    console.log('All customer enrollments:', customerEnrollments);
    
    // Update search field to show selected customer
    if (selectedCustomer) {
      setCustomerSearch(`${selectedCustomer.name} - ${selectedCustomer.phone}`);
    }
    
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
      planId: enrollmentPlanId // Auto-select plan if customer has enrollment
    }));
    
    // Don't automatically set due number - let user select plan manually first
    
    // Fetch comprehensive customer profile which will auto-populate more fields
    await fetchCustomerProfile(customerId);
    
    // If customer has an enrollment, auto-populate plan and receipt details
    if (customerEnrollment && Array.isArray(plans)) {
      const enrollmentPlanIdStr = typeof customerEnrollment.planId === 'string' ? 
        customerEnrollment.planId : 
        customerEnrollment.planId?._id || '';
        
      const selectedPlan = plans.find(p => p._id === enrollmentPlanIdStr);
      if (selectedPlan) {
        // Don't set initial amounts here - let calculateChitFundAmounts handle it properly
        // The useEffect will trigger calculateChitFundAmounts when planId is set
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
        
        if (getId(activeEnrollment.planId) === formData.planId) {
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
          monthlyAmount: selectedPlan.monthlyAmount && selectedPlan.monthlyAmount > 0
            ? selectedPlan.monthlyAmount
            : (selectedPlan.monthlyData?.[0]?.dueAmount || selectedPlan.monthlyData?.[0]?.installmentAmount || 0),
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
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="outline" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 leading-tight">Create Invoice</h1>
            <p className="text-slate-600 text-sm sm:text-base mt-1">Generate a new invoice for Chit Fund payment</p>
          </div>
        </div>

        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Button 
            onClick={() => handleSave('draft')}
            variant="outline"
            disabled={loading}
            className="flex items-center justify-center gap-2 text-xs sm:text-sm py-2 px-3 sm:px-4"
            size="sm"
          >
            <Save className="h-3 w-3 sm:h-4 sm:w-4" />
            Save Draft
          </Button>
          <Button 
            onClick={() => handleSave('sent')}
            disabled={loading || !formData.customerId}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm py-2 px-3 sm:px-4"
            size="sm"
          >
            <Send className="h-3 w-3 sm:h-4 sm:w-4" />
            Create & Send
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Invoice Form */}
        <div className="xl:col-span-2 space-y-4 sm:space-y-6">
          {/* Customer & Plan Selection */}
          <Card>
            <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
              <CardTitle className="text-lg sm:text-xl">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Customer *
                  </label>
                  <div className="relative customer-search-container">
                    <input
                      type="text"
                      placeholder="Search customer by name or phone..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      className="w-full p-2 border rounded-md"
                    />
                    {showCustomerDropdown && customerSearch && filteredCustomers.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredCustomers.map((customer) => (
                          <div
                            key={customer._id}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, customerId: customer._id }));
                              setCustomerSearch(`${customer.name} - ${customer.phone}`);
                              setShowCustomerDropdown(false);
                              handleCustomerChange(customer._id);
                            }}
                          >
                            {customer.name} - {customer.phone}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.customerId && !isCustomerEnrolled(formData.customerId) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-2">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-amber-800">
                            Customer Not Enrolled
                          </h3>
                          <div className="mt-2 text-sm text-amber-700">
                            <p>This customer is not enrolled in any chit fund plan. Please select a plan and click "Enroll Customer" to enroll them, or select a different customer who is already enrolled.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Plan
                  </label>
                  <div className="flex gap-2">
                    <Select value={formData.planId} onValueChange={async (value) => {
                      const newFormData = { ...formData, planId: value };
                      setFormData(newFormData);
                      
                      // Update due number when plan changes
                      if (formData.customerId && value) {
                        const nextDueNumber = await getNextDueNumber(formData.customerId, value);
                        setFormData(prev => ({
                          ...prev,
                          planId: value,
                          receiptDetails: {
                            ...prev.receiptDetails,
                            dueNo: nextDueNumber.toString()
                          }
                        }));
                      }
                      
                      // Trigger calculation when plan changes
                      setTimeout(() => {
                        calculateChitFundAmounts(newFormData.receiptDetails.paymentMonth || new Date().toISOString().slice(0, 7));
                      }, 100);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(plans) && plans.filter(plan => {
                          const monthly = plan.monthlyAmount || plan.monthlyData?.[0]?.dueAmount || plan.monthlyData?.[0]?.installmentAmount || 0;
                          return monthly > 0;
                        }).map((plan) => {
                          const monthly = plan.monthlyAmount || plan.monthlyData?.[0]?.dueAmount || plan.monthlyData?.[0]?.installmentAmount || 0;
                          return (
                            <SelectItem key={plan._id} value={plan._id}>
                              {plan.planName} - ₹{formatIndianNumber(monthly)}
                            </SelectItem>
                          );
                        })}
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
                    readOnly
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Due date is fixed to the 20th of every month
                  </p>
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
                    Due Amount (Monthly)
                  </label>
                  <Input
                    type="number"
                    value={formData.receiptDetails.dueAmount}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      setFormData(prev => {
                        const newDueAmount = amount;
                        const pendingAmount = newDueAmount + prev.receiptDetails.arrearAmount;
                        const balanceAmount = Math.max(0, pendingAmount - prev.receiptDetails.receivedAmount);
                        return {
                          ...prev,
                          receiptDetails: {
                            ...prev.receiptDetails,
                            dueAmount: newDueAmount,
                            pendingAmount: pendingAmount,
                            balanceAmount: balanceAmount
                          }
                        };
                      });
                    }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Arrear Amount (Last Month Pending)
                  </label>
                  <Input
                    type="number"
                    value={formData.receiptDetails.arrearAmount}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      setFormData(prev => {
                        const newArrearAmount = amount;
                        const pendingAmount = prev.receiptDetails.dueAmount + newArrearAmount;
                        const balanceAmount = Math.max(0, pendingAmount - prev.receiptDetails.receivedAmount);
                        return {
                          ...prev,
                          receiptDetails: {
                            ...prev.receiptDetails,
                            arrearAmount: newArrearAmount,
                            pendingAmount: pendingAmount,
                            balanceAmount: balanceAmount
                          }
                        };
                      });
                    }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Received Amount (Today)
                  </label>
                  <Input
                    type="number"
                    value={formData.receiptDetails.receivedAmount}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      console.log('Receipt Details receivedAmount changed to:', amount);
                      handleReceivedAmountChange(amount);
                    }}
                    placeholder="Enter received amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Balance Amount (Auto-calculated)
                  </label>
                  <Input
                    type="number"
                    value={formData.receiptDetails.balanceAmount}
                    readOnly
                    className="bg-green-50 border-green-200 cursor-not-allowed font-semibold"
                    placeholder="0"
                  />
                  <p className="text-xs text-slate-500 mt-1">(Due + Arrear) - Received</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      handleReceivedAmountChange(amount);
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
        <div className="xl:col-span-1 order-first xl:order-last">
          <Card className="xl:sticky xl:top-6">
            <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
              <CardTitle className="text-lg sm:text-xl">Live Receipt Preview</CardTitle>
              <CardDescription className="text-sm">Real-time thermal receipt preview</CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="bg-white border-2 border-dashed border-slate-200 p-2 sm:p-4 font-mono text-xs overflow-x-auto">
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
                  Group Name: {plans.find(p => p._id === formData.planId)?.planName || 'Select Plan'}
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
              
              <div className="mt-4 space-y-3">
                <div className="text-sm text-slate-600">
                  <p><strong>Payment Type:</strong> Chit Fund Payment</p>
                  <p><strong>Total:</strong> ₹{formatIndianNumber(formData.receivedAmount || formData.receiptDetails?.receivedAmount || 0)}</p>
                </div>
                
                <div className="pt-2 border-t border-slate-200">
                  <Button 
                    onClick={() => {
                      // Create a preview print of the receipt using current form data
                      const printContent = `
                        <div style="width: 80mm; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; padding: 8px;">
                          <div style="text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 3px;">SHREE ENIYAA CHITFUNDS (P) LTD.</div>
                          <div style="text-align: center; font-size: 11px; margin-bottom: 4px;">Shop no. 2, Mahadhana Street,<br/>Mayiladuthurai – 609 001.</div>
                          <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
                          <div style="font-size: 11px; margin: 3px 0; display: flex; justify-content: space-between;"><span>Receipt No:</span><span>${nextReceiptNo || '0001'}</span></div>
                          <div style="font-size: 11px; margin: 3px 0; display: flex; justify-content: space-between;"><span>Date:</span><span>${new Date().toLocaleDateString('en-IN')}</span></div>
                          <div style="font-size: 11px; margin: 3px 0; display: flex; justify-content: space-between;"><span>Member No:</span><span>${formData.receiptDetails.memberNo}</span></div>
                          <div style="font-size: 11px; margin: 3px 0; display: flex; justify-content: space-between;"><span>Member Name:</span><span>${selectedCustomer?.name || 'Select Customer'}</span></div>
                          <div style="font-size: 11px; margin: 3px 0; display: flex; justify-content: space-between;"><span>Due No:</span><span>${formData.receiptDetails.dueNo}</span></div>
                          <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
                          <div style="font-size: 11px; margin: 2px 0; display: flex; justify-content: space-between;"><span>Due Amount:</span><span>₹${formData.receiptDetails.dueAmount.toLocaleString('en-IN')}</span></div>
                          <div style="font-size: 11px; margin: 2px 0; display: flex; justify-content: space-between;"><span>Arrear Amount:</span><span>₹${formData.receiptDetails.arrearAmount.toLocaleString('en-IN')}</span></div>
                          <div style="font-size: 11px; margin: 2px 0; display: flex; justify-content: space-between;"><span>Received Amount:</span><span>₹${formData.receiptDetails.receivedAmount.toLocaleString('en-IN')}</span></div>
                          <div style="font-size: 11px; margin: 2px 0; display: flex; justify-content: space-between;"><span>Balance Amount:</span><span>₹${formData.receiptDetails.balanceAmount.toLocaleString('en-IN')}</span></div>
                          <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>
                          <div style="font-size: 11px; margin: 2px 0; display: flex; justify-content: space-between; font-weight: 600;"><span>Total Received:</span><span>₹${formData.receiptDetails.receivedAmount.toLocaleString('en-IN')}</span></div>
                          <div style="font-size: 11px; margin: 3px 0;">By: ${formData.receiptDetails.issuedBy}</div>
                          <div style="font-size: 9px; margin: 3px 0; text-align: center;">For Any Enquiry: **</div>
                        </div>
                      `;
                      
                      const printWindow = window.open('', '_blank', 'width=400,height=600');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Thermal Receipt Preview</title>
                              <style>
                                @media print {
                                  @page { size: 80mm auto; margin: 0; }
                                  body { margin: 0; padding: 0; }
                                }
                              </style>
                            </head>
                            <body onload="window.print(); window.close();">
                              ${printContent}
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs"
                    disabled={!formData.customerId || !selectedCustomer}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview Print (80mm)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}