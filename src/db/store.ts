import { getDb, runMigrations } from './database';
import { hashPassword } from './security';
import {
  AppNotification,
  AuditLog,
  CompanySettings,
  LoanAccount,
  LoanApplication,
  LoanProduct,
  PaymentSubmission,
  Receipt,
  SupportTicket,
  User,
} from '../types';
import {
  defaultApplications,
  defaultAuditLogs,
  defaultCmsContent,
  defaultCustomers,
  defaultEligibilityRules,
  defaultLoanAccounts,
  defaultLoanProducts,
  defaultNotifications,
  defaultPaymentSubmissions,
  defaultReceipts,
  defaultSettings,
  defaultStaff,
  defaultSupportTickets,
  defaultUsers,
} from '../data/mockDatabase';
import { calculateEmi } from '../utils/calculator';

type AnyRecord = Record<string, any>;

const toJson = (value: unknown) => JSON.stringify(value);
const fromJson = <T>(value: string) => JSON.parse(value) as T;
const now = () => new Date().toISOString();
const boolInt = (value: unknown) => (value ? 1 : 0);

const normalPhone = (value: string) => String(value || '').replace(/\D/g, '').slice(-10);

const tableData = <T>(table: string) => {
  const db = getDb();
  return db.prepare(`SELECT data_json FROM ${table}`).all().map((row: any) => fromJson<T>(row.data_json));
};

const singleData = <T>(table: string, fallback: T) => {
  const db = getDb();
  const row = db.prepare(`SELECT data_json FROM ${table} WHERE id = 'global'`).get() as any;
  return row ? fromJson<T>(row.data_json) : fallback;
};

const generatedApplications = (): LoanApplication[] => {
  const samples = [
    ['usr_seed_1', 'prod_personal', 'personal', 'Personal Loan', 'Rahul Nair', 'rahul.nair@example.com', '9000010001', 220000, 24, 'Medical expenses', 'approved'],
    ['usr_seed_2', 'prod_home', 'home', 'Home Loan', 'Sneha Kapoor', 'sneha.kapoor@example.com', '9000010002', 2500000, 180, 'Apartment purchase', 'documents_pending'],
    ['usr_seed_3', 'prod_vehicle', 'vehicle', 'Vehicle / Auto Loan', 'Arjun Singh', 'arjun.singh@example.com', '9000010003', 650000, 48, 'New car purchase', 'approved'],
    ['usr_seed_4', 'prod_business', 'business', 'Business Growth Loan', 'Meera Iyer', 'meera.iyer@example.com', '9000010004', 1200000, 36, 'Working capital', 'under_review'],
    ['usr_seed_5', 'prod_education', 'education', 'Education Loan', 'Karan Shah', 'karan.shah@example.com', '9000010005', 900000, 60, 'Postgraduate tuition', 'approved'],
    ['usr_seed_6', 'prod_lap', 'lap', 'Loan Against Property', 'Nisha Rao', 'nisha.rao@example.com', '9000010006', 3500000, 120, 'Business expansion', 'rejected'],
    ['usr_seed_7', 'prod_personal', 'personal', 'Personal Loan', 'Dev Patel', 'dev.patel@example.com', '9000010007', 180000, 18, 'Travel and family needs', 'approved'],
    ['usr_seed_8', 'prod_business', 'business', 'Business Growth Loan', 'Fatima Khan', 'fatima.khan@example.com', '9000010008', 700000, 30, 'Inventory purchase', 'processing_fee_pending'],
  ] as const;

  return samples.map((sample, idx) => {
    const [userId, productId, productType, productTitle, fullName, email, mobile, amount, tenure, purpose, status] = sample;
    const createdAt = `2026-03-${String(idx + 1).padStart(2, '0')}T09:30:00Z`;
    return {
      id: `LN-2026-00020${idx + 1}`,
      userId,
      productId,
      productType,
      productTitle,
      requestedAmount: amount,
      requestedTenureMonths: tenure,
      purpose,
      status,
      statusHistory: [{ status: 'submitted', date: createdAt, note: 'Seed test application submitted online' }],
      personalInfo: {
        fullName,
        fatherOrSpouseName: 'Test Relative',
        dob: '1990-01-15',
        gender: idx % 2 ? 'female' : 'male',
        maritalStatus: 'married',
        nationality: 'Indian',
        email,
        mobile,
        panNumber: `TESTP${idx + 1}234F`,
        aadhaarLast4: String(4400 + idx),
        currentAddress: `Seed Address ${idx + 1}`,
        permanentAddress: `Seed Address ${idx + 1}`,
        city: idx % 2 ? 'Mumbai' : 'Delhi',
        state: idx % 2 ? 'Maharashtra' : 'Delhi',
        pincode: idx % 2 ? '400001' : '110001',
        residenceType: 'rented',
      },
      employmentInfo: {
        employmentType: idx % 2 ? 'self_employed_biz' : 'salaried',
        companyOrBizName: 'Seed Finance Customer',
        designationOrBizType: idx % 2 ? 'Proprietor' : 'Manager',
        monthlyIncome: 65000 + idx * 8000,
        workExperienceYears: 4 + idx,
        officeAddress: 'Seed Office Address',
        salaryBankName: 'HDFC Bank',
      },
      financialInfo: {
        monthlyIncome: 65000 + idx * 8000,
        additionalIncome: 5000,
        existingEmis: 8000,
        monthlyExpenses: 25000,
        bankName: 'HDFC Bank',
        accountNumber: `XXXXXX77${idx}9`,
        ifscCode: 'HDFC0000001',
        accountHolderName: fullName,
        preferredEmiDay: 5,
      },
      references: [{ name: 'Seed Reference', relationship: 'Friend', mobile: `91111000${idx}`, address: 'India' }],
      documents: [
        { id: `seed_doc_${idx}_pan`, docType: 'pan', title: 'PAN Card', fileName: 'pan.pdf', fileUrl: '#', uploadedAt: createdAt, status: idx % 3 === 0 ? 'pending' : 'verified' },
        { id: `seed_doc_${idx}_bank`, docType: 'bank_statement', title: 'Bank Statement', fileName: 'bank.pdf', fileUrl: '#', uploadedAt: createdAt, status: 'verified' },
      ],
      createdAt,
      updatedAt: createdAt,
    } as LoanApplication;
  });
};

const generatedUsers = (): User[] =>
  generatedApplications().map((app) => ({
    id: app.userId,
    fullName: app.personalInfo.fullName,
    email: app.personalInfo.email,
    mobile: app.personalInfo.mobile,
    role: 'customer',
    isVerified: true,
    createdAt: app.createdAt,
  }));

const generatedLoanAccounts = (applications: LoanApplication[]): LoanAccount[] =>
  applications
    .filter((app) => app.status === 'approved' || app.status === 'active' || app.status === 'loan_disbursed')
    .map((app, idx) => {
      const principal = app.requestedAmount;
      const rate = idx ? 11.25 : 10.75;
      const calc = calculateEmi(principal, rate, app.requestedTenureMonths);
      return {
        accountNumber: `LA-2026-99020${idx + 1}`,
        applicationId: app.id,
        userId: app.userId,
        customerName: app.personalInfo.fullName,
        loanType: app.productType,
        principalAmount: principal,
        interestRate: rate,
        tenureMonths: app.requestedTenureMonths,
        monthlyEmi: calc.monthlyEmi,
        startDate: '2026-04-01T00:00:00Z',
        maturityDate: new Date(Date.UTC(2026, 3 + app.requestedTenureMonths, 1)).toISOString(),
        processingFee: Math.round(principal * 0.015),
        outstandingPrincipal: principal,
        totalPaid: 0,
        totalOverdue: 0,
        status: 'active',
        schedule: calc.schedule.map((row, scheduleIdx) => ({
          installmentNumber: row.month,
          dueDate: new Date(Date.UTC(2026, 4 + scheduleIdx, 5)).toISOString(),
          openingPrincipal: row.openingPrincipal,
          emiAmount: row.emi,
          principalComponent: row.principalPayment,
          interestComponent: row.interestPayment,
          charges: 0,
          closingPrincipal: row.closingPrincipal,
          status: scheduleIdx === 0 ? 'due' : 'upcoming',
          paidAmount: 0,
        })),
        createdAt: app.updatedAt,
      };
    });

export const seedDatabaseIfEmpty = (force = false) => {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) AS count FROM users').get() as any).count as number;
  if (!force && count > 0) return;

  const seedApps = generatedApplications();
  const seedUsers = [...defaultUsers, ...generatedUsers()];
  const seedCustomers = [
    ...defaultCustomers,
    ...seedApps.map((app) => ({
      id: app.userId,
      fullName: app.personalInfo.fullName,
      email: app.personalInfo.email,
      mobile: app.personalInfo.mobile,
      role: 'customer',
      isVerified: true,
      createdAt: app.createdAt,
      kycStatus: app.documents.every((doc) => doc.status === 'verified') ? 'verified' : 'pending',
      accountStatus: 'active',
      totalApplications: 1,
      activeLoans: app.status === 'approved' ? 1 : 0,
      outstandingAmount: app.status === 'approved' ? app.requestedAmount : 0,
      assignedStaff: 'Neha Sharma',
      panNumber: app.personalInfo.panNumber,
      aadhaarLast4: app.personalInfo.aadhaarLast4,
      city: app.personalInfo.city,
      state: app.personalInfo.state,
    })),
  ];
  const allApps = [...defaultApplications, ...seedApps];
  const allLoans = [...defaultLoanAccounts, ...generatedLoanAccounts(seedApps)];

  const payments: PaymentSubmission[] = [
    ...defaultPaymentSubmissions,
    ...allLoans.slice(0, 5).map((loan, idx) => ({
      id: `PAY-2026-02${idx + 1}`,
      loanAccountId: loan.accountNumber,
      applicationId: loan.applicationId,
      userId: loan.userId,
      customerName: loan.customerName,
      amount: loan.monthlyEmi,
      purpose: 'emi' as const,
      installmentNumber: 1,
      upiIdUsed: defaultSettings.upiId,
      utrNumber: `UTRSEED202600${idx + 1}`,
      proofScreenshotUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=600&fit=crop',
      paymentDate: `2026-04-0${idx + 1}T10:00:00Z`,
      submittedAt: `2026-04-0${idx + 1}T10:05:00Z`,
      status: idx < 3 ? ('verified' as const) : ('pending_verification' as const),
      verifiedBy: idx < 3 ? 'Admin' : undefined,
      verifiedAt: idx < 3 ? `2026-04-0${idx + 1}T12:00:00Z` : undefined,
      receiptNumber: idx < 3 ? `RCT-2026-02${idx + 1}` : undefined,
    })),
  ];

  const receipts: Receipt[] = [
    ...defaultReceipts,
    ...payments
      .filter((payment) => payment.status === 'verified' && payment.receiptNumber)
      .map((payment) => ({
        receiptNumber: payment.receiptNumber!,
        paymentId: payment.id,
        loanAccountId: payment.loanAccountId,
        applicationId: payment.applicationId,
        customerName: payment.customerName,
        amountPaid: payment.amount,
        paymentMethod: 'UPI',
        utrNumber: payment.utrNumber,
        paymentDate: payment.paymentDate,
        verificationDate: payment.verifiedAt || now(),
        remainingBalance: 0,
        nextDueDate: '2026-05-05T00:00:00Z',
        qrVerificationCode: `http://localhost:3000/verify-receipt?id=${payment.receiptNumber}`,
      })),
  ];

  const seed = db.transaction(() => {
    saveSettings(defaultSettings);
    saveCmsContent(defaultCmsContent);
    seedUsers.forEach((user) => saveUser(user, hashPassword('password123')));
    defaultLoanProducts.forEach(saveLoanProduct);
    allApps.forEach(saveApplication);
    allLoans.forEach(saveLoanAccount);
    payments.forEach(savePaymentSubmission);
    receipts.forEach(saveReceipt);
    [
      ...defaultSupportTickets,
      ...seedApps.slice(0, 5).map((app, idx) => ({
        id: `TKT-SEED-${idx + 1}`,
        userId: app.userId,
        customerName: app.personalInfo.fullName,
        category: idx % 2 ? 'Application Status' : 'Document Verification',
        subject: `Seed support request ${idx + 1}`,
        description: 'Seed ticket for backend testing.',
        applicationId: app.id,
        priority: idx === 0 ? 'high' : 'medium',
        status: idx < 2 ? 'in_progress' : 'open',
        messages: [{ sender: 'customer', text: 'Please help me with my loan application.', date: app.createdAt }],
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      })),
    ].forEach((ticket) => saveSupportTicket(ticket as SupportTicket));
    [
      ...defaultNotifications,
      ...seedApps.slice(0, 5).map((app, idx) => ({
        id: `notif_seed_${idx + 1}`,
        userId: app.userId,
        title: `Application ${app.status.replace(/_/g, ' ')}`,
        message: `Your ${app.productTitle} application ${app.id} is ${app.status.replace(/_/g, ' ')}.`,
        type: idx % 2 ? 'info' : 'success',
        read: false,
        createdAt: app.updatedAt,
        link: '/dashboard',
      })),
    ].forEach((notification) => saveNotification(notification as AppNotification));
    defaultAuditLogs.forEach(saveAuditLog);
    seedCustomers.forEach(saveCustomer);
    [
      ...defaultStaff,
      {
        id: 'stf_4',
        fullName: 'Asha Menon',
        email: 'asha.menon@dhanifinance.in',
        phone: '9811100004',
        role: 'document_verifier',
        department: 'Operations',
        status: 'active',
        lastLogin: '2026-08-02T12:00:00Z',
        permissions: ['verify_documents', 'view_applications'],
      },
      {
        id: 'stf_5',
        fullName: 'Imran Qureshi',
        email: 'imran.qureshi@dhanifinance.in',
        phone: '9811100005',
        role: 'support_agent',
        department: 'Customer Support',
        status: 'active',
        lastLogin: '2026-08-02T13:00:00Z',
        permissions: ['view_support', 'reply_support'],
      },
    ].forEach(saveStaffMember);
    [
      ...defaultEligibilityRules,
      { id: 'rule_3', productType: 'personal', ruleName: 'Minimum Age Personal Loan', field: 'age', operator: 'gte', value: 21, weight: 15, customerMessage: 'Applicant age must be at least 21 years.', isActive: true },
      { id: 'rule_4', productType: 'business', ruleName: 'Business Vintage', field: 'workExperienceYears', operator: 'gte', value: 2, weight: 15, customerMessage: 'Business vintage should be at least 2 years.', isActive: true },
      { id: 'rule_5', productType: 'home', ruleName: 'Home Loan FOIR', field: 'foirPercent', operator: 'lte', value: 65, weight: 20, customerMessage: 'FOIR must be within home loan policy limits.', isActive: true },
    ].forEach(saveEligibilityRule);
  });

  seed();
};

export const initializeDatabase = () => {
  runMigrations();
  seedDatabaseIfEmpty();
};

export const getCollections = () => ({
  settings: singleData<CompanySettings>('app_settings', defaultSettings),
  users: tableData<User>('users'),
  loanProducts: tableData<LoanProduct>('loan_products'),
  applications: tableData<LoanApplication>('applications'),
  loanAccounts: tableData<LoanAccount>('loan_accounts'),
  paymentSubmissions: tableData<PaymentSubmission>('payment_submissions'),
  receipts: tableData<Receipt>('receipts'),
  supportTickets: tableData<SupportTicket>('support_tickets'),
  notifications: tableData<AppNotification>('notifications'),
  auditLogs: tableData<AuditLog>('audit_logs'),
  customers: tableData<AnyRecord>('customers'),
  staffMembers: tableData<AnyRecord>('staff'),
  cmsContent: singleData<AnyRecord>('cms_content', defaultCmsContent),
  eligibilityRules: tableData<AnyRecord>('eligibility_rules'),
});

export const findUserAuthByEmail = (email: string) => {
  const db = getDb();
  return db
    .prepare('SELECT data_json, password_hash FROM users WHERE lower(email) = lower(?)')
    .get(email) as { data_json: string; password_hash: string } | undefined;
};

export const saveSettings = (settings: CompanySettings) => {
  getDb()
    .prepare(
      `INSERT INTO app_settings (id, data_json, updated_at)
       VALUES ('global', ?, ?)
       ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`
    )
    .run(toJson(settings), now());
};

export const saveCmsContent = (cms: AnyRecord) => {
  getDb()
    .prepare(
      `INSERT INTO cms_content (id, data_json, updated_at)
       VALUES ('global', ?, ?)
       ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`
    )
    .run(toJson(cms), now());
};

export const saveUser = (user: User, passwordHash = hashPassword('password123')) => {
  getDb()
    .prepare(
      `INSERT INTO users (id, full_name, email, mobile, role, password_hash, is_verified, data_json, created_at, updated_at)
       VALUES (@id, @fullName, @email, @mobile, @role, @passwordHash, @isVerified, @dataJson, @createdAt, @updatedAt)
       ON CONFLICT(id) DO UPDATE SET
         full_name = excluded.full_name, email = excluded.email, mobile = excluded.mobile, role = excluded.role,
         is_verified = excluded.is_verified, data_json = excluded.data_json, updated_at = excluded.updated_at`
    )
    .run({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      passwordHash,
      isVerified: boolInt(user.isVerified),
      dataJson: toJson(user),
      createdAt: user.createdAt,
      updatedAt: now(),
    });
};

export const saveLoanProduct = (product: LoanProduct) => {
  getDb()
    .prepare(
      `INSERT INTO loan_products
       (id, type, title, is_active, is_featured, min_amount, max_amount, min_interest_rate, max_interest_rate, data_json, updated_at)
       VALUES (@id, @type, @title, @isActive, @isFeatured, @minAmount, @maxAmount, @minInterestRate, @maxInterestRate, @dataJson, @updatedAt)
       ON CONFLICT(id) DO UPDATE SET
         type = excluded.type, title = excluded.title, is_active = excluded.is_active, is_featured = excluded.is_featured,
         min_amount = excluded.min_amount, max_amount = excluded.max_amount, min_interest_rate = excluded.min_interest_rate,
         max_interest_rate = excluded.max_interest_rate, data_json = excluded.data_json, updated_at = excluded.updated_at`
    )
    .run({
      ...product,
      isActive: boolInt(product.isActive),
      isFeatured: boolInt(product.isFeatured),
      minInterestRate: product.minInterestRate ?? product.minRate ?? null,
      maxInterestRate: product.maxInterestRate ?? product.maxRate ?? null,
      dataJson: toJson(product),
      updatedAt: now(),
    });
};

export const saveApplication = (application: LoanApplication) => {
  getDb()
    .prepare(
      `INSERT INTO applications
       (id, user_id, product_id, product_type, applicant_name, email, mobile, status, requested_amount, requested_tenure_months, data_json, created_at, updated_at)
       VALUES (@id, @userId, @productId, @productType, @applicantName, @email, @mobile, @status, @requestedAmount, @requestedTenureMonths, @dataJson, @createdAt, @updatedAt)
       ON CONFLICT(id) DO UPDATE SET
         user_id = excluded.user_id, product_id = excluded.product_id, product_type = excluded.product_type,
         applicant_name = excluded.applicant_name, email = excluded.email, mobile = excluded.mobile,
         status = excluded.status, requested_amount = excluded.requested_amount, requested_tenure_months = excluded.requested_tenure_months,
         data_json = excluded.data_json, updated_at = excluded.updated_at`
    )
    .run({
      id: application.id,
      userId: application.userId || 'usr_guest',
      productId: application.productId,
      productType: application.productType,
      applicantName: application.personalInfo?.fullName || 'Applicant',
      email: application.personalInfo?.email || 'unknown@example.com',
      mobile: normalPhone(application.personalInfo?.mobile || ''),
      status: application.status,
      requestedAmount: application.requestedAmount,
      requestedTenureMonths: application.requestedTenureMonths,
      dataJson: toJson(application),
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
    });
};

export const saveLoanAccount = (loan: LoanAccount) => {
  getDb()
    .prepare(
      `INSERT INTO loan_accounts
       (account_number, application_id, user_id, customer_name, loan_type, principal_amount, interest_rate, tenure_months, monthly_emi, outstanding_principal, total_paid, status, data_json, created_at, updated_at)
       VALUES (@accountNumber, @applicationId, @userId, @customerName, @loanType, @principalAmount, @interestRate, @tenureMonths, @monthlyEmi, @outstandingPrincipal, @totalPaid, @status, @dataJson, @createdAt, @updatedAt)
       ON CONFLICT(account_number) DO UPDATE SET
         application_id = excluded.application_id, user_id = excluded.user_id, customer_name = excluded.customer_name,
         loan_type = excluded.loan_type, principal_amount = excluded.principal_amount, interest_rate = excluded.interest_rate,
         tenure_months = excluded.tenure_months, monthly_emi = excluded.monthly_emi, outstanding_principal = excluded.outstanding_principal,
         total_paid = excluded.total_paid, status = excluded.status, data_json = excluded.data_json, updated_at = excluded.updated_at`
    )
    .run({ ...loan, dataJson: toJson(loan), updatedAt: now() });
};

export const savePaymentSubmission = (payment: PaymentSubmission) => {
  getDb()
    .prepare(
      `INSERT INTO payment_submissions
       (id, loan_account_id, application_id, user_id, customer_name, amount, purpose, utr_number, status, data_json, submitted_at, updated_at)
       VALUES (@id, @loanAccountId, @applicationId, @userId, @customerName, @amount, @purpose, @utrNumber, @status, @dataJson, @submittedAt, @updatedAt)
       ON CONFLICT(id) DO UPDATE SET
         loan_account_id = excluded.loan_account_id, application_id = excluded.application_id, user_id = excluded.user_id,
         customer_name = excluded.customer_name, amount = excluded.amount, purpose = excluded.purpose, utr_number = excluded.utr_number,
         status = excluded.status, data_json = excluded.data_json, updated_at = excluded.updated_at`
    )
    .run({ ...payment, dataJson: toJson(payment), updatedAt: now() });
};

export const saveReceipt = (receipt: Receipt) => {
  getDb()
    .prepare(
      `INSERT INTO receipts
       (receipt_number, payment_id, loan_account_id, application_id, customer_name, amount_paid, utr_number, data_json, verification_date)
       VALUES (@receiptNumber, @paymentId, @loanAccountId, @applicationId, @customerName, @amountPaid, @utrNumber, @dataJson, @verificationDate)
       ON CONFLICT(receipt_number) DO UPDATE SET data_json = excluded.data_json`
    )
    .run({ ...receipt, dataJson: toJson(receipt) });
};

export const saveSupportTicket = (ticket: SupportTicket) => {
  getDb()
    .prepare(
      `INSERT INTO support_tickets
       (id, user_id, customer_name, category, subject, priority, status, data_json, created_at, updated_at)
       VALUES (@id, @userId, @customerName, @category, @subject, @priority, @status, @dataJson, @createdAt, @updatedAt)
       ON CONFLICT(id) DO UPDATE SET
         customer_name = excluded.customer_name, category = excluded.category, subject = excluded.subject,
         priority = excluded.priority, status = excluded.status, data_json = excluded.data_json, updated_at = excluded.updated_at`
    )
    .run({ ...ticket, dataJson: toJson(ticket) });
};

export const saveNotification = (notification: AppNotification) => {
  getDb()
    .prepare(
      `INSERT INTO notifications (id, user_id, title, type, read, data_json, created_at)
       VALUES (@id, @userId, @title, @type, @read, @dataJson, @createdAt)
       ON CONFLICT(id) DO UPDATE SET read = excluded.read, data_json = excluded.data_json`
    )
    .run({ ...notification, read: boolInt(notification.read), dataJson: toJson(notification) });
};

export const saveAuditLog = (log: AuditLog) => {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO audit_logs
       (id, timestamp, user_id, user_role, user_email, action, entity_type, entity_id, details, ip_address, data_json)
       VALUES (@id, @timestamp, @userId, @userRole, @userEmail, @action, @entityType, @entityId, @details, @ipAddress, @dataJson)`
    )
    .run({ ...log, dataJson: toJson(log) });
};

export const saveCustomer = (customer: AnyRecord) => {
  getDb()
    .prepare(
      `INSERT INTO customers (id, full_name, email, mobile, kyc_status, account_status, data_json, created_at, updated_at)
       VALUES (@id, @fullName, @email, @mobile, @kycStatus, @accountStatus, @dataJson, @createdAt, @updatedAt)
       ON CONFLICT(id) DO UPDATE SET
         full_name = excluded.full_name, email = excluded.email, mobile = excluded.mobile,
         kyc_status = excluded.kyc_status, account_status = excluded.account_status,
         data_json = excluded.data_json, updated_at = excluded.updated_at`
    )
    .run({
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      mobile: customer.mobile,
      kycStatus: customer.kycStatus || 'pending',
      accountStatus: customer.accountStatus || 'active',
      dataJson: toJson(customer),
      createdAt: customer.createdAt || now(),
      updatedAt: now(),
    });
};

export const saveStaffMember = (member: AnyRecord) => {
  getDb()
    .prepare(
      `INSERT INTO staff (id, full_name, email, phone, role, department, status, data_json, last_login, updated_at)
       VALUES (@id, @fullName, @email, @phone, @role, @department, @status, @dataJson, @lastLogin, @updatedAt)
       ON CONFLICT(id) DO UPDATE SET
         full_name = excluded.full_name, email = excluded.email, phone = excluded.phone, role = excluded.role,
         department = excluded.department, status = excluded.status, data_json = excluded.data_json,
         last_login = excluded.last_login, updated_at = excluded.updated_at`
    )
    .run({ ...member, dataJson: toJson(member), updatedAt: now() });
};

export const saveEligibilityRule = (rule: AnyRecord) => {
  getDb()
    .prepare(
      `INSERT INTO eligibility_rules (id, product_type, rule_name, field, operator, is_active, data_json, updated_at)
       VALUES (@id, @productType, @ruleName, @field, @operator, @isActive, @dataJson, @updatedAt)
       ON CONFLICT(id) DO UPDATE SET
         product_type = excluded.product_type, rule_name = excluded.rule_name, field = excluded.field,
         operator = excluded.operator, is_active = excluded.is_active, data_json = excluded.data_json, updated_at = excluded.updated_at`
    )
    .run({ ...rule, isActive: boolInt(rule.isActive), dataJson: toJson(rule), updatedAt: now() });
};
