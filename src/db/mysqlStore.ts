import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { AppNotification, AuditLog, CompanySettings, LoanAccount, LoanApplication, LoanProduct, PaymentSubmission, Receipt, SupportTicket, User } from '../types';
import { hashPassword } from './security';

type AnyRecord = Record<string, any>;

const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'dhani-finances';

const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z',
});

const json = (value: unknown) => JSON.stringify(value);
const parse = <T>(value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value) as T;
const now = () => new Date();
const toDate = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};
const boolInt = (value: unknown) => (value ? 1 : 0);
const normalPhone = (value: string) => String(value || '').replace(/\D/g, '').slice(-10);
const quoteIdentifier = (value: string) => `\`${value.replace(/`/g, '``')}\``;

export const initializeMysqlDatabase = async () => {
  const connection = await mysql.createConnection({
    host: MYSQL_HOST,
    port: MYSQL_PORT,
    user: MYSQL_USER,
    password: MYSQL_PASSWORD,
    multipleStatements: true,
    timezone: 'Z',
  });
  try {
    const sqlPath = path.resolve(process.cwd(), 'migrations', 'mysql', '001_initial_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8').replace(/`dhani-finances`/g, quoteIdentifier(MYSQL_DATABASE));
    await connection.query(sql);
  } finally {
    await connection.end();
  }
};

const tableData = async <T>(table: string) => {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(`SELECT data_json FROM ${table}`);
  return rows.map((row) => parse<T>(row.data_json));
};

const singleData = async <T>(table: string, fallback: T) => {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(`SELECT data_json FROM ${table} WHERE id = 'global' LIMIT 1`);
  return rows[0] ? parse<T>(rows[0].data_json) : fallback;
};

export const getMysqlCollections = async (fallbacks: { settings: CompanySettings; cmsContent: AnyRecord }) => ({
  settings: await singleData<CompanySettings>('app_settings', fallbacks.settings),
  users: await tableData<User>('users'),
  loanProducts: await tableData<LoanProduct>('loan_products'),
  applications: await tableData<LoanApplication>('applications'),
  loanAccounts: await tableData<LoanAccount>('loan_accounts'),
  paymentSubmissions: await tableData<PaymentSubmission>('payment_submissions'),
  receipts: await tableData<Receipt>('receipts'),
  supportTickets: await tableData<SupportTicket>('support_tickets'),
  notifications: await tableData<AppNotification>('notifications'),
  auditLogs: await tableData<AuditLog>('audit_logs'),
  customers: await tableData<AnyRecord>('customers'),
  staffMembers: await tableData<AnyRecord>('staff'),
  cmsContent: await singleData<AnyRecord>('cms_content', fallbacks.cmsContent),
  eligibilityRules: await tableData<AnyRecord>('eligibility_rules'),
});

export const findMysqlUserAuthByEmail = async (email: string) => {
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    'SELECT data_json, password_hash FROM users WHERE lower(email) = lower(?) LIMIT 1',
    [email]
  );
  return rows[0] as { data_json: string; password_hash: string } | undefined;
};

export const saveMysqlSettings = async (settings: CompanySettings) => {
  await pool.query(
    `INSERT INTO app_settings (id, data_json) VALUES ('global', CAST(? AS JSON))
     ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)`,
    [json(settings)]
  );
};

export const saveMysqlCmsContent = async (cms: AnyRecord) => {
  await pool.query(
    `INSERT INTO cms_content (id, data_json) VALUES ('global', CAST(? AS JSON))
     ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)`,
    [json(cms)]
  );
};

export const saveMysqlUser = async (user: User, passwordHash = hashPassword('password123')) => {
  await pool.query(
    `INSERT INTO users (id, full_name, email, mobile, role, password_hash, is_verified, data_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
     ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email), mobile = VALUES(mobile),
       role = VALUES(role), is_verified = VALUES(is_verified), data_json = VALUES(data_json)`,
    [user.id, user.fullName, user.email, user.mobile, user.role, passwordHash, boolInt(user.isVerified), json(user), toDate(user.createdAt)]
  );
};

export const saveMysqlLoanProduct = async (product: LoanProduct) => {
  await pool.query(
    `INSERT INTO loan_products
     (id, type, title, is_active, is_featured, min_amount, max_amount, min_interest_rate, max_interest_rate, data_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
     ON DUPLICATE KEY UPDATE type = VALUES(type), title = VALUES(title), is_active = VALUES(is_active),
       is_featured = VALUES(is_featured), min_amount = VALUES(min_amount), max_amount = VALUES(max_amount),
       min_interest_rate = VALUES(min_interest_rate), max_interest_rate = VALUES(max_interest_rate), data_json = VALUES(data_json)`,
    [
      product.id,
      product.type,
      product.title,
      boolInt(product.isActive),
      boolInt(product.isFeatured),
      product.minAmount,
      product.maxAmount,
      product.minInterestRate ?? product.minRate ?? null,
      product.maxInterestRate ?? product.maxRate ?? null,
      json(product),
    ]
  );
};

export const saveMysqlApplication = async (application: LoanApplication) => {
  await pool.query(
    `INSERT INTO applications
     (id, user_id, product_id, product_type, applicant_name, email, mobile, status, requested_amount, requested_tenure_months, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), product_id = VALUES(product_id), product_type = VALUES(product_type),
       applicant_name = VALUES(applicant_name), email = VALUES(email), mobile = VALUES(mobile), status = VALUES(status),
       requested_amount = VALUES(requested_amount), requested_tenure_months = VALUES(requested_tenure_months),
       data_json = VALUES(data_json), updated_at = VALUES(updated_at)`,
    [
      application.id,
      application.userId || 'usr_guest',
      application.productId,
      application.productType,
      application.personalInfo?.fullName || 'Applicant',
      application.personalInfo?.email || 'unknown@example.com',
      normalPhone(application.personalInfo?.mobile || ''),
      application.status,
      application.requestedAmount,
      application.requestedTenureMonths,
      json(application),
      toDate(application.createdAt),
      toDate(application.updatedAt),
    ]
  );
};

export const saveMysqlLoanAccount = async (loan: LoanAccount) => {
  await pool.query(
    `INSERT INTO loan_accounts
     (account_number, application_id, user_id, customer_name, loan_type, principal_amount, interest_rate, tenure_months, monthly_emi, outstanding_principal, total_paid, status, data_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
     ON DUPLICATE KEY UPDATE application_id = VALUES(application_id), user_id = VALUES(user_id), customer_name = VALUES(customer_name),
       loan_type = VALUES(loan_type), principal_amount = VALUES(principal_amount), interest_rate = VALUES(interest_rate),
       tenure_months = VALUES(tenure_months), monthly_emi = VALUES(monthly_emi), outstanding_principal = VALUES(outstanding_principal),
       total_paid = VALUES(total_paid), status = VALUES(status), data_json = VALUES(data_json)`,
    [
      loan.accountNumber,
      loan.applicationId,
      loan.userId,
      loan.customerName,
      loan.loanType,
      loan.principalAmount,
      loan.interestRate,
      loan.tenureMonths,
      loan.monthlyEmi,
      loan.outstandingPrincipal,
      loan.totalPaid,
      loan.status,
      json(loan),
      toDate(loan.createdAt),
    ]
  );
};

export const saveMysqlPaymentSubmission = async (payment: PaymentSubmission) => {
  await pool.query(
    `INSERT INTO payment_submissions
     (id, loan_account_id, application_id, user_id, customer_name, amount, purpose, utr_number, status, data_json, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
     ON DUPLICATE KEY UPDATE loan_account_id = VALUES(loan_account_id), application_id = VALUES(application_id),
       user_id = VALUES(user_id), customer_name = VALUES(customer_name), amount = VALUES(amount), purpose = VALUES(purpose),
       utr_number = VALUES(utr_number), status = VALUES(status), data_json = VALUES(data_json)`,
    [
      payment.id,
      payment.loanAccountId || null,
      payment.applicationId || null,
      payment.userId,
      payment.customerName,
      payment.amount,
      payment.purpose,
      payment.utrNumber,
      payment.status,
      json(payment),
      toDate(payment.submittedAt),
    ]
  );
};

export const saveMysqlReceipt = async (receipt: Receipt) => {
  await pool.query(
    `INSERT INTO receipts (receipt_number, payment_id, loan_account_id, application_id, customer_name, amount_paid, utr_number, data_json, verification_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
     ON DUPLICATE KEY UPDATE data_json = VALUES(data_json), verification_date = VALUES(verification_date)`,
    [receipt.receiptNumber, receipt.paymentId, receipt.loanAccountId || null, receipt.applicationId || null, receipt.customerName, receipt.amountPaid, receipt.utrNumber, json(receipt), toDate(receipt.verificationDate)]
  );
};

export const saveMysqlSupportTicket = async (ticket: SupportTicket) => {
  await pool.query(
    `INSERT INTO support_tickets (id, user_id, customer_name, category, subject, priority, status, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)
     ON DUPLICATE KEY UPDATE customer_name = VALUES(customer_name), category = VALUES(category), subject = VALUES(subject),
       priority = VALUES(priority), status = VALUES(status), data_json = VALUES(data_json), updated_at = VALUES(updated_at)`,
    [ticket.id, ticket.userId, ticket.customerName, ticket.category, ticket.subject, ticket.priority, ticket.status, json(ticket), toDate(ticket.createdAt), toDate(ticket.updatedAt)]
  );
};

export const saveMysqlAuditLog = async (log: AuditLog) => {
  await pool.query(
    `INSERT IGNORE INTO audit_logs
     (id, timestamp, user_id, user_role, user_email, action, entity_type, entity_id, details, ip_address, data_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))`,
    [log.id, toDate(log.timestamp), log.userId, log.userRole, log.userEmail, log.action, log.entityType, log.entityId, log.details, log.ipAddress, json(log)]
  );
};

export const saveMysqlCustomer = async (customer: AnyRecord) => {
  await pool.query(
    `INSERT INTO customers (id, full_name, email, mobile, kyc_status, account_status, data_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
     ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email), mobile = VALUES(mobile),
       kyc_status = VALUES(kyc_status), account_status = VALUES(account_status), data_json = VALUES(data_json)`,
    [customer.id, customer.fullName, customer.email, customer.mobile, customer.kycStatus || 'pending', customer.accountStatus || 'active', json(customer), toDate(customer.createdAt)]
  );
};

export const saveMysqlStaffMember = async (member: AnyRecord) => {
  await pool.query(
    `INSERT INTO staff (id, full_name, email, phone, role, department, status, data_json, last_login)
     VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
     ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email), phone = VALUES(phone),
       role = VALUES(role), department = VALUES(department), status = VALUES(status), data_json = VALUES(data_json), last_login = VALUES(last_login)`,
    [member.id, member.fullName, member.email, member.phone, member.role, member.department, member.status, json(member), member.lastLogin ? toDate(member.lastLogin) : null]
  );
};

export const saveMysqlEligibilityRule = async (rule: AnyRecord) => {
  await pool.query(
    `INSERT INTO eligibility_rules (id, product_type, rule_name, field, operator, is_active, data_json)
     VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON))
     ON DUPLICATE KEY UPDATE product_type = VALUES(product_type), rule_name = VALUES(rule_name), field = VALUES(field),
       operator = VALUES(operator), is_active = VALUES(is_active), data_json = VALUES(data_json)`,
    [rule.id, rule.productType, rule.ruleName, rule.field, rule.operator, boolInt(rule.isActive), json(rule)]
  );
};
