import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  defaultSettings,
  defaultUsers,
  defaultLoanProducts,
  defaultApplications,
  defaultLoanAccounts,
  defaultPaymentSubmissions,
  defaultReceipts,
  defaultSupportTickets,
  defaultNotifications,
  defaultAuditLogs,
  defaultCustomers,
  defaultStaff,
  defaultCmsContent,
  defaultEligibilityRules,
} from './src/data/mockDatabase';
import { calculateEmi, calculateFOIR } from './src/utils/calculator';
import { ApplicationStatus, EligibilityResult, LoanApplication, Receipt, SupportTicket } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // In-memory Database state initialized with mock seeds
  let settings = { ...defaultSettings };
  let users = [...defaultUsers];
  let loanProducts = [...defaultLoanProducts];
  let applications = [...defaultApplications];
  let loanAccounts = [...defaultLoanAccounts];
  let paymentSubmissions = [...defaultPaymentSubmissions];
  let receipts = [...defaultReceipts];
  let supportTickets = [...defaultSupportTickets];
  let notifications = [...defaultNotifications];
  let auditLogs = [...defaultAuditLogs];
  let customers = [...defaultCustomers];
  let staffMembers = [...defaultStaff];
  let cmsContent = { ...defaultCmsContent };
  let eligibilityRules = [...defaultEligibilityRules];

  // Helper log audit
  const addAuditLog = (userId: string, role: string, email: string, action: string, entityType: string, entityId: string, details: string) => {
    auditLogs.unshift({
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId,
      userRole: role,
      userEmail: email,
      action,
      entityType,
      entityId,
      details,
      ipAddress: '127.0.0.1',
    });
  };

  // ---------------- API ROUTES ----------------

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'Dhani Finance', timestamp: new Date().toISOString() });
  });

  // Settings / Branding
  app.get('/api/settings', (req, res) => {
    res.json({ success: true, settings });
  });

  app.post('/api/settings', (req, res) => {
    settings = { ...settings, ...req.body };
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'SETTINGS_UPDATED', 'CompanySettings', 'global', 'Updated company branding settings');
    res.json({ success: true, settings });
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }

    const user = users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
    
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    if (password !== 'password123') {
      addAuditLog(user.id, user.role, user.email, 'USER_LOGIN_FAILED', 'User', user.id, 'Invalid password attempt');
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    addAuditLog(user.id, user.role, user.email, 'USER_LOGIN', 'User', user.id, 'User logged in successfully');
    res.json({ success: true, user, token: `jwt_token_${user.id}_${Date.now()}` });
  });

  // Auth: Register
  app.post('/api/auth/register', (req, res) => {
    const { fullName, email, mobile } = req.body;
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase() || u.mobile === mobile);
    
    if (existing) {
      res.json({ success: true, user: existing, token: `jwt_token_${existing.id}` });
      return;
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      fullName,
      email,
      mobile,
      role: 'customer' as const,
      isVerified: true,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    addAuditLog(newUser.id, 'customer', newUser.email, 'USER_REGISTERED', 'User', newUser.id, 'New customer registration');
    res.json({ success: true, user: newUser, token: `jwt_token_${newUser.id}` });
  });

  // Loan Products
  app.get('/api/loan-products', (req, res) => {
    res.json({ success: true, products: loanProducts });
  });

  app.post('/api/loan-products', (req, res) => {
    const product = req.body;
    const idx = loanProducts.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      loanProducts[idx] = product;
    } else {
      loanProducts.push(product);
    }
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'PRODUCT_SAVED', 'LoanProduct', product.id, `Saved product ${product.title}`);
    res.json({ success: true, products: loanProducts });
  });

  // Automated Eligibility Engine Endpoint
  app.post('/api/eligibility/assess', (req, res) => {
    const { productId, monthlyIncome, existingEmis, requestedAmount, requestedTenureMonths, employmentType, age } = req.body;
    
    const product = loanProducts.find((p) => p.id === productId) || loanProducts[0];
    
    const income = Number(monthlyIncome) || 0;
    const emis = Number(existingEmis) || 0;
    const amount = Number(requestedAmount) || product.minAmount;
    const tenure = Number(requestedTenureMonths) || product.minTenureMonths;
    const userAge = Number(age) || 28;

    // Calculate proposed EMI at min interest rate
    const calc = calculateEmi(amount, product.minInterestRate, tenure);
    const foir = calculateFOIR(income, emis, calc.monthlyEmi);
    const netDisposable = income - (emis + calc.monthlyEmi);

    const reasonCodes: string[] = [];
    const reasons: string[] = [];
    let isEligible = true;

    if (userAge < product.minAge) {
      isEligible = false;
      reasonCodes.push('AGE_BELOW_MINIMUM');
      reasons.push(`Applicant age (${userAge}) is below minimum requirement (${product.minAge} yrs).`);
    }

    if (income < product.minIncome) {
      isEligible = false;
      reasonCodes.push('INCOME_BELOW_REQUIRED');
      reasons.push(`Monthly net income (₹${income}) is below required limit (₹${product.minIncome}).`);
    }

    if (foir > product.maxFoirPercent) {
      isEligible = false;
      reasonCodes.push('FOIR_TOO_HIGH');
      reasons.push(`FOIR ratio (${foir}%) exceeds allowed maximum limit (${product.maxFoirPercent}%).`);
    }

    if (amount > product.maxAmount) {
      isEligible = false;
      reasonCodes.push('REQUESTED_AMOUNT_TOO_HIGH');
      reasons.push(`Requested amount exceeds maximum allowed product cap (₹${product.maxAmount.toLocaleString('en-IN')}).`);
    }

    let status: EligibilityResult['status'] = 'eligible';
    if (!isEligible) {
      status = 'not_eligible';
    } else if (foir > product.maxFoirPercent - 10) {
      status = 'conditionally_eligible';
      reasonCodes.push('BORDERLINE_FOIR');
      reasons.push('FOIR is close to threshold limit; conditional approval with co-applicant recommended.');
    } else {
      reasonCodes.push('ELIGIBLE_INCOME_MET', 'FOIR_WITHIN_LIMIT');
      reasons.push('Monthly income and FOIR meet credit policy thresholds.');
    }

    const result: EligibilityResult = {
      status,
      maxEligibleAmount: Math.min(amount, Math.round(income * 12 * 0.45)),
      recommendedInterestRate: product.minInterestRate,
      maxEligibleTenure: product.maxTenureMonths,
      estimatedEmi: calc.monthlyEmi,
      foirPercent: foir,
      netDisposableIncome: netDisposable,
      reasonCodes,
      reasons,
      assessedAt: new Date().toISOString(),
    };

    res.json({ success: true, eligibilityResult: result });
  });

  // Applications
  app.get('/api/applications', (req, res) => {
    const { userId } = req.query;
    if (userId) {
      const userApps = applications.filter((a) => a.userId === userId);
      res.json({ success: true, applications: userApps });
      return;
    }
    res.json({ success: true, applications });
  });

  app.get('/api/applications/:id', (req, res) => {
    res.status(403).json({ success: false, error: 'Use secure tracking verification or authenticated application lists.' });
  });

  app.post('/api/applications/track', (req, res) => {
    const { identifier, applicationId, contact, otp } = req.body;
    const lookupValue = String(identifier || applicationId || contact || '').trim().toLowerCase();
    const normalizedContact = String(contact || '').trim().toLowerCase();
    const appItem = applications
      .filter((a) =>
        a.id.toLowerCase() === lookupValue ||
        a.personalInfo?.mobile === lookupValue ||
        a.personalInfo?.email?.toLowerCase() === lookupValue
      )
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())[0];

    if (!appItem) {
      res.status(404).json({ success: false, error: 'Application not found.' });
      return;
    }

    const contactMatches =
      !normalizedContact ||
      appItem.personalInfo?.mobile === normalizedContact ||
      appItem.personalInfo?.email?.toLowerCase() === normalizedContact;

    if (!contactMatches || String(otp || '').trim() !== '123456') {
      addAuditLog('public', 'guest', normalizedContact || 'unknown', 'TRACKING_VERIFICATION_FAILED', 'LoanApplication', appItem.id, 'Public tracking verification failed');
      res.status(403).json({ success: false, error: 'Verification failed. Check the registered mobile/email and OTP.' });
      return;
    }

    const maskedName = appItem.personalInfo.fullName.replace(/\b(\w)(\w+)/g, (_match, first, rest) => `${first}${'*'.repeat(Math.min(String(rest).length, 6))}`);
    const safeApplication = {
      id: appItem.id,
      productTitle: appItem.productTitle,
      productType: appItem.productType,
      requestedAmount: appItem.requestedAmount,
      requestedTenureMonths: appItem.requestedTenureMonths,
      status: appItem.status,
      statusHistory: appItem.statusHistory.map((item) => ({
        status: item.status,
        date: item.date,
        note: item.note,
        updatedBy: item.updatedBy,
      })),
      createdAt: appItem.createdAt,
      updatedAt: appItem.updatedAt,
      personalInfo: {
        fullName: maskedName,
        fatherOrSpouseName: 'Hidden for privacy',
        dob: 'Hidden for privacy',
        gender: appItem.personalInfo.gender,
        maritalStatus: appItem.personalInfo.maritalStatus,
        nationality: 'Hidden for privacy',
        email: appItem.personalInfo.email.replace(/(^.).*(@.*$)/, '$1***$2'),
        mobile: appItem.personalInfo.mobile.replace(/^(\d{2})\d+(\d{2})$/, '$1******$2'),
        panNumber: '*****',
        aadhaarLast4: '****',
        currentAddress: 'Hidden for privacy',
        permanentAddress: 'Hidden for privacy',
        city: 'Hidden for privacy',
        state: 'Hidden for privacy',
        pincode: 'Hidden',
        residenceType: appItem.personalInfo.residenceType,
      },
      documents: appItem.documents.map((doc) => ({
        id: doc.id,
        docType: doc.docType,
        title: doc.title,
        fileName: doc.fileName,
        uploadedAt: doc.uploadedAt,
        status: doc.status,
        rejectionNote: doc.rejectionNote,
        fileUrl: '',
      })),
    };

    addAuditLog('public', 'guest', normalizedContact, 'TRACKING_VERIFIED', 'LoanApplication', appItem.id, 'Public tracking verification succeeded');
    res.json({ success: true, application: safeApplication });
  });

  app.post('/api/applications', (req, res) => {
    const data = req.body;
    let appItem: LoanApplication;

    if (data.id && applications.some((a) => a.id === data.id)) {
      const idx = applications.findIndex((a) => a.id === data.id);
      appItem = { ...applications[idx], ...data, updatedAt: new Date().toISOString() };
      applications[idx] = appItem;
    } else {
      const appSeq = String(applications.length + 101).padStart(6, '0');
      const newId = `LN-2026-${appSeq}`;
      appItem = {
        ...data,
        id: newId,
        status: data.status || 'submitted',
        statusHistory: [
          { status: data.status || 'submitted', date: new Date().toISOString(), note: 'Application created online' },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      applications.unshift(appItem);
    }

    addAuditLog(appItem.userId || 'usr_guest', 'customer', appItem.personalInfo?.email || 'user', 'APPLICATION_SAVED', 'LoanApplication', appItem.id, `Saved loan application ${appItem.id}`);
    res.json({ success: true, application: appItem });
  });

  // Application Status Change (Admin approval, rejection, request info)
  app.patch('/api/applications/:id/status', (req, res) => {
    const { id } = req.params;
    const { status, note, approvedAmount, approvedRate, approvedTenureMonths, processingFee, rejectionReason } = req.body;

    const idx = applications.findIndex((a) => a.id === id);
    if (idx === -1) {
      res.status(404).json({ success: false, error: 'Application not found' });
      return;
    }

    const appItem = applications[idx];
    appItem.status = status as ApplicationStatus;
    appItem.statusHistory.push({
      status: status as ApplicationStatus,
      date: new Date().toISOString(),
      note: note || `Status updated to ${status}`,
      updatedBy: 'Admin',
    });

    if (approvedAmount) appItem.approvedAmount = Number(approvedAmount);
    if (approvedRate) appItem.approvedRate = Number(approvedRate);
    if (approvedTenureMonths) appItem.approvedTenureMonths = Number(approvedTenureMonths);
    if (processingFee) appItem.processingFee = Number(processingFee);
    if (rejectionReason) appItem.rejectionReason = rejectionReason;

    if (status === 'approved') {
      appItem.approvalDate = new Date().toISOString();
      const calc = calculateEmi(appItem.approvedAmount!, appItem.approvedRate!, appItem.approvedTenureMonths!, 1.5);
      appItem.approvedEmi = calc.monthlyEmi;

      // Auto create loan account
      const accountNo = `LA-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      const newLoanAccount = {
        accountNumber: accountNo,
        applicationId: appItem.id,
        userId: appItem.userId,
        customerName: appItem.personalInfo.fullName,
        loanType: appItem.productType,
        principalAmount: appItem.approvedAmount!,
        interestRate: appItem.approvedRate!,
        tenureMonths: appItem.approvedTenureMonths!,
        monthlyEmi: calc.monthlyEmi,
        startDate: new Date().toISOString(),
        maturityDate: new Date(Date.now() + appItem.approvedTenureMonths! * 30 * 24 * 3600 * 1000).toISOString(),
        processingFee: appItem.processingFee || 0,
        outstandingPrincipal: appItem.approvedAmount!,
        totalPaid: 0,
        totalOverdue: 0,
        status: 'active' as const,
        schedule: calc.schedule.map((row, i) => ({
          installmentNumber: row.month,
          dueDate: new Date(Date.now() + (i + 1) * 30 * 24 * 3600 * 1000).toISOString(),
          openingPrincipal: row.openingPrincipal,
          emiAmount: row.emi,
          principalComponent: row.principalPayment,
          interestComponent: row.interestPayment,
          charges: 0,
          closingPrincipal: row.closingPrincipal,
          status: i === 0 ? ('due' as const) : ('upcoming' as const),
          paidAmount: 0,
        })),
        createdAt: new Date().toISOString(),
      };
      loanAccounts.unshift(newLoanAccount);
    }

    appItem.updatedAt = new Date().toISOString();
    applications[idx] = appItem;

    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'APPLICATION_STATUS_UPDATED', 'LoanApplication', appItem.id, `Updated status to ${status}`);
    res.json({ success: true, application: appItem });
  });

  // Loan Accounts
  app.get('/api/loan-accounts', (req, res) => {
    const { userId } = req.query;
    if (userId) {
      res.json({ success: true, loanAccounts: loanAccounts.filter((l) => l.userId === userId) });
      return;
    }
    res.json({ success: true, loanAccounts });
  });

  // Payments: Submit Proof
  app.post('/api/payments/submit', (req, res) => {
    const { loanAccountId, applicationId, userId, customerName, amount, utrNumber, proofScreenshotUrl, installmentNumber } = req.body;

    // Check duplicate UTR
    const duplicate = paymentSubmissions.find((p) => p.utrNumber.trim().toLowerCase() === utrNumber.trim().toLowerCase());
    if (duplicate) {
      res.status(400).json({ success: false, error: 'This UTR number has already been submitted for verification.' });
      return;
    }

    const newPayment: any = {
      id: `PAY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      loanAccountId,
      applicationId,
      userId,
      customerName,
      amount: Number(amount),
      purpose: 'emi',
      installmentNumber: installmentNumber ? Number(installmentNumber) : 1,
      upiIdUsed: settings.upiId,
      utrNumber,
      proofScreenshotUrl: proofScreenshotUrl || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=600&fit=crop',
      paymentDate: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      status: 'pending_verification',
    };

    paymentSubmissions.unshift(newPayment);
    addAuditLog(userId, 'customer', customerName, 'PAYMENT_SUBMITTED', 'PaymentSubmission', newPayment.id, `Submitted UTR ${utrNumber} for ₹${amount}`);
    res.json({ success: true, payment: newPayment });
  });

  app.get('/api/payments', (req, res) => {
    res.json({ success: true, payments: paymentSubmissions });
  });

  // Payments: Admin Verification / Approval
  app.post('/api/payments/:id/verify', (req, res) => {
    const { id } = req.params;
    const { action, note } = req.body; // 'approve' | 'reject'

    const payIdx = paymentSubmissions.findIndex((p) => p.id === id);
    if (payIdx === -1) {
      res.status(404).json({ success: false, error: 'Payment record not found' });
      return;
    }

    const pay = paymentSubmissions[payIdx];
    if (action === 'approve') {
      pay.status = 'verified';
      pay.verificationNote = note || 'Verified with bank statement';
      pay.verifiedBy = 'Admin';
      pay.verifiedAt = new Date().toISOString();

      const receiptNo = `RCT-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      pay.receiptNumber = receiptNo;

      // Update Loan Account schedule
      const loan = loanAccounts.find((l) => l.accountNumber === pay.loanAccountId || l.applicationId === pay.applicationId);
      let remBalance = loan ? loan.outstandingPrincipal : 0;
      let nextDue = new Date().toISOString();

      if (loan) {
        loan.totalPaid += pay.amount;
        loan.outstandingPrincipal = Math.max(0, loan.outstandingPrincipal - pay.amount);
        remBalance = loan.outstandingPrincipal;

        const instIdx = loan.schedule.findIndex((s) => s.installmentNumber === pay.installmentNumber || s.status === 'due');
        if (instIdx >= 0) {
          loan.schedule[instIdx].status = 'paid';
          loan.schedule[instIdx].paidAmount = pay.amount;
          loan.schedule[instIdx].utrRef = pay.utrNumber;
          loan.schedule[instIdx].paidDate = new Date().toISOString();

          if (instIdx + 1 < loan.schedule.length) {
            loan.schedule[instIdx + 1].status = 'due';
            nextDue = loan.schedule[instIdx + 1].dueDate;
          }
        }
      }

      const newReceipt: Receipt = {
        receiptNumber: receiptNo,
        paymentId: pay.id,
        loanAccountId: pay.loanAccountId,
        applicationId: pay.applicationId,
        customerName: pay.customerName,
        amountPaid: pay.amount,
        paymentMethod: 'UPI',
        utrNumber: pay.utrNumber,
        paymentDate: pay.paymentDate,
        verificationDate: new Date().toISOString(),
        remainingBalance: remBalance,
        nextDueDate: nextDue,
        qrVerificationCode: `${req.headers.origin || 'http://localhost:3000'}/verify-receipt?id=${receiptNo}`,
      };
      receipts.unshift(newReceipt);

      addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'PAYMENT_VERIFIED', 'PaymentSubmission', pay.id, `Approved payment UTR ${pay.utrNumber}`);
    } else {
      pay.status = 'rejected';
      pay.verificationNote = note || 'Invalid UTR or payment not reflected in bank account.';
      addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'PAYMENT_REJECTED', 'PaymentSubmission', pay.id, `Rejected payment UTR ${pay.utrNumber}`);
    }

    paymentSubmissions[payIdx] = pay;
    res.json({ success: true, payment: pay });
  });

  // Public Receipt Verification
  app.get('/api/receipts/verify/:receiptNumber', (req, res) => {
    const { receiptNumber } = req.params;
    const r = receipts.find((x) => x.receiptNumber.toLowerCase() === receiptNumber.toLowerCase());
    if (!r) {
      res.json({ success: false, error: 'Receipt not found or invalid QR code.' });
      return;
    }
    res.json({ success: true, receipt: r });
  });

  // Support Tickets
  app.get('/api/support/tickets', (req, res) => {
    res.json({ success: true, tickets: supportTickets });
  });

  app.post('/api/support/tickets', (req, res) => {
    const { ticketId, sender, text, category, subject, userId, customerName } = req.body;
    if (ticketId) {
      const idx = supportTickets.findIndex((t) => t.id === ticketId);
      if (idx >= 0) {
        supportTickets[idx].messages.push({ sender, text, date: new Date().toISOString() });
        supportTickets[idx].updatedAt = new Date().toISOString();
        res.json({ success: true, ticket: supportTickets[idx] });
        return;
      }
    }

    const newTicket: SupportTicket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: userId || 'usr_customer_1',
      customerName: customerName || 'Aniket Verma',
      category: category || 'General Query',
      subject: subject || 'Help Request',
      description: text,
      priority: 'medium',
      status: 'open',
      messages: [{ sender: 'customer', text, date: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    supportTickets.unshift(newTicket);
    res.json({ success: true, ticket: newTicket });
  });

  // Notifications
  app.get('/api/notifications', (req, res) => {
    res.json({ success: true, notifications });
  });

  // Audit Logs
  app.get('/api/audit-logs', (req, res) => {
    res.json({ success: true, auditLogs });
  });

  app.get('/api/admin/dashboard/summary', (req, res) => {
    const activeLoans = loanAccounts.filter((loan) => loan.status === 'active');
    const pendingPayments = paymentSubmissions.filter((payment) => payment.status === 'pending_verification');
    const verifiedPayments = paymentSubmissions.filter((payment) => payment.status === 'verified');
    const pendingDocuments = applications.reduce((sum, appItem) => sum + (appItem.documents?.filter((doc) => doc.status === 'pending' || doc.status === 'reupload_required').length || 0), 0);
    const overdueInstallments = activeLoans.flatMap((loan) => loan.schedule.filter((inst) => inst.status === 'overdue'));
    const totalOutstanding = activeLoans.reduce((sum, loan) => sum + loan.outstandingPrincipal, 0);
    const overdueAmount = overdueInstallments.reduce((sum, inst) => sum + Math.max(0, inst.emiAmount - inst.paidAmount), 0);
    const approvedApps = applications.filter((appItem) => appItem.status === 'approved' || appItem.status === 'active' || appItem.status === 'loan_disbursed');

    const applicationTrendMap = new Map<string, any>();
    applications.forEach((appItem) => {
      const period = new Date(appItem.createdAt).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      const row = applicationTrendMap.get(period) || { period, submitted: 0, approved: 0, rejected: 0, approvalRate: 0 };
      if (appItem.status !== 'draft') row.submitted += 1;
      if (appItem.status === 'approved' || appItem.status === 'active' || appItem.status === 'loan_disbursed') row.approved += 1;
      if (appItem.status === 'rejected') row.rejected += 1;
      applicationTrendMap.set(period, row);
    });

    const loanPortfolioMap = new Map<string, number>();
    activeLoans.forEach((loan) => {
      loanPortfolioMap.set(loan.loanType, (loanPortfolioMap.get(loan.loanType) || 0) + loan.outstandingPrincipal);
    });

    const totalDue = activeLoans.reduce((sum, loan) => sum + loan.schedule.reduce((inner, inst) => inner + inst.emiAmount, 0), 0);
    const totalCollection = verifiedPayments.reduce((sum, payment) => sum + payment.amount, 0);

    const applicationTrend = Array.from(applicationTrendMap.values()).map((row) => ({
      ...row,
      approvalRate: row.submitted ? Math.round((row.approved / row.submitted) * 100) : 0,
    }));

    res.json({
      success: true,
      summary: {
        newApplications: applications.filter((appItem) => appItem.status === 'submitted').length,
        underReview: applications.filter((appItem) => appItem.status === 'under_review' || appItem.status === 'documents_pending' || appItem.status === 'documents_under_verification').length,
        approvedLoans: approvedApps.length,
        activeLoans: activeLoans.length,
        pendingPayments: pendingPayments.length,
        totalCollection,
        totalCustomers: customers.length,
        totalOutstanding,
        overdueAmount,
        pendingDocuments,
        averageApprovalTime: null,
      },
      applicationTrend,
      loanPortfolio: Array.from(loanPortfolioMap.entries()).map(([loanType, outstanding]) => ({ loanType, outstanding })),
      collectionTrend: [{ period: 'current', due: totalDue, collected: totalCollection, processingFees: verifiedPayments.filter((payment) => payment.purpose === 'processing_fee').reduce((sum, payment) => sum + payment.amount, 0), overdue: overdueAmount }],
      overdueDistribution: [
        { bucket: 'current', count: Math.max(0, activeLoans.length - overdueInstallments.length), amount: Math.max(0, totalOutstanding - overdueAmount) },
        { bucket: 'early_delay', count: overdueInstallments.length ? 1 : 0, amount: overdueAmount },
        { bucket: 'moderate_overdue', count: 0, amount: 0 },
        { bucket: 'high_risk', count: 0, amount: 0 },
      ],
      applicationFunnel: [
        { stage: 'submitted', count: applications.filter((appItem) => appItem.status !== 'draft').length },
        { stage: 'under_review', count: applications.filter((appItem) => appItem.status === 'under_review' || appItem.status === 'documents_pending').length },
        { stage: 'documents_verified', count: applications.filter((appItem) => appItem.documents?.length && appItem.documents.every((doc) => doc.status === 'verified')).length },
        { stage: 'approved', count: approvedApps.length },
        { stage: 'disbursed', count: activeLoans.length },
      ],
      pendingActions: [
        { label: 'Applications awaiting review', count: applications.filter((appItem) => appItem.status === 'submitted' || appItem.status === 'under_review').length },
        { label: 'Documents awaiting verification', count: pendingDocuments },
        { label: 'Payments awaiting verification', count: pendingPayments.length },
      ],
      recentApplications: applications.slice(0, 5),
      pendingPayments: pendingPayments.slice(0, 5),
    });
  });

  // Receipts List
  app.get('/api/receipts', (req, res) => {
    res.json({ success: true, receipts });
  });

  // Customers Management
  app.get('/api/customers', (req, res) => {
    res.json({ success: true, customers });
  });

  app.post('/api/customers', (req, res) => {
    const cust = req.body;
    const idx = customers.findIndex((c) => c.id === cust.id);
    if (idx >= 0) {
      customers[idx] = { ...customers[idx], ...cust };
    } else {
      customers.unshift({
        ...cust,
        id: cust.id || `usr_cust_${Date.now()}`,
        createdAt: new Date().toISOString(),
      });
    }
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'CUSTOMER_UPDATED', 'Customer', cust.id || 'new', `Updated customer ${cust.fullName || cust.email}`);
    res.json({ success: true, customers });
  });

  // Document Verification Endpoint
  app.post('/api/documents/verify', (req, res) => {
    const { applicationId, documentId, status, rejectionNote } = req.body;
    const appItem = applications.find((a) => a.id === applicationId);
    if (appItem && appItem.documents) {
      const doc = appItem.documents.find((d) => d.id === documentId);
      if (doc) {
        doc.status = status;
        if (rejectionNote) doc.rejectionNote = rejectionNote;
        addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'DOCUMENT_VERIFIED', 'ApplicationDocument', documentId, `Document ${doc.title} marked ${status}`);
      }
    }
    res.json({ success: true, application: appItem });
  });

  // CMS Content Management
  app.get('/api/cms', (req, res) => {
    res.json({ success: true, cms: cmsContent });
  });

  app.post('/api/cms', (req, res) => {
    cmsContent = { ...cmsContent, ...req.body };
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'CMS_UPDATED', 'CmsContent', 'global', 'Updated website CMS content');
    res.json({ success: true, cms: cmsContent });
  });

  // Staff & Permissions
  app.get('/api/staff', (req, res) => {
    res.json({ success: true, staff: staffMembers });
  });

  app.post('/api/staff', (req, res) => {
    const member = req.body;
    const idx = staffMembers.findIndex((s) => s.id === member.id);
    if (idx >= 0) {
      staffMembers[idx] = { ...staffMembers[idx], ...member };
    } else {
      staffMembers.unshift({
        ...member,
        id: `stf_${Date.now()}`,
        lastLogin: new Date().toISOString(),
      });
    }
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'STAFF_SAVED', 'StaffMember', member.id || 'new', `Saved staff member ${member.fullName}`);
    res.json({ success: true, staff: staffMembers });
  });

  // Eligibility Rules
  app.get('/api/eligibility/rules', (req, res) => {
    res.json({ success: true, rules: eligibilityRules });
  });

  app.post('/api/eligibility/rules', (req, res) => {
    const rule = req.body;
    const idx = eligibilityRules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      eligibilityRules[idx] = rule;
    } else {
      eligibilityRules.unshift({ ...rule, id: `rule_${Date.now()}` });
    }
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'RULE_SAVED', 'EligibilityRule', rule.id || 'new', `Saved eligibility rule ${rule.ruleName}`);
    res.json({ success: true, rules: eligibilityRules });
  });

  // Loan Manual Adjustments
  app.post('/api/loans/:accountNumber/adjust', (req, res) => {
    const { accountNumber } = req.params;
    const { type, amount, reason, installmentNumber } = req.body; // type: 'waive_charge' | 'offline_payment' | 'reschedule'
    const loan = loanAccounts.find((l) => l.accountNumber === accountNumber);

    if (!loan) {
      res.status(404).json({ success: false, error: 'Loan account not found' });
      return;
    }

    if (type === 'offline_payment' && amount) {
      const pAmt = Number(amount);
      loan.totalPaid += pAmt;
      loan.outstandingPrincipal = Math.max(0, loan.outstandingPrincipal - pAmt);
      if (installmentNumber) {
        const inst = loan.schedule.find((s) => s.installmentNumber === Number(installmentNumber));
        if (inst) {
          inst.status = 'paid';
          inst.paidAmount = pAmt;
          inst.paidDate = new Date().toISOString();
        }
      }
    } else if (type === 'waive_charge' && installmentNumber) {
      const inst = loan.schedule.find((s) => s.installmentNumber === Number(installmentNumber));
      if (inst) inst.charges = 0;
    }

    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'LOAN_ADJUSTED', 'LoanAccount', accountNumber, `Loan adjustment: ${type} of ₹${amount || 0} (${reason})`);
    res.json({ success: true, loanAccount: loan });
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
