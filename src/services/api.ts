import { CompanySettings, LoanProduct, LoanApplication, LoanAccount, PaymentSubmission, Receipt, SupportTicket, AppNotification, AuditLog, User, EligibilityResult } from '../types';

const SESSION_TOKEN_KEY = 'dhaniSessionToken';

let sessionToken: string | null = (() => {
  try {
    return window.localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
})();

const setSessionToken = (token: string | null) => {
  sessionToken = token;
  try {
    if (token) window.localStorage.setItem(SESSION_TOKEN_KEY, token);
    else window.localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // localStorage unavailable (private browsing, etc.) - session stays in-memory only.
  }
};

// Every request goes through this so the signed session token (issued at login) is
// attached automatically. Admin-only endpoints reject requests without it; public
// endpoints simply ignore the extra header.
const apiFetch = (url: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> | undefined) };
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  return fetch(url, { ...options, headers });
};

export const api = {
  async uploadFile(file: File): Promise<{ success: boolean; fileUrl?: string; fileName?: string; error?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    // No Content-Type header here on purpose - the browser sets the multipart
    // boundary itself; apiFetch still attaches the Authorization header if present.
    const res = await apiFetch('/api/uploads', { method: 'POST', body: formData });
    return await res.json();
  },

  async getSettings(): Promise<CompanySettings> {
    try {
      const res = await apiFetch('/api/settings');
      const data = await res.json();
      return data.settings;
    } catch {
      const { defaultSettings } = await import('../data/mockDatabase');
      return defaultSettings;
    }
  },

  async updateSettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    const res = await apiFetch('/api/settings', {
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
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('API route is not deployed correctly on Vercel. Please redeploy the project root, not only the dist folder.');
    }
    const data = await res.json();
    if (!res.ok || !data.user) throw new Error(data.error || 'Login failed');
    if (data.token) setSessionToken(data.token);
    return data;
  },

  async register(fullName: string, email: string, mobile: string): Promise<{ user: User; token: string }> {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, mobile }),
    });
    const data = await res.json();
    if (!res.ok || !data.user) throw new Error(data.error || 'Registration failed');
    if (data.token) setSessionToken(data.token);
    return data;
  },

  logout(): void {
    setSessionToken(null);
  },

  async getLoanProducts(): Promise<LoanProduct[]> {
    try {
      const res = await apiFetch('/api/loan-products');
      const data = await res.json();
      return data.products;
    } catch {
      const { defaultLoanProducts } = await import('../data/mockDatabase');
      return defaultLoanProducts;
    }
  },

  async saveLoanProduct(product: LoanProduct): Promise<LoanProduct[]> {
    const res = await apiFetch('/api/loan-products', {
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
    const res = await apiFetch('/api/eligibility/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.eligibilityResult;
  },

  async sendOtp(payload: { identifier: string; purpose: 'APPLICATION_EMAIL' | 'TRACK_APPLICATION' }): Promise<{ success: boolean; maskedContact?: string; cooldownSeconds?: number; message?: string; error?: string }> {
    const res = await apiFetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async verifyOtp(payload: { identifier: string; purpose: 'APPLICATION_EMAIL' | 'TRACK_APPLICATION'; otp: string }): Promise<{ success: boolean; verificationToken?: string; error?: string }> {
    const res = await apiFetch('/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async getApplications(userId?: string): Promise<LoanApplication[]> {
    try {
      const url = userId ? `/api/applications?userId=${userId}` : '/api/applications';
      const res = await apiFetch(url);
      const data = await res.json();
      return data.applications;
    } catch {
      const { defaultApplications } = await import('../data/mockDatabase');
      return userId ? defaultApplications.filter(a => a.userId === userId) : defaultApplications;
    }
  },

  async getApplicationById(id: string): Promise<LoanApplication | null> {
    try {
      const res = await apiFetch(`/api/applications/${id}`);
      const data = await res.json();
      return data.application;
    } catch {
      const { defaultApplications } = await import('../data/mockDatabase');
      return defaultApplications.find(a => a.id === id) || null;
    }
  },

  async trackApplication(payload: { identifier?: string; applicationId?: string; contact?: string }): Promise<{
    success: boolean;
    stage?: number;
    requiresOtp?: boolean;
    applicationId?: string;
    maskedMobile?: string;
    applicantName?: string;
    message?: string;
    application?: LoanApplication;
    loanAccount?: LoanAccount;
    sessionToken?: string;
    error?: string;
  }> {
    const res = await apiFetch('/api/applications/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async saveApplication(application: Partial<LoanApplication>): Promise<LoanApplication> {
    const res = await apiFetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(application),
    });
    const data = await res.json();
    if (!res.ok || !data.application) throw new Error(data.error || 'We could not submit your application. Please try again.');
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
    const res = await apiFetch(`/api/applications/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.application;
  },

  async requestProcessingFee(id: string, feeAmount?: number): Promise<{ success: boolean; application?: LoanApplication; error?: string }> {
    const res = await apiFetch(`/api/applications/${id}/request-processing-fee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feeAmount }),
    });
    return await res.json();
  },

  async requestProcessingFees(id: string, fees: { feeType: string; description?: string; amount: number }[]): Promise<{ success: boolean; application?: LoanApplication; error?: string }> {
    const res = await apiFetch(`/api/applications/${id}/request-processing-fee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fees }),
    });
    return await res.json();
  },

  async getLoanAccounts(userId?: string): Promise<LoanAccount[]> {
    try {
      const url = userId ? `/api/loan-accounts?userId=${userId}` : '/api/loan-accounts';
      const res = await apiFetch(url);
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
    purpose?: string;
    utrNumber: string;
    proofScreenshotUrl?: string;
    installmentNumber?: number;
    feeRequestIds?: string[];
  }): Promise<{ success: boolean; payment?: PaymentSubmission; error?: string }> {
    const res = await apiFetch('/api/payments/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return await res.json();
  },

  async getPayments(filters?: { userId?: string; applicationId?: string; loanAccountId?: string }): Promise<PaymentSubmission[]> {
    try {
      const query = filters ? new URLSearchParams(Object.entries(filters).filter(([, v]) => Boolean(v)) as [string, string][]).toString() : '';
      const res = await apiFetch(query ? `/api/payments?${query}` : '/api/payments');
      const data = await res.json();
      return data.payments;
    } catch {
      const { defaultPaymentSubmissions } = await import('../data/mockDatabase');
      return defaultPaymentSubmissions;
    }
  },

  async verifyPayment(id: string, action: 'approve' | 'reject', note?: string): Promise<PaymentSubmission> {
    const res = await apiFetch(`/api/payments/${id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note }),
    });
    const data = await res.json();
    return data.payment;
  },

  async verifyReceiptPublic(receiptNumber: string): Promise<{ success: boolean; receipt?: Receipt; error?: string }> {
    try {
      const res = await apiFetch(`/api/receipts/verify/${receiptNumber}`);
      return await res.json();
    } catch {
      return { success: false, error: 'Receipt verification failed or server error.' };
    }
  },

  async getSupportTickets(userId?: string): Promise<SupportTicket[]> {
    try {
      const res = await apiFetch(userId ? `/api/support/tickets?userId=${userId}` : '/api/support/tickets');
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
    customerEmail?: string;
    phone?: string;
    applicationId?: string;
  }): Promise<SupportTicket> {
    const res = await apiFetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.ticket;
  },

  async getNotifications(): Promise<AppNotification[]> {
    try {
      const res = await apiFetch('/api/notifications');
      const data = await res.json();
      return data.notifications;
    } catch {
      const { defaultNotifications } = await import('../data/mockDatabase');
      return defaultNotifications;
    }
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const res = await apiFetch('/api/audit-logs');
      const data = await res.json();
      return data.auditLogs;
    } catch {
      const { defaultAuditLogs } = await import('../data/mockDatabase');
      return defaultAuditLogs;
    }
  },

  async getAdminDashboardSummary(params?: Record<string, string>): Promise<any> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    const res = await apiFetch(`/api/admin/dashboard/summary${query}`);
    const data = await res.json();
    return data;
  },

  async getCustomers(): Promise<any[]> {
    try {
      const res = await apiFetch('/api/customers');
      const data = await res.json();
      return data.customers;
    } catch {
      const { defaultCustomers } = await import('../data/mockDatabase');
      return defaultCustomers;
    }
  },

  async saveCustomer(cust: any): Promise<any[]> {
    const res = await apiFetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cust),
    });
    const data = await res.json();
    return data.customers;
  },

  async getReceipts(): Promise<Receipt[]> {
    try {
      const res = await apiFetch('/api/receipts');
      const data = await res.json();
      return data.receipts;
    } catch {
      return [];
    }
  },

  async verifyDocument(applicationId: string, documentId: string, status: string, rejectionNote?: string): Promise<LoanApplication> {
    const res = await apiFetch('/api/documents/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, documentId, status, rejectionNote }),
    });
    const data = await res.json();
    return data.application;
  },

  async getCms(): Promise<any> {
    try {
      const res = await apiFetch('/api/cms');
      const data = await res.json();
      return data.cms;
    } catch {
      const { defaultCmsContent } = await import('../data/mockDatabase');
      return defaultCmsContent;
    }
  },

  async saveCms(cms: any): Promise<any> {
    const res = await apiFetch('/api/cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cms),
    });
    const data = await res.json();
    return data.cms;
  },

  async getStaff(): Promise<any[]> {
    try {
      const res = await apiFetch('/api/staff');
      const data = await res.json();
      return data.staff;
    } catch {
      const { defaultStaff } = await import('../data/mockDatabase');
      return defaultStaff;
    }
  },

  async saveStaff(member: any): Promise<any[]> {
    const res = await apiFetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    });
    const data = await res.json();
    return data.staff;
  },

  async getEligibilityRules(): Promise<any[]> {
    try {
      const res = await apiFetch('/api/eligibility/rules');
      const data = await res.json();
      return data.rules;
    } catch {
      const { defaultEligibilityRules } = await import('../data/mockDatabase');
      return defaultEligibilityRules;
    }
  },

  async saveEligibilityRule(rule: any): Promise<any[]> {
    const res = await apiFetch('/api/eligibility/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule),
    });
    const data = await res.json();
    return data.rules;
  },

  async adjustLoanAccount(accountNumber: string, payload: { type: string; amount?: number; reason?: string; installmentNumber?: number }): Promise<LoanAccount> {
    const res = await apiFetch(`/api/loans/${accountNumber}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.loanAccount;
  },
};
