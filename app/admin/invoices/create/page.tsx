'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Send, Eye, XCircle, Edit, RefreshCw } from 'lucide-react';
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
  // enrollmentId: NOT needed - backend finds/creates automatically from customerId + planId
  planId: string;
  description: string;
  dueDate: string;
  invoiceDate?: string;
  // REMOVED: paymentTerms: string;
  notes: string;
  template: number;
  receivedAmount?: number;
  receiptDetails: {
    memberNo: string;
    dueNo: string; // READ-ONLY - calculated by backend
    paymentMonth: string; // READ-ONLY - calculated by backend
    dueAmount: number; // READ-ONLY - calculated by backend
    arrearAmount: number; // READ-ONLY - calculated by backend
    pendingAmount: number; // READ-ONLY - calculated by backend
    receivedAmount: number;
    balanceAmount: number; // READ-ONLY - calculated by backend
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
  const [enrollmentsLoaded, setEnrollmentsLoaded] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [clearingArrear, setClearingArrear] = useState(false);
  const [isEditingArrear, setIsEditingArrear] = useState(false);
  const [manualArrearConfirmed, setManualArrearConfirmed] = useState(false);
  const [fetchingArrear, setFetchingArrear] = useState(false);

  // Get previous balance from the latest invoice for the customer
  const getPreviousBalance = async (customerId: string, planId: string) => {
    try {
      const response = await fetch(`/api/invoices?customerId=${customerId}&planId=${planId}&latest=true`);
      if (response.ok) {
        const data = await response.json();
        // Return the balance and arrear amounts from the latest invoice
        return {
          invoice: data.invoice || null,
          balance: data.invoice?.balanceAmount || null,
          arrear: data.invoice?.arrearAmount || null
        };
      }
    } catch (error) {
      console.error('Error fetching previous balance:', error);
    }
    return { invoice: null, balance: null, arrear: null };
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
  // Always use installmentAmount for due
  const currentDueAmount = currentMonthData ? (currentMonthData.installmentAmount ?? 0) : 0;

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

      // Get previous balance and arrear from latest invoice
      const previousData = await getPreviousBalance(formData.customerId, formData.planId);
  // Fix: Use previousData.invoice == null for first invoice detection
  const hasPreviousInvoice = !!previousData.invoice;
  const previousBalance = hasPreviousInvoice ? previousData.balance || 0 : 0;
  const previousArrear = hasPreviousInvoice ? previousData.arrear || 0 : 0;

      // Calculate daily due amount (for users who pay daily)
      const [year, month] = formData.receiptDetails.paymentMonth.split('-');
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      const dailyDue = Math.round(paymentDetails.currentDueAmount / daysInMonth);

      const today = new Date();
      const is21st = today.getDate() === 21;
      let arrearAmount = 0;
      let balanceAmount = 0;
      let pendingAmount = 0;
      const receivedAmount = 0; // Start at 0, user will enter manually
      if (!hasPreviousInvoice) {
  // First invoice logic
  arrearAmount = 0;
  pendingAmount = paymentDetails.currentDueAmount;
  balanceAmount = paymentDetails.currentDueAmount; // Full amount pending when received = 0
      } else if (is21st) {
        arrearAmount = previousBalance;
        pendingAmount = paymentDetails.currentDueAmount + arrearAmount;
        balanceAmount = pendingAmount; // Full pending amount when received = 0
      } else {
        arrearAmount = previousArrear;
        pendingAmount = previousBalance;
        balanceAmount = previousBalance; // Full previous balance when received = 0
      }
      setFormData(prev => ({
        ...prev,
        receiptDetails: {
          ...prev.receiptDetails,
          dueAmount: paymentDetails.currentDueAmount,
          arrearAmount: arrearAmount,
          balanceAmount: balanceAmount,
          receivedAmount: receivedAmount,
          pendingAmount: pendingAmount
        },
        receivedAmount: receivedAmount
      }));
      } catch (error) {
        console.error('Error calculating chit fund amounts:', error);
      }
    };

  // Function to recalculate balance when received amount changes
  const handleReceivedAmountChange = async (newReceivedAmount: number) => {
    // Update the received amount and trigger the preview calculation
    setFormData(prev => ({
      ...prev,
      receiptDetails: {
        ...prev.receiptDetails,
        receivedAmount: newReceivedAmount
      },
      receivedAmount: newReceivedAmount
    }));
    // The useEffect will automatically fetch updated preview
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
    // enrollmentId: NOT needed - backend auto-finds/creates from customerId + planId
    planId: '',
    description: '',
    dueDate: getFixedDueDate(),
    // REMOVED: paymentTerms: '30 days',
    notes: 'Thank you for your business!',
    template: 1,
    receivedAmount: 0,
    receiptDetails: {
      memberNo: '',
      dueNo: '1', // Will be calculated by backend
      paymentMonth: new Date().toISOString().slice(0, 7), // Will be calculated by backend
      dueAmount: 0, // Will be calculated by backend
      arrearAmount: 0, // Will be calculated by backend
      pendingAmount: 0, // Will be calculated by backend
      receivedAmount: 0,
      balanceAmount: 0, // Will be calculated by backend
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

  // Auto-fetch invoice preview when customer, plan, or received amount changes
  useEffect(() => {
    if (formData.customerId && formData.planId) {
      fetchInvoicePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.customerId, formData.planId, formData.receivedAmount, formData.receiptDetails?.receivedAmount]);

  // Helper function to check if customer is enrolled in a specific plan
  const isCustomerEnrolled = (customerId: string, planId?: string) => {
    const selectedCustomer = customers.find(c => c._id === customerId);
    if (!selectedCustomer) {
      console.log('isCustomerEnrolled: Customer not found', customerId);
      return false;
    }

    const hasEnrollment = customerEnrollments.some(enrollment => {
      // Get the userId - prefer userIdString (original string) if available
      let enrollmentUserId: string | undefined;
      
      if (enrollment.userIdString) {
        // Use the preserved original userId string from API
        enrollmentUserId = enrollment.userIdString;
      } else if (typeof enrollment.userId === 'object' && enrollment.userId) {
        // If it's a populated user object, get the userId or _id field
        enrollmentUserId = enrollment.userId.userId || enrollment.userId._id;
      } else if (typeof enrollment.userId === 'string') {
        // If it's a string, use it directly
        enrollmentUserId = enrollment.userId;
      }

      // Check if enrollment matches customer by userId or _id
      // Compare all possible combinations
      const userMatch = !!(
        enrollmentUserId && (
          enrollmentUserId === selectedCustomer.userId ||
          enrollmentUserId === selectedCustomer._id
        )
      );
      
      const statusMatch = enrollment.status === 'active';

      // Handle planId comparison - enrollment.planId can be string or populated object
      let planMatch = true;
      if (planId) {
        const enrollmentPlanId = typeof enrollment.planId === 'object' ?
          enrollment.planId?._id : enrollment.planId;
        planMatch = enrollmentPlanId === planId;
      }

      const matches = userMatch && statusMatch && planMatch;

      console.log('Enrollment check:', {
        matches,
        userMatch,
        statusMatch,
        planMatch,
        enrollmentUserId,
        hasUserIdString: !!enrollment.userIdString,
        enrollmentUserIdType: typeof enrollment.userId,
        selectedCustomerUserId: selectedCustomer.userId,
        selectedCustomerId: selectedCustomer._id,
        enrollmentPlanId: typeof enrollment.planId === 'object' ? enrollment.planId?._id : enrollment.planId,
        formPlanId: planId,
        enrollmentStatus: enrollment.status
      });

      return matches;
    });

    console.log('isCustomerEnrolled result:', {
      customerId,
      selectedCustomer,
      hasEnrollment,
      totalEnrollments: customerEnrollments.length
    });

    return hasEnrollment;
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
    
    if (formData.customerId && planIdStr && plans.length > 0 && !isEditingArrear) {
      console.log('Auto-calculating amounts for customer:', formData.customerId, 'plan:', planIdStr);
      calculateChitFundAmounts(formData.receiptDetails.paymentMonth || new Date().toISOString().slice(0, 7));
    }
  }, [formData.customerId, typeof formData.planId === 'string' ? formData.planId : (formData.planId as any)?._id, plans.length, isEditingArrear]);

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

      // Fetch all users without pagination limit
      const response = await fetch('/api/users?role=user&limit=1000', { headers });
      
      if (response.ok) {
        const data = await response.json();
        const mappedCustomers = data.users?.map((c: any) => ({
          _id: c._id,
          userId: c.userId,
          name: c.name,
          email: c.email,
          phone: c.phone
        })) || [];
        console.log('👥 Fetched customers:', mappedCustomers.length);
        console.log('👥 Sample customer:', mappedCustomers[0]);
        setCustomers(mappedCustomers);
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
        setEnrollmentsLoaded(true);
        return;
      }
      
      // Fetch ALL enrollments (no pagination limit) for invoice creation
      const response = await fetch('/api/enrollments?limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Fetched enrollments:', data.enrollments);
        console.log('📋 Total enrollments:', data.enrollments?.length || 0);
        if (data.enrollments && data.enrollments.length > 0) {
          console.log('📋 Sample enrollment:', data.enrollments[0]);
        }
        setCustomerEnrollments(data.enrollments || []);
        setEnrollmentsLoaded(true);
      } else {
        console.error('Failed to fetch enrollments:', response.status, response.statusText);
        if (response.status === 401) {
          console.warn('Unauthorized - may need to login again');
        }
        setCustomerEnrollments([]);
        setEnrollmentsLoaded(true);
      }
    } catch (error) {
      console.error('Failed to fetch enrollments:', error);
      setCustomerEnrollments([]);
      setEnrollmentsLoaded(true);
    }
  };

  const fetchCustomerProfile = async (customerId: string) => {
    // This function is now integrated into handleCustomerChange
    // Keeping it for backward compatibility but it doesn't update form data
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
        console.log('Active enrollment:', data.customer?.activeEnrollment);
        console.log('Payment summary:', data.customer?.paymentSummary);
        console.log('Member number:', data.customer?.memberNumber);
        console.log('Credit score:', data.customer?.creditScore);
        setSelectedCustomerProfile(data.customer);
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

    // Update search field to show selected customer
    if (selectedCustomer) {
      setCustomerSearch(`${selectedCustomer.name} - ${selectedCustomer.phone}`);
    }

    // Update form data with customer ID first
    setFormData(prev => ({
      ...prev,
      customerId,
      // Don't set planId yet - wait for profile to load
    }));

    // Fetch user profile from User API to get memberNumber
    setLoadingProfile(true);
    try {
      const response = await fetch(`/api/users/${customerId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedCustomerProfile(data.user);
        // Set member number from user profile
        setFormData(prev => ({
          ...prev,
          receiptDetails: {
            ...prev.receiptDetails,
            memberNo: data.user.memberNumber || ''
          }
        }));
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    } finally {
      setLoadingProfile(false);
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

  // Fetch calculated invoice preview from backend
  const fetchInvoicePreview = async () => {
    if (!formData.customerId || !formData.planId) {
      console.log('Missing customer or plan for preview');
      return;
    }

    const selectedCustomer = customers.find(c => c._id === formData.customerId);
    const selectedPlan = plans.find(p => p._id === formData.planId);
    
    if (!selectedCustomer || !selectedPlan) return;

    try {
      const customerIdToSend = selectedCustomer.userId || formData.customerId;
      const receivedAmount = formData.receivedAmount || formData.receiptDetails?.receivedAmount || 0;
      // Always use TODAY's date for invoice calculation (not the due date)
      const invoiceDate = new Date().toISOString().split('T')[0];
      
      console.log('🎯 INVOICE DATE FOR PREVIEW:', {
        today: new Date().toISOString(),
        invoiceDateUsed: invoiceDate,
        formDataInvoiceDate: formData.invoiceDate
      });
      
      // Use backend preview API - single source of truth
      const previewRes = await fetch(
        `/api/invoices/preview?customerId=${customerIdToSend}&planId=${formData.planId}&receivedAmount=${receivedAmount}&invoiceDate=${invoiceDate}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        }
      );

      if (previewRes.ok) {
        const previewData = await previewRes.json();
        
        if (previewData.success && previewData.preview) {
          const { dueNumber, dueAmount, arrearAmount, balanceAmount } = previewData.preview;
          
          // Update form with backend-calculated values
          // BUT preserve manual arrear if user is editing it
          setFormData(prev => ({
            ...prev,
            receiptDetails: {
              ...prev.receiptDetails,
              dueNo: dueNumber.toString(),
              dueAmount: dueAmount,
              arrearAmount: isEditingArrear ? prev.receiptDetails.arrearAmount : arrearAmount,
              receivedAmount: receivedAmount,
              balanceAmount: balanceAmount
            }
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch invoice preview:', error);
    }
  };

  // Clear arrear amount for selected enrollment
  const handleClearArrear = async () => {
    if (!formData.customerId || !formData.planId) {
      alert('Please select a customer and plan first');
      return;
    }

    if (!confirm('Are you sure you want to clear the arrear amount for this enrollment?')) {
      return;
    }

    setClearingArrear(true);
    try {
      const selectedCustomer = customers.find(c => c._id === formData.customerId);
      const customerIdToSend = selectedCustomer?.userId || formData.customerId;

      const response = await fetch('/api/enrollments/clear-arrear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          customerId: customerIdToSend,
          planId: formData.planId
        })
      });

      if (response.ok) {
        // Add a small delay to ensure DB write is complete
        await new Promise(resolve => setTimeout(resolve, 300));
        // Refresh the preview to show updated values
        await fetchInvoicePreview();
        alert('Arrear cleared successfully! Preview has been updated.');
      } else {
        const errorData = await response.json();
        alert(`Failed to clear arrear: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error clearing arrear:', error);
      alert('Failed to clear arrear');
    } finally {
      setClearingArrear(false);
    }
  };

  // Fetch previous arrear from last invoice
  const handleFetchPreviousArrear = async () => {
    if (!formData.customerId || !formData.planId) {
      alert('Please select a customer and plan first');
      return;
    }

    setFetchingArrear(true);
    try {
      const selectedCustomer = customers.find(c => c._id === formData.customerId);
      const customerIdToSend = selectedCustomer?.userId || formData.customerId;

      // Step 1: Clear the arrearLastUpdated timestamp from enrollment
      // This ensures the system won't use the manual override anymore
      await fetch('/api/enrollments/clear-arrear-timestamp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          customerId: customerIdToSend,
          planId: formData.planId
        })
      });

      // Step 2: Fetch the latest invoice to get the arrear
      const response = await fetch(
        `/api/admin/invoices?customerId=${customerIdToSend}&planId=${formData.planId}&limit=1&sortBy=createdAt&sortOrder=desc`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.invoices && data.invoices.length > 0) {
          const latestInvoice = data.invoices[0];
          const previousArrear = latestInvoice.arrearAmount || 0;
          
          // Step 3: Set editing mode and update the arrear amount with the previous invoice's arrear
          setIsEditingArrear(true);
          setManualArrearConfirmed(true);
          
          setFormData(prev => {
            const dueAmount = prev.receiptDetails.dueAmount || 0;
            const receivedAmount = prev.receiptDetails.receivedAmount || 0;
            const newBalance = (dueAmount + previousArrear) - receivedAmount;
            
            return {
              ...prev,
              receiptDetails: {
                ...prev.receiptDetails,
                arrearAmount: previousArrear,
                balanceAmount: newBalance
              }
            };
          });
          
          alert(`Previous invoice arrear fetched successfully: ₹${previousArrear.toLocaleString('en-IN')}\n\nFrom Invoice: ${latestInvoice.invoiceNumber || latestInvoice.receiptNo || 'N/A'}`);
        } else {
          alert('No previous invoice found for this customer and plan.');
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to fetch previous arrear: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching previous arrear:', error);
      alert('Failed to fetch previous arrear');
    } finally {
      setFetchingArrear(false);
    }
  };

  // Handle manual arrear amount editing
  const handleArrearAmountChange = (newArrearAmount: number) => {
    // First time editing - show confirmation
    if (!manualArrearConfirmed && !isEditingArrear) {
      const confirmed = confirm(
        '⚠️ WARNING: You are about to manually modify the arrear amount.\n\n' +
        'This will override the automatically calculated arrear from previous invoices.\n\n' +
        'Are you sure you want to proceed?'
      );
      
      if (!confirmed) {
        return; // User cancelled, don't change the value
      }
      
      setManualArrearConfirmed(true);
      setIsEditingArrear(true);
    }
    
    // Update the arrear amount
    setFormData(prev => ({
      ...prev,
      receiptDetails: {
        ...prev.receiptDetails,
        arrearAmount: newArrearAmount
      }
    }));
  };



  const handleSave = async (status: 'draft' | 'sent') => {
    setLoading(true);
    const authToken = localStorage.getItem('auth-token');
    try {
      // Get selected customer and plan data
  // Always use custom userId for backend queries
  const selectedCustomer = customers.find(c => c._id === formData.customerId);
  const customerIdToSend = selectedCustomer?.userId || formData.customerId;
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

      // NOTE: enrollmentId is NO LONGER required from frontend
      // Backend will auto-find or auto-create enrollment based on customerId + planId
      // This simplifies the admin workflow to just: Customer + Plan selection

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

      // Backend will now calculate: dueNumber, dueAmount, arrearAmount, balanceAmount, paymentMonth
      // Backend will also auto-find/create enrollmentId from customerId + planId
      const invoiceData = {
        // Required fields (NO enrollmentId - backend handles it!)
        customerId: customerIdToSend,
        planId: formData.planId,
        createdBy: currentUserId,

        // Invoice date for dueNumber calculation (defaults to now if not provided)
        invoiceDate: new Date().toISOString(),

        // Received amount (what customer paid)
        receivedAmount: total,

        // Manual balance amount (if user edited it, send it to backend)
        manualBalanceAmount: formData.receiptDetails.balanceAmount,
        
        // Manual arrear amount (if user edited it, send it to backend)
        manualArrearAmount: isEditingArrear ? formData.receiptDetails.arrearAmount : undefined,

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
          planName: selectedPlan.planName
        },

        // Single payment item (backend will update amount if needed)
        items: [paymentItem],

        // Receipt fields (for display/printing - backend will recalculate)
        receiptNo: nextReceiptNo,
        memberNumber: formData.receiptDetails.memberNo,
        memberName: selectedCustomer.name,
        issuedBy: formData.receiptDetails.issuedBy,

        // Other fields
        status,
        dueDate: new Date(formData.dueDate),
        description: formData.description || `Payment for ${selectedPlan.planName}`,
        notes: formData.notes,
        template: formData.template

        // REMOVED: enrollmentId (backend auto-finds/creates from customerId + planId)
        // REMOVED: paymentTerms (per requirements)
        // REMOVED: dueNumber (backend calculates)
        // REMOVED: dueAmount (backend calculates from plan.monthlyAmount[dueNumber-1])
        // REMOVED: arrearAmount (backend calculates from previous invoice)
        // REMOVED: balanceAmount (backend calculates)
        // REMOVED: paymentMonth (backend calculates from invoiceDate)
        // REMOVED: totalAmount (backend calculates)
        // REMOVED: pendingAmount (backend calculates)
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

      if (response.ok) {
        const backendInvoice = result.invoice;
        console.log('🔍 Backend Invoice Response:', {
          dueAmount: backendInvoice.dueAmount,
          arrearAmount: backendInvoice.arrearAmount,
          receivedAmount: backendInvoice.receivedAmount,
          balanceAmount: backendInvoice.balanceAmount,
          pendingAmount: backendInvoice.pendingAmount,
          totalAmount: backendInvoice.totalAmount,
          subtotal: backendInvoice.subtotal
        });
        setFormData(prev => ({
          ...prev,
          receiptDetails: {
            ...prev.receiptDetails,
            balanceAmount: backendInvoice.balanceAmount,
            dueAmount: backendInvoice.dueAmount,
            arrearAmount: backendInvoice.arrearAmount,
            receivedAmount: backendInvoice.receivedAmount,
            pendingAmount: backendInvoice.pendingAmount,
          }
        }));
        // Store the created invoice and show success modal
        setCreatedInvoice(backendInvoice);
        setShowSuccessModal(true);
        generateNextReceiptNumber();
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
                  {formData.customerId && enrollmentsLoaded && !isCustomerEnrolled(formData.customerId) && (
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
                      // Update plan ID first
                      setFormData(prev => ({ ...prev, planId: value }));

                      // Fetch member number and due number when both customer and plan are selected
                      if (formData.customerId && value) {
                        try {
                          // Find enrollment for this customer and plan
                          const response = await fetch(`/api/enrollments?userId=${formData.customerId}&planId=${value}`, {
                            headers: {
                              'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
                            }
                          });

                          let memberNumber = formData.receiptDetails.memberNo;
                          if (response.ok) {
                            const data = await response.json();
                            console.log('=== FETCHING MEMBER NUMBER FROM ENROLLMENT ===');
                            console.log('Enrollment API response:', data);

                            if (data.enrollments && data.enrollments.length > 0) {
                              const enrollment = data.enrollments[0];
                              if (enrollment.memberNumber) {
                                memberNumber = enrollment.memberNumber;
                                console.log('Found member number from enrollment:', memberNumber);
                              }
                            } else {
                              console.log('No enrollments found for this customer and plan, preserving member number from user profile');
                            }
                          }

                          // Get next due number
                          const nextDueNumber = await getNextDueNumber(formData.customerId, value);
                          console.log('Next due number:', nextDueNumber);

                          // Update form with both member number and due number
                          setFormData(prev => ({
                            ...prev,
                            planId: value,
                            receiptDetails: {
                              ...prev.receiptDetails,
                              memberNo: memberNumber,
                              dueNo: nextDueNumber.toString()
                            }
                          }));
                        } catch (error) {
                          console.error('Failed to fetch enrollment data:', error);
                        }
                      }

                      // Trigger calculation when plan changes
                      setTimeout(() => {
                        const paymentMonth = formData.receiptDetails.paymentMonth || new Date().toISOString().slice(0, 7);
                        calculateChitFundAmounts(paymentMonth);
                      }, 100);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(plans) && plans.filter(plan => {
                          // Check if plan has monthlyData or monthlyAmount array
                          const hasMonthlyData = plan.monthlyData && plan.monthlyData.length > 0;
                          const hasMonthlyAmount = Array.isArray(plan.monthlyAmount) && plan.monthlyAmount.length > 0;
                          return hasMonthlyData || hasMonthlyAmount;
                        }).map((plan) => {
                          // Get first month's amount for display
                          const monthly = Array.isArray(plan.monthlyAmount)
                            ? plan.monthlyAmount[0]
                            : (plan.monthlyData?.[0]?.payableAmount || plan.monthlyData?.[0]?.installmentAmount || 0);
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

                {/* REMOVED: Payment Terms field per requirements */}
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
                    Member No <span className="text-xs text-green-600">(Fetched from enrollment)</span>
                  </label>
                  <Input
                    value={formData.receiptDetails.memberNo}
                    disabled
                    placeholder="Auto-fetched from enrollment"
                    className="bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Due No <span className="text-xs text-blue-600">(Auto-calculated)</span>
                  </label>
                  <Input
                    value={formData.receiptDetails.dueNo}
                    disabled
                    className="bg-gray-50 cursor-not-allowed"
                    placeholder="Calculated by backend"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    From enrollment date + invoice date (20th cut-off)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Month <span className="text-xs text-blue-600">(Auto-calculated)</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.receiptDetails.paymentMonth}
                    disabled
                    className="bg-gray-50 cursor-not-allowed"
                    placeholder="Calculated by backend"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Derived from invoice date
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Due Amount (Monthly) <span className="text-xs text-blue-600">(Auto-calculated)</span>
                  </label>
                  <Input
                    type="number"
                    value={formData.receiptDetails.dueAmount}
                    disabled
                    className="bg-gray-50 cursor-not-allowed"
                    placeholder="Calculated by backend"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    From plan.monthlyAmount[dueNo - 1]
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Arrear Amount (Last Month Pending) 
                    <span className="text-xs text-blue-600 ml-1">
                      {isEditingArrear ? '(Manually Edited)' : '(Auto-calculated)'}
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={formData.receiptDetails.arrearAmount}
                      onChange={(e) => {
                        const amount = parseFloat(e.target.value) || 0;
                        handleArrearAmountChange(amount);
                      }}
                      disabled={!isEditingArrear}
                      className={isEditingArrear ? 'border-orange-300 bg-orange-50' : 'bg-gray-50 cursor-not-allowed'}
                      placeholder="Calculated by backend"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (isEditingArrear) {
                          // Stop editing
                          setIsEditingArrear(false);
                          setManualArrearConfirmed(false);
                          // Refresh preview to get auto-calculated value
                          fetchInvoicePreview();
                        } else {
                          // Start editing - will show confirmation on first change
                          setIsEditingArrear(true);
                        }
                      }}
                      disabled={!formData.customerId || !formData.planId}
                      title={isEditingArrear ? 'Cancel manual edit' : 'Edit arrear amount manually'}
                      className="shrink-0"
                    >
                      <Edit className={`h-4 w-4 ${isEditingArrear ? 'text-orange-600' : ''}`} />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleFetchPreviousArrear}
                      disabled={!formData.customerId || !formData.planId || fetchingArrear}
                      title="Fetch arrear from previous invoice"
                      className="shrink-0"
                    >
                      {fetchingArrear ? (
                        <span className="h-4 w-4 animate-spin">⏳</span>
                      ) : (
                        <RefreshCw className="h-4 w-4 text-blue-600" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {isEditingArrear 
                      ? '⚠️ Manual override active - click Edit button again to cancel and restore auto-calculation'
                      : 'Click Refresh button to fetch balance from previous invoice as arrear'}
                  </p>
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
                    onChange={async (e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      await handleReceivedAmountChange(amount);
                    }}
                    placeholder="Enter received amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Balance Amount
                  </label>
                  <Input
                    type="number"
                    value={formData.receiptDetails.balanceAmount}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      setFormData({
                        ...formData,
                        receiptDetails: { ...formData.receiptDetails, balanceAmount: amount }
                      });
                    }}
                    placeholder="Enter balance amount"
                  />
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
                  <div className="flex gap-2 mb-3">
                    <Button 
                      onClick={() => handleSave('draft')}
                      disabled={loading || !formData.customerId || !formData.planId}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      {loading ? 'Saving...' : 'Save as Draft'}
                    </Button>
                    <Button 
                      onClick={() => handleSave('sent')}
                      disabled={loading || !formData.customerId || !formData.planId}
                      size="sm"
                      className="flex-1"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      {loading ? 'Sending...' : 'Save & Send'}
                    </Button>
                  </div>
                  <Button
                    onClick={() => {
                      // After saving, get the last saved invoice ID from state or API response
                      // For demo, prompt for invoice ID (replace with your logic)
                      const invoiceId = window.prompt('Enter Invoice ID to print:');
                      if (invoiceId) {
                        window.open(`/receipt/thermal/${invoiceId}`, '_blank');
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

      {/* Success Modal */}
      {showSuccessModal && createdInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Invoice Created Successfully!
              </h3>
              <p className="text-sm text-gray-500">
                Invoice #{createdInvoice.invoiceNumber} has been created with the following backend-calculated values:
              </p>
            </div>

            <div className="border-t border-b border-gray-200 py-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Due Amount:</span>
                <span className="text-gray-900">₹{(createdInvoice.dueAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Arrear Amount:</span>
                <span className="text-gray-900">₹{(createdInvoice.arrearAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Received Amount:</span>
                <span className="text-green-600 font-semibold">₹{(createdInvoice.receivedAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Balance Amount:</span>
                <span className="text-blue-600 font-semibold">₹{(createdInvoice.balanceAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              {createdInvoice.pendingAmount !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">Pending Amount:</span>
                  <span className="text-orange-600 font-semibold">₹{(createdInvoice.pendingAmount || 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="font-medium text-gray-700">Due Number:</span>
                <span className="text-gray-900">{createdInvoice.dueNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">Payment Month:</span>
                <span className="text-gray-900">{createdInvoice.paymentMonth || 'N/A'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  setCreatedInvoice(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Create Another
              </Button>
              <Button
                onClick={() => {
                  window.location.href = '/admin/invoices';
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                View Invoices
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}