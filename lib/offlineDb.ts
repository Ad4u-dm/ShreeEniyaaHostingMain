import Dexie from 'dexie';
import { isDesktopApp } from './isDesktopApp';

export interface OfflineCustomer {
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

export interface OfflinePlan {
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

export interface OfflineEnrollment {
  _id: string;
  userId: string;
  planId: string;
  status: string;
  enrollmentDate?: string;
  memberNumber?: string;
}

export interface OfflineInvoice {
  _id: string;
  customerId: string;
  planId: string;
  dueDate: string;
  paymentMonth: string;
  dueAmount: number;
  arrearAmount: number;
  pendingAmount: number;
  receivedAmount: number;
  balanceAmount: number;
  issuedBy: string;
}

export class OfflineDB extends Dexie {
  customers!: Dexie.Table<OfflineCustomer, string>;
  plans!: Dexie.Table<OfflinePlan, string>;
  enrollments!: Dexie.Table<OfflineEnrollment, string>;
  invoices!: Dexie.Table<OfflineInvoice, string>;

  constructor() {
    super('OfflineDB');
    this.version(1).stores({
      customers: '_id, name, phone',
      plans: '_id, planName',
      enrollments: '_id, userId, planId, status',
      invoices: '_id, customerId, planId, paymentMonth',
    });
  }
}

export const offlineDb = isDesktopApp() ? new OfflineDB() : undefined;
