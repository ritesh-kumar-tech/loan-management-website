import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { calculateEmi, calculateFOIR } from './src/utils/calculator';
import { APPLICATION_STATUSES } from './src/utils/statusConfig';
import { ApplicationStatus, AppNotification, EligibilityResult, LoanApplication, Receipt, SupportTicket } from './src/types';
import {
  applicationIdExists,
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
import {
  maskEmail,
  sendApplicationConfirmationEmail,
  sendApplicationStatusEmail,
  sendOtpEmail,
  sendPaymentReceivedEmail,
  sendSupportTicketEmails,
} from './src/utils/mailer';

interface CreateAppOptions {
  serveClient?: boolean;
}

// ---------------- FILE UPLOAD STORAGE ----------------
// Documents (KYC files) and payment-proof screenshots were previously only ever
// held as browser blob: URLs, which never leave the uploading tab - they are not
// retrievable after a refresh, by the admin, or from any other session, even
// though the UI showed a green "Uploaded" state. This gives uploads real,
// server-side, on-disk persistence.
const uploadsDir = path.join(process.cwd(), 'data', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_UPLOAD_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ALLOWED_UPLOAD_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    // The stored filename is always server-generated (never the client-supplied
    // originalname) so a crafted filename like "../../server.ts" can't escape
    // the uploads directory or overwrite another file.
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ALLOWED_UPLOAD_EXTENSIONS.has(ext) ? ext : ''}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype) || !ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
      cb(new Error('Only PDF, JPG, JPEG, and PNG files are allowed.'));
      return;
    }
    cb(null, true);
  },
});

// Server-generated UUID filenames (see above) - anything else is rejected
// outright before it ever reaches the filesystem.
const UPLOAD_FILENAME_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(\.[a-z0-9]{1,5})?$/i;

export async function createApp({ serveClient = true }: CreateAppOptions = {}) {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // Document/payment-proof upload. Kept unauthenticated to match this app's
  // existing pattern for customer-submitted artifacts (same trust model as
  // application creation itself); the returned URL is an unguessable UUID.
  app.post('/api/uploads', (req, res) => {
    upload.single('file')(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
          ? 'Each file must be 5 MB or smaller.'
          : err instanceof Error ? err.message : 'File upload failed.';
        res.status(400).json({ success: false, error: message });
        return;
      }
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file was uploaded.' });
        return;
      }
      res.json({
        success: true,
        fileUrl: `/api/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
      });
    });
  });

  app.get('/api/uploads/:filename', (req, res) => {
    const { filename } = req.params;
    if (!UPLOAD_FILENAME_PATTERN.test(filename)) {
      res.status(400).json({ success: false, error: 'Invalid file reference.' });
      return;
    }
    const filePath = path.join(uploadsDir, filename);
    if (!filePath.startsWith(uploadsDir) || !fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'File not found.' });
      return;
    }
    res.sendFile(filePath);
  });

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

  // ---------------- SESSION AUTH ----------------
  // Signed, stateless session tokens (HMAC-SHA256). Replaces the previous placeholder
  // `jwt_token_<id>_<timestamp>` string, which was never verified anywhere and let any
  // caller invoke admin-only endpoints without any credentials at all.
  const SESSION_SECRET = process.env.SESSION_SECRET || 'dhani-local-session-secret-change-in-production';
  const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

  type SessionPayload = { id: string; role: string; exp: number };

  const base64url = (buf: Buffer) => buf.toString('base64url');

  const signSessionToken = (payload: { id: string; role: string }): string => {
    const body = base64url(Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + SESSION_TTL_MS })));
    const signature = base64url(crypto.createHmac('sha256', SESSION_SECRET).update(body).digest());
    return `${body}.${signature}`;
  };

  const verifySessionToken = (token: string): SessionPayload | null => {
    const [body, signature] = String(token || '').split('.');
    if (!body || !signature) return null;
    const expectedSignature = base64url(crypto.createHmac('sha256', SESSION_SECRET).update(body).digest());
    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) return null;
    try {
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
      if (!payload?.exp || Date.now() > payload.exp) return null;
      return payload;
    } catch {
      return null;
    }
  };

  const getSessionFromRequest = (req: express.Request): SessionPayload | null => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    return token ? verifySessionToken(token) : null;
  };

  const requireRole = (...roles: string[]) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const session = getSessionFromRequest(req);
    if (!session || (roles.length > 0 && !roles.includes(session.role))) {
      res.status(401).json({ success: false, error: 'Authentication required for this action.' });
      return;
    }
    (req as any).authUser = session;
    next();
  };

  // Lightweight in-memory rate limiter for brute-force / enumeration protection on
  // public endpoints (login, application tracking). Not distributed-safe, but this
  // server already keeps all other state (OTP records, in-memory collections) the
  // same way, so it matches the existing architecture rather than adding new infra.
  const rateLimitHits = new Map<string, { count: number; windowStart: number }>();
  const checkRateLimit = (key: string, limit: number, windowMs: number): boolean => {
    const nowMs = Date.now();
    const entry = rateLimitHits.get(key);
    if (!entry || nowMs - entry.windowStart > windowMs) {
      rateLimitHits.set(key, { count: 1, windowStart: nowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };

  // Wraps an async route handler so a thrown/rejected error becomes a logged 500
  // response instead of an unhandled promise rejection (Express 4 does not catch
  // async errors automatically).
  const ah = (fn: (req: express.Request, res: express.Response) => Promise<void>) =>
    (req: express.Request, res: express.Response) => {
      Promise.resolve(fn(req, res)).catch((error) => {
        console.error(`Unhandled error on ${req.method} ${req.path}:`, error);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: 'An unexpected server error occurred. Please try again.' });
        }
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

  app.post('/api/settings', requireRole('admin'), ah(async (req, res) => {
    settings = { ...settings, ...req.body };
    await saveSettings(settings);
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'SETTINGS_UPDATED', 'CompanySettings', 'global', 'Updated company branding settings');
    res.json({ success: true, settings });
  }));

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
  app.post('/api/auth/login', ah(async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }

    const rateLimitKey = `login:${normalizeIdentifier(email)}`;
    if (!checkRateLimit(rateLimitKey, 10, 5 * 60 * 1000)) {
      res.status(429).json({ success: false, error: 'Too many login attempts. Please try again in a few minutes.' });
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
    res.json({ success: true, user, token: signSessionToken({ id: user.id, role: user.role }) });
  }));

  // Auth: Register
  app.post('/api/auth/register', ah(async (req, res) => {
    const { fullName, email, mobile } = req.body;
    if (!fullName || !String(fullName).trim() || !email || !mobile) {
      res.status(400).json({ success: false, error: 'Full name, email, and mobile number are required.' });
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(String(email).trim())) {
      res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
      return;
    }
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase() || u.mobile === mobile);

    if (existing) {
      res.json({ success: true, user: existing, token: signSessionToken({ id: existing.id, role: existing.role }) });
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
    await saveUser(newUser, hashPassword(String(req.body.password || 'password123')));
    addAuditLog(newUser.id, 'customer', newUser.email, 'USER_REGISTERED', 'User', newUser.id, 'New customer registration');
    res.json({ success: true, user: newUser, token: signSessionToken({ id: newUser.id, role: newUser.role }) });
  }));

  // Loan Products
  app.get('/api/loan-products', (req, res) => {
    res.json({ success: true, products: loanProducts });
  });

  app.post('/api/loan-products', requireRole('admin'), ah(async (req, res) => {
    const product = req.body;
    if (!product?.id || !product?.title) {
      res.status(400).json({ success: false, error: 'Loan product id and title are required.' });
      return;
    }
    const idx = loanProducts.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      loanProducts[idx] = product;
    } else {
      loanProducts.push(product);
    }
    await saveLoanProduct(product);
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'PRODUCT_SAVED', 'LoanProduct', product.id, `Saved product ${product.title}`);
    res.json({ success: true, products: loanProducts });
  }));

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
    // No userId scope requested: this returns every applicant's unmasked PII
    // (PAN, bank account, address) across the whole book, so it is admin-only.
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'admin') {
      res.status(401).json({ success: false, error: 'Authentication required to list all applications.' });
      return;
    }
    res.json({ success: true, applications });
  });

  app.get('/api/applications/:id', (req, res) => {
    res.status(403).json({ success: false, error: 'Use secure tracking verification or authenticated application lists.' });
  });

  const normPhone = (str: string) => String(str || '').replace(/\D/g, '').slice(-10);

  app.post('/api/applications/track', ah(async (req, res) => {
    const { identifier, applicationId, contact } = req.body;
    const rawSearch = String(identifier || applicationId || contact || '').trim();
    const lookupValue = rawSearch.toLowerCase();
    const searchPhone = normPhone(rawSearch);

    if (!rawSearch) {
      res.status(400).json({ success: false, error: 'Please enter your Application ID or registered mobile number.' });
      return;
    }
    if (lookupValue.includes('@')) {
      res.status(400).json({ success: false, error: 'Please track using Application ID or registered mobile number only.' });
      return;
    }

    // Application IDs/mobile numbers are guessable in a bounded search space;
    // throttle by requester IP to slow down enumeration attempts.
    if (!checkRateLimit(`track:${req.ip}`, 20, 5 * 60 * 1000)) {
      res.status(429).json({ success: false, error: 'Too many tracking attempts. Please try again in a few minutes.' });
      return;
    }

    const appItem = applications
      .filter((a) => {
        const aId = a.id.toLowerCase();
        const aPhone = normPhone(a.personalInfo?.mobile);
        return (
          aId === lookupValue ||
          (searchPhone.length === 10 && aPhone === searchPhone)
        );
      })
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())[0];

    if (!appItem) {
      res.status(404).json({ success: false, error: 'Application not found. Please check your Application ID or registered mobile number.' });
      return;
    }

    const matchingLoan = loanAccounts.find(
      (l) => l.applicationId === appItem.id || (l.userId && l.userId === appItem.userId)
    ) || null;

    addAuditLog('public', 'guest', rawSearch, 'TRACKING_ACCESSED', 'LoanApplication', appItem.id, 'Customer portal accessed by application ID or mobile number');

    res.json({
      success: true,
      stage: 1,
      requiresOtp: false,
      application: maskApplicationForPublic(appItem),
      loanAccount: matchingLoan,
      sessionToken: `cust_token_${appItem.id}_${Date.now()}`,
    });
  }));

  const validateNewApplicationPayload = (data: any): string | null => {
    const product = loanProducts.find((p) => p.id === data.productId);
    if (!data.productId || !product) return 'Please select a valid loan product.';

    const amount = Number(data.requestedAmount);
    if (!Number.isFinite(amount) || amount <= 0) return 'Please enter a valid requested loan amount.';
    if (amount < product.minAmount || amount > product.maxAmount) {
      return `Requested amount must be between ${product.minAmount} and ${product.maxAmount} for ${product.title}.`;
    }

    const tenure = Number(data.requestedTenureMonths);
    if (!Number.isFinite(tenure) || tenure <= 0) return 'Please select a valid loan tenure.';
    if (!data.purpose || !String(data.purpose).trim()) return 'Loan purpose is required.';

    const personal = data.personalInfo || {};
    if (!personal.fullName || !String(personal.fullName).trim()) return 'Applicant full name is required.';
    if (!personal.fatherOrSpouseName || !String(personal.fatherOrSpouseName).trim()) return "Father's or spouse's name is required.";
    if (!personal.dob || Number.isNaN(new Date(personal.dob).getTime())) return 'A valid date of birth is required.';

    const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panPattern.test(String(personal.panNumber || '').toUpperCase())) return 'A valid 10-character PAN number is required.';

    const mobileDigits = String(personal.mobile || '').replace(/\D/g, '');
    if (mobileDigits.length !== 10) return 'A valid 10-digit mobile number is required.';

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(String(personal.email || '').trim())) return 'A valid email address is required.';
    if (!personal.currentAddress || !String(personal.currentAddress).trim()) return 'Current residential address is required.';
    // Not required: the current apply form's Personal & Banking step has no
    // city/state/PIN-code inputs at all, so requiring one here made every
    // submission fail with no way for the customer to fix it. Still validated
    // (not just accepted blindly) if a caller does supply one.
    if (personal.pincode && !/^\d{6}$/.test(String(personal.pincode).trim())) return 'PIN code must be a valid 6-digit number.';

    const employment = data.employmentInfo || {};
    const validEmploymentTypes = ['salaried', 'self_employed_pro', 'self_employed_biz', 'freelancer'];
    if (!validEmploymentTypes.includes(employment.employmentType)) return 'A valid employment type is required.';

    const financial = data.financialInfo || {};
    if (!financial.bankName || !String(financial.bankName).trim()) return 'Bank name for disbursement is required.';
    if (!financial.accountNumber || !String(financial.accountNumber).trim()) return 'Bank account number is required.';
    const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscPattern.test(String(financial.ifscCode || '').toUpperCase())) return 'A valid 11-character IFSC code is required.';

    return null;
  };

  // Guards against duplicate application records from a double-click or a retried
  // request: the same mobile number submitting the same product/amount/purpose
  // within a short window is treated as a resubmit of the in-flight request rather
  // than a brand new application. The frontend already disables its submit button
  // while a request is pending, so in practice this only catches races the UI can't.
  const recentSubmissions = new Map<string, { appId: string; at: number }>();
  const DUPLICATE_SUBMISSION_WINDOW_MS = 15 * 1000;

  app.post('/api/applications', ah(async (req, res) => {
    const data = req.body;
    let appItem: LoanApplication;
    let isNewApplication = false;

    const isUpdate = Boolean(data.id && applications.some((a) => a.id === data.id));
    let dedupeKey: string | null = null;
    if (!isUpdate) {
      const validationError = validateNewApplicationPayload(data);
      if (validationError) {
        res.status(400).json({ success: false, error: validationError });
        return;
      }

      if (recentSubmissions.size > 2000) {
        for (const [key, value] of recentSubmissions) {
          if (Date.now() - value.at > DUPLICATE_SUBMISSION_WINDOW_MS) recentSubmissions.delete(key);
        }
      }

      dedupeKey = [
        normPhone(data.personalInfo?.mobile || ''),
        data.productId,
        Number(data.requestedAmount),
        String(data.purpose || '').trim().toLowerCase(),
      ].join('|');
      const recent = recentSubmissions.get(dedupeKey);
      if (recent && Date.now() - recent.at < DUPLICATE_SUBMISSION_WINDOW_MS) {
        const existing = applications.find((a) => a.id === recent.appId);
        if (existing) {
          res.json({ success: true, application: existing });
          return;
        }
      }
      recentSubmissions.set(dedupeKey, { appId: '', at: Date.now() });
    }

    if (isUpdate) {
      const idx = applications.findIndex((a) => a.id === data.id);
      appItem = { ...applications[idx], ...data, updatedAt: new Date().toISOString() };
      applications[idx] = appItem;
    } else {
      isNewApplication = true;
      // Checking the in-memory array alone is not sufficient: it only reflects
      // this process's view. A second server process (or this same process after
      // a restart where the array was reseeded at a different count) can compute
      // the same sequential ID; since saves upsert, that collision would silently
      // overwrite a different customer's application. Verify against the database
      // itself and retry on the rare collision.
      let newId = '';
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const candidateSeq = applications.length + 101 + attempt;
        const candidate = `LN-2026-${String(candidateSeq).padStart(6, '0')}`;
        if (applications.some((a) => a.id === candidate)) continue;
        if (await applicationIdExists(candidate)) continue;
        newId = candidate;
        break;
      }
      if (!newId) {
        newId = `LN-2026-${String(Date.now()).slice(-6)}`;
      }
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
      if (dedupeKey) recentSubmissions.set(dedupeKey, { appId: newId, at: Date.now() });
    }

    await saveApplication(appItem);
    if (isNewApplication) {
      void sendApplicationConfirmationEmail(settings, appItem.personalInfo?.email, {
        applicantName: appItem.personalInfo?.fullName || 'Applicant',
        applicationId: appItem.id,
        status: appItem.status,
        applicationDate: appItem.createdAt,
      });
    }
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
  }));

  const VALID_APPLICATION_STATUSES = new Set(APPLICATION_STATUSES.map((item) => item.value));

  // Application Status Change (Admin approval, rejection, request info)
  app.patch('/api/applications/:id/status', requireRole('admin'), ah(async (req, res) => {
    const { id } = req.params;
    const { status, note, approvedAmount, approvedRate, approvedTenureMonths, processingFee, rejectionReason } = req.body;

    if (!status || !VALID_APPLICATION_STATUSES.has(status)) {
      res.status(400).json({ success: false, error: 'A valid application status is required.' });
      return;
    }

    const idx = applications.findIndex((a) => a.id === id);
    if (idx === -1) {
      res.status(404).json({ success: false, error: 'Application not found' });
      return;
    }

    const appItem = applications[idx];
    const previousStatus = appItem.status;
    appItem.status = status as ApplicationStatus;
    if (previousStatus !== status) {
      appItem.statusHistory.push({
        status: status as ApplicationStatus,
        date: new Date().toISOString(),
        note: note || `Status updated to ${status}`,
        updatedBy: 'Admin',
      });
    }

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
        await saveLoanAccount(newLoanAccount);
      }
    }

    appItem.updatedAt = new Date().toISOString();
    applications[idx] = appItem;
    await saveApplication(appItem);
    void sendApplicationStatusEmail(settings, appItem, previousStatus);

    addNotification({
      userId: appItem.userId || 'usr_guest',
      title: 'Application status updated',
      message: `Application ${appItem.id} is now ${String(status).replace(/_/g, ' ')}.`,
      type: status === 'rejected' ? 'alert' : status === 'approved' || status === 'loan_disbursed' || status === 'active' ? 'success' : 'info',
      link: `/dashboard/applications/${appItem.id}`,
    });
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'APPLICATION_STATUS_UPDATED', 'LoanApplication', appItem.id, `Updated status to ${status}`);
    res.json({ success: true, application: appItem });
  }));

  // Admin Request Processing Fee (Only allowed if all docs are verified)
  app.post('/api/applications/:id/request-processing-fee', requireRole('admin'), ah(async (req, res) => {
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
    const previousStatus = appItem.status;
    appItem.processingFee = fee;
    appItem.status = 'processing_fee_pending';
    if (previousStatus !== 'processing_fee_pending') {
      appItem.statusHistory.push({
        status: 'processing_fee_pending',
        date: new Date().toISOString(),
        note: `Processing fee requested by Admin: ₹${fee.toLocaleString('en-IN')}`,
        updatedBy: 'Admin',
      });
    }
    appItem.updatedAt = new Date().toISOString();
    await saveApplication(appItem);
    void sendApplicationStatusEmail(settings, appItem, previousStatus);

    addNotification({
      userId: appItem.userId || 'usr_guest',
      title: 'Processing fee requested',
      message: `Processing fee of Rs ${fee.toLocaleString('en-IN')} is pending for application ${appItem.id}.`,
      type: 'warning',
      link: `/dashboard/applications/${appItem.id}`,
    });
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'PROCESSING_FEE_REQUESTED', 'LoanApplication', appItem.id, `Requested processing fee ₹${fee}`);
    res.json({ success: true, application: appItem });
  }));

  // Loan Accounts
  app.get('/api/loan-accounts', (req, res) => {
    const { userId } = req.query;
    if (userId) {
      res.json({ success: true, loanAccounts: loanAccounts.filter((l) => l.userId === userId) });
      return;
    }
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'admin') {
      res.status(401).json({ success: false, error: 'Authentication required to list all loan accounts.' });
      return;
    }
    res.json({ success: true, loanAccounts });
  });

  // Payments: Submit Proof
  app.post('/api/payments/submit', ah(async (req, res) => {
    const { loanAccountId, applicationId, userId, customerName, amount, purpose, utrNumber, proofScreenshotUrl, installmentNumber } = req.body;

    if (!utrNumber || !String(utrNumber).trim()) {
      res.status(400).json({ success: false, error: 'A valid UTR / transaction reference number is required.' });
      return;
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ success: false, error: 'A valid payment amount is required.' });
      return;
    }
    if (!loanAccountId && !applicationId) {
      res.status(400).json({ success: false, error: 'A related application or loan account is required.' });
      return;
    }

    // Check duplicate UTR (in-memory fast path; the DB layer also enforces a
    // UNIQUE constraint on utr_number as the source of truth under a race).
    const duplicate = paymentSubmissions.find((p) => p.utrNumber.trim().toLowerCase() === utrNumber.trim().toLowerCase());
    if (duplicate) {
      res.status(409).json({ success: false, error: 'This UTR number has already been submitted for verification.' });
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
      // Screenshot proof is optional - fabricating a stand-in image here would make
      // an admin reviewer see what looks like real customer-submitted proof for a
      // payment that actually had none attached.
      proofScreenshotUrl: proofScreenshotUrl || '',
      paymentDate: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      status: 'pending_verification',
    };

    paymentSubmissions.unshift(newPayment);
    try {
      await savePaymentSubmission(newPayment);
    } catch (error) {
      paymentSubmissions.shift();
      const message = error instanceof Error ? error.message : String(error);
      if (/duplicate|unique/i.test(message)) {
        res.status(409).json({ success: false, error: 'This UTR number has already been submitted for verification.' });
        return;
      }
      throw error;
    }
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
        await saveApplication(appItem);
      }
    }

    addAuditLog(userId || 'usr_guest', 'customer', customerName || 'Customer', 'PAYMENT_SUBMITTED', 'PaymentSubmission', newPayment.id, `Submitted UTR ${utrNumber} for ₹${amount} (${paymentPurpose})`);
    res.json({ success: true, payment: newPayment });
  }));

  app.get('/api/payments', (req, res) => {
    const { userId, applicationId, loanAccountId } = req.query;
    if (userId || applicationId || loanAccountId) {
      const filtered = paymentSubmissions.filter((p) =>
        (userId ? p.userId === userId : true) &&
        (applicationId ? p.applicationId === applicationId : true) &&
        (loanAccountId ? p.loanAccountId === loanAccountId : true)
      );
      res.json({ success: true, payments: filtered });
      return;
    }
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'admin') {
      res.status(401).json({ success: false, error: 'Authentication required to list all payments.' });
      return;
    }
    res.json({ success: true, payments: paymentSubmissions });
  });

  // Payments: Admin Verification / Approval
  app.post('/api/payments/:id/verify', requireRole('admin'), ah(async (req, res) => {
    const { id } = req.params;
    const { action, note } = req.body; // 'approve' | 'reject'

    const payIdx = paymentSubmissions.findIndex((p) => p.id === id);
    if (payIdx === -1) {
      res.status(404).json({ success: false, error: 'Payment record not found' });
      return;
    }

    const pay = paymentSubmissions[payIdx];
    // Idempotency guard: a payment that has already reached a final state must not
    // be re-processed. Without this, a double-click/retry on "Approve" would mint a
    // second receipt and double-count the amount against the loan ledger.
    if (pay.status === 'verified' || pay.status === 'rejected') {
      res.json({ success: true, payment: pay });
      return;
    }
    let verifiedApplication: LoanApplication | undefined;
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
          verifiedApplication = appItem;
          appItem.status = 'payment_verified';
          appItem.statusHistory.push({
            status: 'payment_verified',
            date: new Date().toISOString(),
            note: `Processing fee payment verified by Admin: ₹${pay.amount.toLocaleString('en-IN')}`,
            updatedBy: 'Admin',
          });
          appItem.updatedAt = new Date().toISOString();
          await saveApplication(appItem);
        }
      }
      verifiedApplication = verifiedApplication || applications.find((a) => a.id === pay.applicationId);

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
        await saveLoanAccount(loan);
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
      await saveReceipt(newReceipt);

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
    await savePaymentSubmission(pay);
    if (action === 'approve') {
      void sendPaymentReceivedEmail(settings, verifiedApplication || applications.find((a) => a.id === pay.applicationId), pay);
    }
    res.json({ success: true, payment: pay });
  }));

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
    const { userId } = req.query;
    if (userId) {
      res.json({ success: true, tickets: supportTickets.filter((t) => t.userId === userId) });
      return;
    }
    const session = getSessionFromRequest(req);
    if (!session || session.role !== 'admin') {
      res.status(401).json({ success: false, error: 'Authentication required to list all support tickets.' });
      return;
    }
    res.json({ success: true, tickets: supportTickets });
  });

  app.post('/api/support/tickets', ah(async (req, res) => {
    const { ticketId, sender, text, category, subject, userId, customerName, customerEmail, email, phone, applicationId } = req.body;
    if (!text || !String(text).trim()) {
      res.status(400).json({ success: false, error: 'Message text is required.' });
      return;
    }
    // Replying as 'support' impersonates the company on the ticket thread and
    // notifies the customer, so it must be an authenticated admin/staff action.
    if (sender === 'support') {
      const session = getSessionFromRequest(req);
      if (!session || session.role !== 'admin') {
        res.status(401).json({ success: false, error: 'Authentication required to reply as support.' });
        return;
      }
    }
    if (ticketId) {
      const idx = supportTickets.findIndex((t) => t.id === ticketId);
      if (idx >= 0) {
        supportTickets[idx].messages.push({ sender, text, date: new Date().toISOString() });
        supportTickets[idx].updatedAt = new Date().toISOString();
        await saveSupportTicket(supportTickets[idx]);
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

    const matchedUser = users.find((u) => u.id === userId);
    const matchedApplication = applicationId
      ? applications.find((a) => a.id === applicationId)
      : applications.find((a) => a.userId === userId);
    const resolvedCustomerEmail = customerEmail || email || matchedUser?.email || matchedApplication?.personalInfo?.email;
    const resolvedPhone = phone || matchedUser?.mobile || matchedApplication?.personalInfo?.mobile;

    const newTicket: SupportTicket & { customerEmail?: string; phone?: string } = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: userId || 'usr_customer_1',
      customerName: customerName || 'Aniket Verma',
      category: category || 'General Query',
      subject: subject || 'Help Request',
      description: text,
      applicationId: applicationId || matchedApplication?.id,
      customerEmail: resolvedCustomerEmail,
      phone: resolvedPhone,
      priority: 'medium',
      status: 'open',
      messages: [{ sender: 'customer', text, date: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    supportTickets.unshift(newTicket);
    await saveSupportTicket(newTicket);
    void sendSupportTicketEmails(settings, newTicket, resolvedCustomerEmail);
    addNotification({
      userId: 'usr_admin_1',
      title: 'New support ticket',
      message: `${newTicket.customerName} opened ${newTicket.subject}.`,
      type: 'warning',
      link: `/admin/support/${newTicket.id}`,
    });
    res.json({ success: true, ticket: newTicket });
  }));

  // Notifications
  app.get('/api/notifications', (req, res) => {
    const { userId, read } = req.query;
    let results = notifications;

    if (userId) {
      results = results.filter((notification) => notification.userId === String(userId));
    } else {
      const session = getSessionFromRequest(req);
      if (!session || session.role !== 'admin') {
        res.status(401).json({ success: false, error: 'Authentication required to list all notifications.' });
        return;
      }
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
  app.get('/api/audit-logs', requireRole('admin'), (req, res) => {
    res.json({ success: true, auditLogs });
  });

  app.get('/api/admin/dashboard/summary', requireRole('admin'), (req, res) => {
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
  app.get('/api/receipts', requireRole('admin'), (req, res) => {
    res.json({ success: true, receipts });
  });

  // Customers Management
  app.get('/api/customers', requireRole('admin'), (req, res) => {
    res.json({ success: true, customers });
  });

  app.post('/api/customers', requireRole('admin'), ah(async (req, res) => {
    const cust = req.body;
    const idx = customers.findIndex((c) => c.id === cust.id);
    if (idx >= 0) {
      customers[idx] = { ...customers[idx], ...cust };
      await saveCustomer(customers[idx]);
    } else {
      const newCustomer = {
        ...cust,
        id: cust.id || `usr_cust_${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      customers.unshift(newCustomer);
      await saveCustomer(newCustomer);
    }
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'CUSTOMER_UPDATED', 'Customer', cust.id || 'new', `Updated customer ${cust.fullName || cust.email}`);
    res.json({ success: true, customers });
  }));

  const VALID_DOCUMENT_STATUSES = new Set(['pending', 'verified', 'rejected', 'reupload_required']);

  // Document Verification Endpoint
  app.post('/api/documents/verify', requireRole('admin'), ah(async (req, res) => {
    const { applicationId, documentId, status, rejectionNote } = req.body;
    if (!VALID_DOCUMENT_STATUSES.has(status)) {
      res.status(400).json({ success: false, error: 'A valid document status is required.' });
      return;
    }
    const appItem = applications.find((a) => a.id === applicationId);
    if (!appItem) {
      res.status(404).json({ success: false, error: 'Application not found' });
      return;
    }
    const doc = appItem.documents?.find((d) => d.id === documentId);
    if (!doc) {
      res.status(404).json({ success: false, error: 'Document not found on this application' });
      return;
    }
    doc.status = status;
    if (status === 'rejected' && rejectionNote) {
      doc.rejectionNote = rejectionNote;
    } else if (status === 'verified') {
      delete doc.rejectionNote;
    }
    appItem.updatedAt = new Date().toISOString();
    await saveApplication(appItem);
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'DOCUMENT_VERIFIED', 'ApplicationDocument', documentId, `Document ${doc.title} marked ${status}`);
    res.json({ success: true, application: appItem });
  }));

  // CMS Content Management
  app.get('/api/cms', (req, res) => {
    res.json({ success: true, cms: cmsContent });
  });

  app.post('/api/cms', requireRole('admin'), (req, res) => {
    cmsContent = { ...cmsContent, ...req.body };
    saveCmsContent(cmsContent);
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'CMS_UPDATED', 'CmsContent', 'global', 'Updated website CMS content');
    res.json({ success: true, cms: cmsContent });
  });

  // Staff & Permissions
  app.get('/api/staff', requireRole('admin'), (req, res) => {
    res.json({ success: true, staff: staffMembers });
  });

  app.post('/api/staff', requireRole('admin'), ah(async (req, res) => {
    const member = req.body;
    const idx = staffMembers.findIndex((s) => s.id === member.id);
    if (idx >= 0) {
      staffMembers[idx] = { ...staffMembers[idx], ...member };
      await saveStaffMember(staffMembers[idx]);
    } else {
      const newStaffMember = {
        ...member,
        id: `stf_${Date.now()}`,
        lastLogin: new Date().toISOString(),
      };
      staffMembers.unshift(newStaffMember);
      await saveStaffMember(newStaffMember);
    }
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'STAFF_SAVED', 'StaffMember', member.id || 'new', `Saved staff member ${member.fullName}`);
    res.json({ success: true, staff: staffMembers });
  }));

  // Eligibility Rules
  app.get('/api/eligibility/rules', requireRole('admin'), (req, res) => {
    res.json({ success: true, rules: eligibilityRules });
  });

  app.post('/api/eligibility/rules', requireRole('admin'), ah(async (req, res) => {
    const rule = req.body;
    const idx = eligibilityRules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      eligibilityRules[idx] = rule;
      await saveEligibilityRule(eligibilityRules[idx]);
    } else {
      const newRule = { ...rule, id: `rule_${Date.now()}` };
      eligibilityRules.unshift(newRule);
      await saveEligibilityRule(newRule);
    }
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'RULE_SAVED', 'EligibilityRule', rule.id || 'new', `Saved eligibility rule ${rule.ruleName}`);
    res.json({ success: true, rules: eligibilityRules });
  }));

  // Loan Manual Adjustments
  app.post('/api/loans/:accountNumber/adjust', requireRole('admin'), ah(async (req, res) => {
    const { accountNumber } = req.params;
    const { type, amount, reason, installmentNumber } = req.body; // type: 'waive_charge' | 'offline_payment' | 'reschedule'
    const loan = loanAccounts.find((l) => l.accountNumber === accountNumber);

    if (!loan) {
      res.status(404).json({ success: false, error: 'Loan account not found' });
      return;
    }

    if (type === 'offline_payment' && amount) {
      const pAmt = Number(amount);
      if (!Number.isFinite(pAmt) || pAmt <= 0) {
        res.status(400).json({ success: false, error: 'A valid adjustment amount is required.' });
        return;
      }
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

    await saveLoanAccount(loan);
    addAuditLog('usr_admin_1', 'admin', 'admin@dhanifinance.in', 'LOAN_ADJUSTED', 'LoanAccount', accountNumber, `Loan adjustment: ${type} of ₹${amount || 0} (${reason})`);
    res.json({ success: true, loanAccount: loan });
  }));

  // Fallback error handler: catches anything that slips past route-level handling
  // (e.g. malformed JSON bodies) so clients always get a JSON error instead of an
  // HTML stack trace or a hung connection. Must be registered after all routes.
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`Unhandled error on ${req.method} ${req.path}:`, err);
    if (res.headersSent) {
      next(err);
      return;
    }
    res.status(err?.status || 500).json({ success: false, error: 'An unexpected server error occurred. Please try again.' });
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
      app.get('*', (req, res) => {
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
