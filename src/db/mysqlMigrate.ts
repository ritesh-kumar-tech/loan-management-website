import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { getCollections, initializeDatabase } from './store';
import { hashPassword } from './security';

const MYSQL_HOST = process.env.MYSQL_HOST || '127.0.0.1';
const MYSQL_PORT = Number(process.env.MYSQL_PORT || 3306);
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'dhani-finances';

const normalizePhone = (value: string) => String(value || '').replace(/\D/g, '').slice(-10);
const toDateTime = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};
const json = (value: unknown) => JSON.stringify(value);

const quoteIdentifier = (value: string) => `\`${value.replace(/`/g, '``')}\``;

const run = async () => {
  initializeDatabase();

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
    const schemaSql = fs
      .readFileSync(sqlPath, 'utf8')
      .replace(/`dhani-finances`/g, quoteIdentifier(MYSQL_DATABASE));
    await connection.query(schemaSql);
    await connection.query(`USE ${quoteIdentifier(MYSQL_DATABASE)}`);

    const data = getCollections();
    const passwordHash = hashPassword('password123');

    await connection.query(
      `INSERT INTO app_settings (id, data_json)
       VALUES ('global', CAST(? AS JSON))
       ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)`,
      [json(data.settings)]
    );

    await connection.query(
      `INSERT INTO cms_content (id, data_json)
       VALUES ('global', CAST(? AS JSON))
       ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)`,
      [json(data.cmsContent)]
    );

    for (const user of data.users) {
      await connection.query(
        `INSERT INTO users
         (id, full_name, email, mobile, role, password_hash, is_verified, data_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
         ON DUPLICATE KEY UPDATE
           full_name = VALUES(full_name), email = VALUES(email), mobile = VALUES(mobile),
           role = VALUES(role), is_verified = VALUES(is_verified), data_json = VALUES(data_json)`,
        [user.id, user.fullName, user.email, user.mobile, user.role, passwordHash, user.isVerified ? 1 : 0, json(user), toDateTime(user.createdAt)]
      );
    }

    for (const product of data.loanProducts) {
      await connection.query(
        `INSERT INTO loan_products
         (id, type, title, is_active, is_featured, min_amount, max_amount, min_interest_rate, max_interest_rate, data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
         ON DUPLICATE KEY UPDATE
           type = VALUES(type), title = VALUES(title), is_active = VALUES(is_active),
           is_featured = VALUES(is_featured), min_amount = VALUES(min_amount),
           max_amount = VALUES(max_amount), min_interest_rate = VALUES(min_interest_rate),
           max_interest_rate = VALUES(max_interest_rate), data_json = VALUES(data_json)`,
        [
          product.id,
          product.type,
          product.title,
          product.isActive ? 1 : 0,
          product.isFeatured ? 1 : 0,
          product.minAmount,
          product.maxAmount,
          product.minInterestRate ?? product.minRate ?? null,
          product.maxInterestRate ?? product.maxRate ?? null,
          json(product),
        ]
      );
    }

    for (const app of data.applications) {
      await connection.query(
        `INSERT INTO applications
         (id, user_id, product_id, product_type, applicant_name, email, mobile, status, requested_amount, requested_tenure_months, data_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)
         ON DUPLICATE KEY UPDATE
           user_id = VALUES(user_id), product_id = VALUES(product_id), product_type = VALUES(product_type),
           applicant_name = VALUES(applicant_name), email = VALUES(email), mobile = VALUES(mobile),
           status = VALUES(status), requested_amount = VALUES(requested_amount),
           requested_tenure_months = VALUES(requested_tenure_months), data_json = VALUES(data_json),
           updated_at = VALUES(updated_at)`,
        [
          app.id,
          app.userId,
          app.productId,
          app.productType,
          app.personalInfo?.fullName || 'Applicant',
          app.personalInfo?.email || 'unknown@example.com',
          normalizePhone(app.personalInfo?.mobile || ''),
          app.status,
          app.requestedAmount,
          app.requestedTenureMonths,
          json(app),
          toDateTime(app.createdAt),
          toDateTime(app.updatedAt),
        ]
      );
    }

    for (const loan of data.loanAccounts) {
      await connection.query(
        `INSERT INTO loan_accounts
         (account_number, application_id, user_id, customer_name, loan_type, principal_amount, interest_rate, tenure_months, monthly_emi, outstanding_principal, total_paid, status, data_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
         ON DUPLICATE KEY UPDATE
           application_id = VALUES(application_id), user_id = VALUES(user_id), customer_name = VALUES(customer_name),
           loan_type = VALUES(loan_type), principal_amount = VALUES(principal_amount),
           interest_rate = VALUES(interest_rate), tenure_months = VALUES(tenure_months),
           monthly_emi = VALUES(monthly_emi), outstanding_principal = VALUES(outstanding_principal),
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
          toDateTime(loan.createdAt),
        ]
      );
    }

    for (const payment of data.paymentSubmissions) {
      await connection.query(
        `INSERT INTO payment_submissions
         (id, loan_account_id, application_id, user_id, customer_name, amount, purpose, utr_number, status, data_json, submitted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
         ON DUPLICATE KEY UPDATE
           loan_account_id = VALUES(loan_account_id), application_id = VALUES(application_id),
           user_id = VALUES(user_id), customer_name = VALUES(customer_name), amount = VALUES(amount),
           purpose = VALUES(purpose), utr_number = VALUES(utr_number), status = VALUES(status),
           data_json = VALUES(data_json)`,
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
          toDateTime(payment.submittedAt),
        ]
      );
    }

    for (const receipt of data.receipts) {
      await connection.query(
        `INSERT INTO receipts
         (receipt_number, payment_id, loan_account_id, application_id, customer_name, amount_paid, utr_number, data_json, verification_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
         ON DUPLICATE KEY UPDATE data_json = VALUES(data_json), verification_date = VALUES(verification_date)`,
        [
          receipt.receiptNumber,
          receipt.paymentId,
          receipt.loanAccountId || null,
          receipt.applicationId || null,
          receipt.customerName,
          receipt.amountPaid,
          receipt.utrNumber,
          json(receipt),
          toDateTime(receipt.verificationDate),
        ]
      );
    }

    for (const ticket of data.supportTickets) {
      await connection.query(
        `INSERT INTO support_tickets
         (id, user_id, customer_name, category, subject, priority, status, data_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)
         ON DUPLICATE KEY UPDATE
           customer_name = VALUES(customer_name), category = VALUES(category), subject = VALUES(subject),
           priority = VALUES(priority), status = VALUES(status), data_json = VALUES(data_json),
           updated_at = VALUES(updated_at)`,
        [
          ticket.id,
          ticket.userId,
          ticket.customerName,
          ticket.category,
          ticket.subject,
          ticket.priority,
          ticket.status,
          json(ticket),
          toDateTime(ticket.createdAt),
          toDateTime(ticket.updatedAt),
        ]
      );
    }

    for (const notification of data.notifications) {
      await connection.query(
        `INSERT INTO notifications
         (id, user_id, title, type, is_read, data_json, created_at)
         VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?)
         ON DUPLICATE KEY UPDATE is_read = VALUES(is_read), data_json = VALUES(data_json)`,
        [notification.id, notification.userId, notification.title, notification.type, notification.read ? 1 : 0, json(notification), toDateTime(notification.createdAt)]
      );
    }

    for (const log of data.auditLogs) {
      await connection.query(
        `INSERT INTO audit_logs
         (id, timestamp, user_id, user_role, user_email, action, entity_type, entity_id, details, ip_address, data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON))
         ON DUPLICATE KEY UPDATE data_json = VALUES(data_json)`,
        [log.id, toDateTime(log.timestamp), log.userId, log.userRole, log.userEmail, log.action, log.entityType, log.entityId, log.details, log.ipAddress, json(log)]
      );
    }

    for (const customer of data.customers) {
      await connection.query(
        `INSERT INTO customers
         (id, full_name, email, mobile, kyc_status, account_status, data_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
         ON DUPLICATE KEY UPDATE
           full_name = VALUES(full_name), email = VALUES(email), mobile = VALUES(mobile),
           kyc_status = VALUES(kyc_status), account_status = VALUES(account_status),
           data_json = VALUES(data_json)`,
        [
          customer.id,
          customer.fullName,
          customer.email,
          customer.mobile,
          customer.kycStatus || 'pending',
          customer.accountStatus || 'active',
          json(customer),
          toDateTime(customer.createdAt),
        ]
      );
    }

    for (const member of data.staffMembers) {
      await connection.query(
        `INSERT INTO staff
         (id, full_name, email, phone, role, department, status, data_json, last_login)
         VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)
         ON DUPLICATE KEY UPDATE
           full_name = VALUES(full_name), email = VALUES(email), phone = VALUES(phone),
           role = VALUES(role), department = VALUES(department), status = VALUES(status),
           data_json = VALUES(data_json), last_login = VALUES(last_login)`,
        [
          member.id,
          member.fullName,
          member.email,
          member.phone,
          member.role,
          member.department,
          member.status,
          json(member),
          member.lastLogin ? toDateTime(member.lastLogin) : null,
        ]
      );
    }

    for (const rule of data.eligibilityRules) {
      await connection.query(
        `INSERT INTO eligibility_rules
         (id, product_type, rule_name, field, operator, is_active, data_json)
         VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON))
         ON DUPLICATE KEY UPDATE
           product_type = VALUES(product_type), rule_name = VALUES(rule_name), field = VALUES(field),
           operator = VALUES(operator), is_active = VALUES(is_active), data_json = VALUES(data_json)`,
        [rule.id, rule.productType, rule.ruleName, rule.field, rule.operator, rule.isActive ? 1 : 0, json(rule)]
      );
    }

    const [counts] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM applications) AS applications,
        (SELECT COUNT(*) FROM loan_accounts) AS loan_accounts,
        (SELECT COUNT(*) FROM payment_submissions) AS payments,
        (SELECT COUNT(*) FROM customers) AS customers`
    );

    console.log(`MySQL migrated and seeded: ${MYSQL_USER}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}`);
    console.log(counts[0]);
  } finally {
    await connection.end();
  }
};

run().catch((error) => {
  console.error('MySQL migration failed:', error);
  process.exit(1);
});
