PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cms_content (
  id TEXT PRIMARY KEY DEFAULT 'global',
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  mobile TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'admin', 'verifier', 'accountant', 'manager')),
  password_hash TEXT NOT NULL,
  is_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0, 1)),
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS loan_products (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  min_amount INTEGER NOT NULL,
  max_amount INTEGER NOT NULL,
  min_interest_rate REAL,
  max_interest_rate REAL,
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_loan_products_type ON loan_products(type);
CREATE INDEX IF NOT EXISTS idx_loan_products_active ON loan_products(is_active, is_featured);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_type TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_amount INTEGER NOT NULL,
  requested_tenure_months INTEGER NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES loan_products(id) ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_mobile ON applications(mobile);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);

CREATE TABLE IF NOT EXISTS loan_accounts (
  account_number TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  loan_type TEXT NOT NULL,
  principal_amount INTEGER NOT NULL,
  interest_rate REAL NOT NULL,
  tenure_months INTEGER NOT NULL,
  monthly_emi INTEGER NOT NULL,
  outstanding_principal INTEGER NOT NULL,
  total_paid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES applications(id) ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_loan_accounts_application_id ON loan_accounts(application_id);
CREATE INDEX IF NOT EXISTS idx_loan_accounts_user_id ON loan_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_accounts_status ON loan_accounts(status);

CREATE TABLE IF NOT EXISTS payment_submissions (
  id TEXT PRIMARY KEY,
  loan_account_id TEXT,
  application_id TEXT,
  user_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  purpose TEXT NOT NULL CHECK (purpose IN ('emi', 'processing_fee', 'foreclosure', 'late_fee')),
  utr_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending_verification', 'verified', 'rejected')),
  data_json TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payment_submissions_application_id ON payment_submissions(application_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_loan_account_id ON payment_submissions(loan_account_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON payment_submissions(status);

CREATE TABLE IF NOT EXISTS receipts (
  receipt_number TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL,
  loan_account_id TEXT,
  application_id TEXT,
  customer_name TEXT NOT NULL,
  amount_paid INTEGER NOT NULL CHECK (amount_paid > 0),
  utr_number TEXT NOT NULL,
  data_json TEXT NOT NULL,
  verification_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (payment_id) REFERENCES payment_submissions(id) ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_receipts_payment_id ON receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_application_id ON receipts(application_id);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0 CHECK (read IN (0, 1)),
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, read);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  data_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  mobile TEXT NOT NULL UNIQUE,
  kyc_status TEXT NOT NULL,
  account_status TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_customers_kyc_status ON customers(kyc_status);
CREATE INDEX IF NOT EXISTS idx_customers_account_status ON customers(account_status);

CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  status TEXT NOT NULL,
  data_json TEXT NOT NULL,
  last_login TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);

CREATE TABLE IF NOT EXISTS eligibility_rules (
  id TEXT PRIMARY KEY,
  product_type TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  field TEXT NOT NULL,
  operator TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_eligibility_rules_product_type ON eligibility_rules(product_type, is_active);
