import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { calculateEmi, calculateFOIR } from './src/utils/calculator';
import { ApplicationStatus, AppNotification, EligibilityResult, LoanApplication, Receipt, SupportTicket } from './src/types';
import {
  findUserAuthByEmail,
  getCollections,
  initializeDatabase,
  saveApplication,
  saveAuditLog,
  saveCmsContent,
  saveCustomer,
  saveEligibilityRule,
  saveLoanAccount,
  saveLoanProduct,
  saveNotification,
  savePaymentSubmission,
  saveReceipt,
  saveSettings,
  saveStaffMember,
  saveSupportTicket,
  saveUser,
} from './src/db/appStore';
import { hashPassword, maskApplicationForPublic, verifyPassword } from './src/db/security';
import { maskEmail, sendApplicationConfirmationEmail, sendOtpEmail } from './src/utils/mailer';

interface CreateAppOptions {
  serveClient?: boolean;
}

export async function createApp({ serveClient = true }: CreateAppOptions = {}) {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  await initializeDatabase();
  const collections = await getCollections();
  let settings = collections.settings;
  let users = collections.users;
  let loanProducts = collections.loanProducts;
  let applications = collections.applications;
  let loanAccounts = collections.loanAccounts;
  let paymentSubmissions = collections.paymentSubmissions;
  let receipts = collections.receipts;
  let supportTickets = collections.supportTickets;
  let notifications = collections.notifications;
  let auditLogs = collections.auditLogs;
  let customers = collections.customers;
  let staffMembers = collections.staffMembers;
  let cmsContent = collections.cmsContent;
  let eligibilityRules = collections.eligibilityRules;

  // Helper log audit
  const addAuditLog = (userId: string, role: string, email: string, action: string, entityType: string, entityId: string, details: string) => {
    const log = {
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
    };
    auditLogs.unshift(log);
    void saveAuditLog(log);
  };

  const addNotification = (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & Partial<Pick<AppNotification, 'id' | 'createdAt' | 'read'>>) => {
    const item: AppNotification = {
      id: notification.id || `ntf_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: notification.read ?? false,
      createdAt: notification.createdAt || new Date().toISOString(),
      link: notification.link,
    };

    notifications = [item, ...notifications.filter((existing) => existing.id !== item.id)];
    void saveNotification(item);
    return item;
  };

  type OtpPurpose = 'APPLICATION_EMAIL' | 'TRACK_APPLICATION';
  const otpRecords = new Map<string, {
    identifier: string;
    purpose: OtpPurpose;
    otpHash: string;
    expiresAt: number;
    attempts: number;
    sends: number;
    lastSentAt: number;
    verifiedAt?: number;
    token?: string;
  }>();
  const OTP_TTL_MS = 5 * 60 * 1000;
  const OTP_COOLDOWN_MS = 60 * 1000;
  const OTP_MAX_ATTEMPTS = 5;
  const OTP_MAX_SENDS = 5;
  const ALLOW_DEMO_OTP = String(process.env.ALLOW_DEMO_OTP ?? 'true').toLowerCase() !== 'false';
  const DEMO_OTP = String(process.env.DEMO_OTP || '123456').replace(/\D/g, '').slice(0, 6).padStart(6, '0');

  const normalizeIdentifier = (value: string) => String(value || '').trim().toLowerCase();
  const normalizeOtp = (value: string) => String(value || '').replace(/\D/g, '').slice(0, 6);
  const otpKey = (identifier: string, purpose: OtpPurpose) => `${purpose}:${normalizeIdentifier(identifier)}`;
  const hashOtp = (otp: string) => crypto.createHash('sha256').update(`${otp}:${process.env.OTP_SECRET || 'dhani-local-otp-secret'}`).digest('hex');
  const makeOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const makeVerificationToken = () => crypto.randomBytes(24).toString('hex');
  const maskContact = (value: string) => value.includes('@')
    ? maskEmail(value)
    : value.replace(/^(\d{2})\d+(\d{2})$/, '$1******$2');

  const createOtp = async (identifier: string, purpose: OtpPurpose, label: string) => {
    const normalized = normalizeIdentifier(identifier);
    if (!normalized) return { ok: false, error: 'Please enter a valid email or contact.' };
    const key = otpKey(normalized, purpose);
    const existing = otpRecords.get(key);
    const nowMs = Date.now();
    if (existing && nowMs - existing.lastSentAt < OTP_COOLDOWN_MS) {
      return { ok: false, error: 'Please wait before requesting another OTP.' };
    }
    if (existing && existing.sends >= OTP_MAX_SENDS && nowMs < existing.expiresAt) {
      return { ok: false, error: 'Too many OTP requests. Please try again after a few minutes.' };
    }

    const otp = ALLOW_DEMO_OTP ? DEMO_OTP : makeOtp();
    otpRecords.set(key, {
      identifier: normalized,
      purpose,
      otpHash: hashOtp(otp),
      expiresAt: nowMs + OTP_TTL_MS,
      attempts: 0,
      sends: (existing?.sends || 0) + 1,
      lastSentAt: nowMs,
    });
    await sendOtpEmail(settings, normalized, otp, label);
    return { ok: true, masked: maskContact(normalized) };
  };

  const verifyOtp = (identifier: string, purpose: OtpPurpose, otp: string) => {
    const key = otpKey(identifier, purpose);
    const record = otpRecords.get(key);
    const nowMs = Date.now();
    const submittedOtp = normalizeOtp(otp);
    const isDemoOtp = ALLOW_DEMO_OTP && submittedOtp === DEMO_OTP;
    if (!record) {
      return { ok: false, error: 'The OTP is incorrect or has expired.' };
    }
    if (record.verifiedAt || (!isDemoOtp && nowMs > record.expiresAt)) {
      return { ok: false, error: 'The OTP is incorrect or has expired.' };
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      return { ok: false, error: 'Too many incorrect attempts. Please request a new OTP.' };
    }
    record.attempts += 1;
    if (!isDemoOtp && record.otpHash !== hashOtp(submittedOtp)) {
      otpRecords.set(key, record);
      return { ok: false, error: 'The OTP is incorrect or has expired.' };
    }
    record.verifiedAt = nowMs;
    record.token = makeVerificationToken();
    otpRecords.set(key, record);
    return { ok: true, token: record.token };
  };

  const consumeVerifiedOtp = (identifier: string, purpose: OtpPurpose, token: string) => {
    const key = otpKey(identifier, purpose);
    const record = otpRecords.get(key);
    if (!record || !record.verifiedAt || record.token !== token || Date.now() > record.expiresAt) return false;
    otpRecords.delete(key);
    return true;
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
    saveSettings(settings);
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'SETTINGS_UPDATED', 'CompanySettings', 'global', 'Updated company branding settings');
    res.json({ success: true, settings });
  });

  app.post('/api/otp/send', async (req, res) => {
    const { identifier, purpose } = req.body;
    const normalizedPurpose: OtpPurpose = purpose === 'TRACK_APPLICATION' ? 'TRACK_APPLICATION' : 'APPLICATION_EMAIL';
    const normalizedIdentifier = normalizeIdentifier(identifier);
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedIdentifier)) {
      res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
      return;
    }

    try {
      const result = await createOtp(
        normalizedIdentifier,
        normalizedPurpose,
        normalizedPurpose === 'TRACK_APPLICATION' ? 'Track Your Application' : 'Verify Your Email'
      );
      if (!result.ok) {
        res.status(429).json({ success: false, error: result.error });
        return;
      }
      res.json({
        success: true,
        maskedContact: result.masked,
        cooldownSeconds: 60,
        message: 'If the email is valid, a verification code has been sent.',
      });
    } catch (error) {
      console.error('OTP email send failed', error);
      res.status(500).json({ success: false, error: "We couldn't send the OTP. Please try again." });
    }
  });

  app.post('/api/otp/verify', (req, res) => {
    const { identifier, purpose, otp } = req.body;
    const normalizedPurpose: OtpPurpose = purpose === 'TRACK_APPLICATION' ? 'TRACK_APPLICATION' : 'APPLICATION_EMAIL';
    const result = verifyOtp(identifier, normalizedPurpose, otp);
    if (!result.ok) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, verificationToken: result.token });
  });

  // Auth: Login
  app.post('/api/auth/login', async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }

    const authRecord = await findUserAuthByEmail(String(email));
    const user = authRecord
      ? (typeof authRecord.data_json === 'string' ? JSON.parse(authRecord.data_json) : authRecord.data_json)
      : users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
    
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    if (!authRecord || !verifyPassword(String(password), authRecord.password_hash)) {
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
    saveUser(newUser, hashPassword(String(req.body.password || 'password123')));
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
    saveLoanProduct(product);
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

  const normPhone = (str: string) => String(str || '').replace(/\D/g, '').slice(-10);

  app.post('/api/applications/track', async (req, res) => {
    const { identifier, applicationId, contact, otp, stage } = req.body;
    const rawSearch = String(identifier || applicationId || contact || '').trim();
    const lookupValue = rawSearch.toLowerCase();
    const searchPhone = normPhone(rawSearch);

    const appItem = applications
      .filter((a) => {
        const aId = a.id.toLowerCase();
        const aPhone = normPhone(a.personalInfo?.mobile);
        const aEmail = a.personalInfo?.email?.toLowerCase();
        return (
          aId === lookupValue ||
          (searchPhone.length === 10 && aPhone === searchPhone) ||
          (aEmail && aEmail === lookupValue)
        );
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())[0];

    if (!appItem) {
      res.status(404).json({ success: false, error: 'Application not found. Please check your Application ID or registered mobile number.' });
      return;
    }

    // Stage 1: Verify existence of application before requesting OTP
    if (stage === 1 || (!otp && stage !== 2)) {
      const trackEmail = normalizeIdentifier(appItem.personalInfo?.email || '');
      if (!trackEmail) {
        res.status(400).json({ success: false, error: 'This application does not have an email address for OTP verification. Please contact support.' });
        return;
      }
      try {
        const otpResult = await createOtp(trackEmail, 'TRACK_APPLICATION', 'Track Your Application');
        if (!otpResult.ok) {
          res.status(429).json({ success: false, error: otpResult.error });
          return;
        }
      } catch (error) {
        console.error('Track OTP send failed', error);
        res.status(500).json({ success: false, error: "We couldn't send the OTP. Please try again." });
        return;
      }
      res.json({
        success: true,
        stage: 1,
        requiresOtp: true,
        applicationId: appItem.id,
        maskedMobile: maskContact(trackEmail),
        applicantName: appItem.personalInfo?.fullName,
        message: `A verification code has been sent to ${maskContact(trackEmail)}.`,
      });
      return;
    }

    // Stage 2: Verify OTP
    const verification = verifyOtp(appItem.personalInfo?.email || rawSearch, 'TRACK_APPLICATION', otp);
    if (!verification.ok) {
      addAuditLog('public', 'guest', rawSearch, 'TRACKING_VERIFICATION_FAILED', 'LoanApplication', appItem.id, 'OTP verification failed');
      res.status(403).json({ success: false, error: verification.error });
      return;
    }

    const matchingLoan = loanAccounts.find(
      (l) => l.applicationId === appItem.id || (l.userId && l.userId === appItem.userId)
    ) || null;

    addAuditLog('public', 'guest', rawSearch, 'TRACKING_VERIFIED', 'LoanApplication', appItem.id, 'Customer portal access verified via OTP');

    res.json({
      success: true,
      stage: 2,
      application: maskApplicationForPublic(appItem),
      loanAccount: matchingLoan,
      sessionToken: `cust_token_${appItem.id}_${Date.now()}`,
    });
  });

  app.post('/api/applications', (req, res) => {
    const { emailVerificationToken, ...data } = req.body;
    let appItem: LoanApplication;

    if (data.id && applications.some((a) => a.id === data.id)) {
      const idx = applications.findIndex((a) => a.id === data.id);
      appItem = { ...applications[idx], ...data, updatedAt: new Date().toISOString() };
      applications[idx] = appItem;
    } else {
      const applicantEmail = data.personalInfo?.email;
      if (!consumeVerifiedOtp(applicantEmail, 'APPLICATION_EMAIL', emailVerificationToken)) {
        res.status(403).json({ success: false, error: 'Please verify your email address before submitting the application.' });
        return;
      }
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

    saveApplication(appItem);
    void sendApplicationConfirmationEmail(settings, appItem.personalInfo?.email, {
      applicantName: appItem.personalInfo?.fullName || 'Applicant',
      applicationId: appItem.id,
      status: appItem.status,
    }).catch((error) => console.error('Application confirmation email failed', error));
    addNotification({
      userId: 'usr_admin_1',
      title: 'Application saved',
      message: `${appItem.personalInfo?.fullName || 'A customer'} saved loan application ${appItem.id}.`,
      type: 'info',
      link: `/admin/applications/${appItem.id}`,
    });
    if (appItem.userId) {
      addNotification({
        userId: appItem.userId,
        title: 'Application received',
        message: `Your loan application ${appItem.id} has been saved successfully.`,
        type: 'success',
        link: `/dashboard/applications/${appItem.id}`,
      });
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

    if (status === 'approved' || status === 'loan_disbursed' || status === 'active') {
      appItem.approvalDate = appItem.approvalDate || new Date().toISOString();
      const appAmt = appItem.approvedAmount || appItem.requestedAmount || 300000;
      const appRate = appItem.approvedRate || 12.5;
      const appTenure = appItem.approvedTenureMonths || appItem.requestedTenureMonths || 24;

      const calc = calculateEmi(appAmt, appRate, appTenure, 1.5);
      appItem.approvedAmount = appAmt;
      appItem.approvedRate = appRate;
      appItem.approvedTenureMonths = appTenure;
      appItem.approvedEmi = calc.monthlyEmi;

      // Check if loan account already exists
      const existingAccount = loanAccounts.find((l) => l.applicationId === appItem.id);
      if (!existingAccount) {
        const accountNo = `LA-2026-${Math.floor(100000 + Math.random() * 900000)}`;
        const newLoanAccount = {
          accountNumber: accountNo,
          applicationId: appItem.id,
          userId: appItem.userId,
          customerName: appItem.personalInfo.fullName,
          loanType: appItem.productType,
          principalAmount: appAmt,
          interestRate: appRate,
          tenureMonths: appTenure,
          monthlyEmi: calc.monthlyEmi,
          startDate: new Date().toISOString(),
          maturityDate: new Date(Date.now() + appTenure * 30 * 24 * 3600 * 1000).toISOString(),
          processingFee: appItem.processingFee || 2000,
          outstandingPrincipal: appAmt,
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
        saveLoanAccount(newLoanAccount);
      }
    }

    appItem.updatedAt = new Date().toISOString();
    applications[idx] = appItem;
    saveApplication(appItem);

    addNotification({
      userId: appItem.userId || 'usr_guest',
      title: 'Application status updated',
      message: `Application ${appItem.id} is now ${String(status).replace(/_/g, ' ')}.`,
      type: status === 'rejected' ? 'alert' : status === 'approved' || status === 'loan_disbursed' || status === 'active' ? 'success' : 'info',
      link: `/dashboard/applications/${appItem.id}`,
    });
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'APPLICATION_STATUS_UPDATED', 'LoanApplication', appItem.id, `Updated status to ${status}`);
    res.json({ success: true, application: appItem });
  });

  // Admin Request Processing Fee (Only allowed if all docs are verified)
  app.post('/api/applications/:id/request-processing-fee', (req, res) => {
    const { id } = req.params;
    const { feeAmount } = req.body;
    const appItem = applications.find((a) => a.id === id);

    if (!appItem) {
      res.status(404).json({ success: false, error: 'Application not found' });
      return;
    }

    // Check if mandatory documents are verified
    const unverifiedDocs = appItem.documents.filter((d) => d.status !== 'verified');
    if (unverifiedDocs.length > 0) {
      res.status(400).json({
        success: false,
        error: `Cannot request processing fee until all mandatory documents are verified. (${unverifiedDocs.length} document(s) pending/rejected).`,
      });
      return;
    }

    const fee = Number(feeAmount) || appItem.processingFee || 2000;
    appItem.processingFee = fee;
    appItem.status = 'processing_fee_pending';
    appItem.statusHistory.push({
      status: 'processing_fee_pending',
      date: new Date().toISOString(),
      note: `Processing fee requested by Admin: ₹${fee.toLocaleString('en-IN')}`,
      updatedBy: 'Admin',
    });
    appItem.updatedAt = new Date().toISOString();
    saveApplication(appItem);

    addNotification({
      userId: appItem.userId || 'usr_guest',
      title: 'Processing fee requested',
      message: `Processing fee of Rs ${fee.toLocaleString('en-IN')} is pending for application ${appItem.id}.`,
      type: 'warning',
      link: `/dashboard/applications/${appItem.id}`,
    });
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'PROCESSING_FEE_REQUESTED', 'LoanApplication', appItem.id, `Requested processing fee ₹${fee}`);
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
    const { loanAccountId, applicationId, userId, customerName, amount, purpose, utrNumber, proofScreenshotUrl, installmentNumber } = req.body;

    // Check duplicate UTR
    const duplicate = paymentSubmissions.find((p) => p.utrNumber.trim().toLowerCase() === utrNumber.trim().toLowerCase());
    if (duplicate) {
      res.status(400).json({ success: false, error: 'This UTR number has already been submitted for verification.' });
      return;
    }

    const paymentPurpose = purpose || 'emi';
    const newPayment: any = {
      id: `PAY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      loanAccountId: loanAccountId || '',
      applicationId: applicationId || '',
      userId: userId || 'usr_guest',
      customerName: customerName || 'Customer',
      amount: Number(amount),
      purpose: paymentPurpose,
      installmentNumber: installmentNumber ? Number(installmentNumber) : 1,
      upiIdUsed: settings.upiId,
      utrNumber,
      proofScreenshotUrl: proofScreenshotUrl || 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=600&fit=crop',
      paymentDate: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      status: 'pending_verification',
    };

    paymentSubmissions.unshift(newPayment);
    savePaymentSubmission(newPayment);
    addNotification({
      userId: 'usr_admin_1',
      title: 'Payment submitted',
      message: `${newPayment.customerName} submitted Rs ${Number(amount).toLocaleString('en-IN')} for ${paymentPurpose}.`,
      type: 'info',
      link: `/admin/payments/${newPayment.id}`,
    });

    // If processing fee submission, update application status
    if (paymentPurpose === 'processing_fee' && applicationId) {
      const appItem = applications.find((a) => a.id === applicationId);
      if (appItem) {
        appItem.status = 'processing_fee_submitted';
        appItem.statusHistory.push({
          status: 'processing_fee_submitted',
          date: new Date().toISOString(),
          note: `Processing fee payment submitted with UTR ${utrNumber}`,
          updatedBy: 'Customer',
        });
        appItem.updatedAt = new Date().toISOString();
        saveApplication(appItem);
      }
    }

    addAuditLog(userId || 'usr_guest', 'customer', customerName || 'Customer', 'PAYMENT_SUBMITTED', 'PaymentSubmission', newPayment.id, `Submitted UTR ${utrNumber} for ₹${amount} (${paymentPurpose})`);
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

      // If processing fee payment, update application status
      if (pay.purpose === 'processing_fee' && pay.applicationId) {
        const appItem = applications.find((a) => a.id === pay.applicationId);
        if (appItem) {
          appItem.status = 'payment_verified';
          appItem.statusHistory.push({
            status: 'payment_verified',
            date: new Date().toISOString(),
            note: `Processing fee payment verified by Admin: ₹${pay.amount.toLocaleString('en-IN')}`,
            updatedBy: 'Admin',
          });
          appItem.updatedAt = new Date().toISOString();
          saveApplication(appItem);
        }
      }

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
        saveLoanAccount(loan);
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
      saveReceipt(newReceipt);

      addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'PAYMENT_VERIFIED', 'PaymentSubmission', pay.id, `Approved payment UTR ${pay.utrNumber}`);
      addNotification({
        userId: pay.userId || 'usr_guest',
        title: 'Payment verified',
        message: `Payment ${pay.id} has been verified. Receipt ${receiptNo} is available.`,
        type: 'success',
        link: `/dashboard/payments/${pay.id}`,
      });
    } else {
      pay.status = 'rejected';
      pay.verificationNote = note || 'Invalid UTR or payment not reflected in bank account.';
      addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'PAYMENT_REJECTED', 'PaymentSubmission', pay.id, `Rejected payment UTR ${pay.utrNumber}`);
      addNotification({
        userId: pay.userId || 'usr_guest',
        title: 'Payment rejected',
        message: `Payment ${pay.id} could not be verified. Please review the note and submit again.`,
        type: 'alert',
        link: `/dashboard/payments/${pay.id}`,
      });
    }

    paymentSubmissions[payIdx] = pay;
    savePaymentSubmission(pay);
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
        saveSupportTicket(supportTickets[idx]);
        addNotification({
          userId: sender === 'support' ? supportTickets[idx].userId : 'usr_admin_1',
          title: sender === 'support' ? 'Support replied' : 'Customer support message',
          message: `${sender === 'support' ? 'Support' : supportTickets[idx].customerName} added a message to ticket ${ticketId}.`,
          type: 'info',
          link: `/support/tickets/${ticketId}`,
        });
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
    saveSupportTicket(newTicket);
    addNotification({
      userId: 'usr_admin_1',
      title: 'New support ticket',
      message: `${newTicket.customerName} opened ${newTicket.subject}.`,
      type: 'warning',
      link: `/admin/support/${newTicket.id}`,
    });
    res.json({ success: true, ticket: newTicket });
  });

  // Notifications
  app.get('/api/notifications', (req, res) => {
    const { userId, read } = req.query;
    let results = notifications;

    if (userId) {
      results = results.filter((notification) => notification.userId === String(userId));
    }
    if (read === 'true' || read === 'false') {
      const isRead = read === 'true';
      results = results.filter((notification) => notification.read === isRead);
    }

    res.json({ success: true, notifications: results });
  });

  app.post('/api/notifications', (req, res) => {
    const { userId, title, message, type, link } = req.body;
    if (!userId || !title || !message) {
      res.status(400).json({ success: false, error: 'userId, title, and message are required.' });
      return;
    }

    const notification = addNotification({
      userId,
      title,
      message,
      type: type || 'info',
      link,
    });

    res.status(201).json({ success: true, notification });
  });

  app.patch('/api/notifications/:id', (req, res) => {
    const { id } = req.params;
    const idx = notifications.findIndex((notification) => notification.id === id);
    if (idx === -1) {
      res.status(404).json({ success: false, error: 'Notification not found' });
      return;
    }

    const nextRead = typeof req.body.read === 'boolean' ? req.body.read : true;
    const updated = { ...notifications[idx], read: nextRead };
    notifications[idx] = updated;
    void saveNotification(updated);
    res.json({ success: true, notification: updated });
  });

  app.post('/api/notifications/read-all', (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ success: false, error: 'userId is required.' });
      return;
    }

    const updated = notifications.filter((notification) => notification.userId === userId && !notification.read);
    updated.forEach((notification) => {
      notification.read = true;
      void saveNotification(notification);
    });

    res.json({ success: true, updatedCount: updated.length });
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
      saveCustomer(customers[idx]);
    } else {
      const newCustomer = {
        ...cust,
        id: cust.id || `usr_cust_${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      customers.unshift(newCustomer);
      saveCustomer(newCustomer);
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
        if (status === 'rejected' && rejectionNote) {
          doc.rejectionNote = rejectionNote;
        } else if (status === 'verified') {
          delete doc.rejectionNote;
        }
        appItem.updatedAt = new Date().toISOString();
        saveApplication(appItem);
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
    saveCmsContent(cmsContent);
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
      saveStaffMember(staffMembers[idx]);
    } else {
      const newStaffMember = {
        ...member,
        id: `stf_${Date.now()}`,
        lastLogin: new Date().toISOString(),
      };
      staffMembers.unshift(newStaffMember);
      saveStaffMember(newStaffMember);
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
      saveEligibilityRule(eligibilityRules[idx]);
    } else {
      const newRule = { ...rule, id: `rule_${Date.now()}` };
      eligibilityRules.unshift(newRule);
      saveEligibilityRule(newRule);
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

    saveLoanAccount(loan);
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'LOAN_ADJUSTED', 'LoanAccount', accountNumber, `Loan adjustment: ${type} of ₹${amount || 0} (${reason})`);
    res.json({ success: true, loanAccount: loan });
  });


  if (serveClient) {
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
  }

  return app;
}

async function startServer() {
  const app = await createApp();
  const PORT = Number(process.env.PORT) || 3000;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

const isMainModule = /(?:^|[\\/])server\.(?:ts|js|cjs)$/.test(process.argv[1] || '');

if (isMainModule && !process.env.VERCEL) {
  startServer();
}
