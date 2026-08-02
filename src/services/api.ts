import { CompanySettings, LoanProduct, LoanApplication, LoanAccount, PaymentSubmission, Receipt, SupportTicket, AppNotification, AuditLog, User, EligibilityResult } from '../types';

export const api = {
  async getSettings(): Promise<CompanySettings> {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      return data.settings;
    } catch {
      const { defaultSettings } = await import('../data/mockDatabase');
      return defaultSettings;
    }
  },

  async updateSettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    return data.settings;
  },

  async saveSettings(settings: CompanySettings): Promise<CompanySettings> {
    return this.updateSettings(settings);
  },

  async login(email: string, password?: string, role?: string): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });
    const data = await res.json();
    return data;
  },

  async register(fullName: string, email: string, mobile: string): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, mobile }),
    });
    const data = await res.json();
    return data;
  },

  async getLoanProducts(): Promise<LoanProduct[]> {
    try {
      const res = await fetch('/api/loan-products');
      const data = await res.json();
      return data.products;
    } catch {
      const { defaultLoanProducts } = await import('../data/mockDatabase');
      return defaultLoanProducts;
    }
  },

  async saveLoanProduct(product: LoanProduct): Promise<LoanProduct[]> {
    const res = await fetch('/api/loan-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    const data = await res.json();
    return data.products;
  },

  async assessEligibility(payload: {
    productId: string;
    monthlyIncome: number;
    existingEmis: number;
    requestedAmount: number;
    requestedTenureMonths: number;
    employmentType: string;
    age?: number;
  }): Promise<EligibilityResult> {
    const res = await fetch('/api/eligibility/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.eligibilityResult;
  },

  async getApplications(userId?: string): Promise<LoanApplication[]> {
    try {
      const url = userId ? `/api/applications?userId=${userId}` : '/api/applications';
      const res = await fetch(url);
      const data = await res.json();
      return data.applications;
    } catch {
      const { defaultApplications } = await import('../data/mockDatabase');
      return userId ? defaultApplications.filter(a => a.userId === userId) : defaultApplications;
    }
  },

  async getApplicationById(id: string): Promise<LoanApplication | null> {
    try {
      const res = await fetch(`/api/applications/${id}`);
      const data = await res.json();
      return data.application;
    } catch {
      const { defaultApplications } = await import('../data/mockDatabase');
      return defaultApplications.find(a => a.id === id) || null;
    }
  },

  async saveApplication(application: Partial<LoanApplication>): Promise<LoanApplication> {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(application),
    });
    const data = await res.json();
    return data.application;
  },

  async updateApplicationStatus(id: string, payload: {
    status: string;
    note?: string;
    approvedAmount?: number;
    approvedRate?: number;
    approvedTenureMonths?: number;
    processingFee?: number;
    rejectionReason?: string;
  }): Promise<LoanApplication> {
    const res = await fetch(`/api/applications/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.application;
  },

  async getLoanAccounts(userId?: string): Promise<LoanAccount[]> {
    try {
      const url = userId ? `/api/loan-accounts?userId=${userId}` : '/api/loan-accounts';
      const res = await fetch(url);
      const data = await res.json();
      return data.loanAccounts;
    } catch {
      const { defaultLoanAccounts } = await import('../data/mockDatabase');
      return userId ? defaultLoanAccounts.filter(l => l.userId === userId) : defaultLoanAccounts;
    }
  },

  async submitPaymentProof(payload: {
    loanAccountId: string;
    applicationId: string;
    userId: string;
    customerName: string;
    amount: number;
    utrNumber: string;
    proofScreenshotUrl?: string;
    installmentNumber?: number;
  }): Promise<{ success: boolean; payment?: PaymentSubmission; error?: string }> {
    const res = await fetch('/api/payments/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async getPayments(): Promise<PaymentSubmission[]> {
    try {
      const res = await fetch('/api/payments');
      const data = await res.json();
      return data.payments;
    } catch {
      const { defaultPaymentSubmissions } = await import('../data/mockDatabase');
      return defaultPaymentSubmissions;
    }
  },

  async verifyPayment(id: string, action: 'approve' | 'reject', note?: string): Promise<PaymentSubmission> {
    const res = await fetch(`/api/payments/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note }),
    });
    const data = await res.json();
    return data.payment;
  },

  async verifyReceiptPublic(receiptNumber: string): Promise<{ success: boolean; receipt?: Receipt; error?: string }> {
    try {
      const res = await fetch(`/api/receipts/verify/${receiptNumber}`);
      return await res.json();
    } catch {
      return { success: false, error: 'Receipt verification failed or server error.' };
    }
  },

  async getSupportTickets(): Promise<SupportTicket[]> {
    try {
      const res = await fetch('/api/support/tickets');
      const data = await res.json();
      return data.tickets;
    } catch {
      const { defaultSupportTickets } = await import('../data/mockDatabase');
      return defaultSupportTickets;
    }
  },

  async sendSupportMessage(payload: {
    ticketId?: string;
    sender: 'customer' | 'support';
    text: string;
    category?: string;
    subject?: string;
    userId?: string;
    customerName?: string;
  }): Promise<SupportTicket> {
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.ticket;
  },

  async getNotifications(): Promise<AppNotification[]> {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      return data.notifications;
    } catch {
      const { defaultNotifications } = await import('../data/mockDatabase');
      return defaultNotifications;
    }
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      return data.auditLogs;
    } catch {
      const { defaultAuditLogs } = await import('../data/mockDatabase');
      return defaultAuditLogs;
    }
  },

  async getCustomers(): Promise<any[]> {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      return data.customers;
    } catch {
      const { defaultCustomers } = await import('../data/mockDatabase');
      return defaultCustomers;
    }
  },

  async saveCustomer(cust: any): Promise<any[]> {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cust),
    });
    const data = await res.json();
    return data.customers;
  },

  async getReceipts(): Promise<Receipt[]> {
    try {
      const res = await fetch('/api/receipts');
      const data = await res.json();
      return data.receipts;
    } catch {
      return [];
    }
  },

  async verifyDocument(applicationId: string, documentId: string, status: string, rejectionNote?: string): Promise<LoanApplication> {
    const res = await fetch('/api/documents/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, documentId, status, rejectionNote }),
    });
    const data = await res.json();
    return data.application;
  },

  async getCms(): Promise<any> {
    try {
      const res = await fetch('/api/cms');
      const data = await res.json();
      return data.cms;
    } catch {
      const { defaultCmsContent } = await import('../data/mockDatabase');
      return defaultCmsContent;
    }
  },

  async saveCms(cms: any): Promise<any> {
    const res = await fetch('/api/cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cms),
    });
    const data = await res.json();
    return data.cms;
  },

  async getStaff(): Promise<any[]> {
    try {
      const res = await fetch('/api/staff');
      const data = await res.json();
      return data.staff;
    } catch {
      const { defaultStaff } = await import('../data/mockDatabase');
      return defaultStaff;
    }
  },

  async saveStaff(member: any): Promise<any[]> {
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    });
    const data = await res.json();
    return data.staff;
  },

  async getEligibilityRules(): Promise<any[]> {
    try {
      const res = await fetch('/api/eligibility/rules');
      const data = await res.json();
      return data.rules;
    } catch {
      const { defaultEligibilityRules } = await import('../data/mockDatabase');
      return defaultEligibilityRules;
    }
  },

  async saveEligibilityRule(rule: any): Promise<any[]> {
    const res = await fetch('/api/eligibility/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    const data = await res.json();
    return data.rules;
  },

  async adjustLoanAccount(accountNumber: string, payload: { type: string; amount?: number; reason?: string; installmentNumber?: number }): Promise<LoanAccount> {
    const res = await fetch(`/api/loans/${accountNumber}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.loanAccount;
  },
};

