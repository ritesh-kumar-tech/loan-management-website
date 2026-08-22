CREATE DATABASE IF NOT EXISTS `dhani-finances`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `dhani-finances`;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(120) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_settings (
  id VARCHAR(32) PRIMARY KEY DEFAULT 'global',
  data_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cms_content (
  id VARCHAR(32) PRIMARY KEY DEFAULT 'global',
  data_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  full_name VARCHAR(180) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  mobile VARCHAR(30) NOT NULL UNIQUE,
  role ENUM('customer', 'admin', 'verifier', 'accountant', 'manager') NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  data_json JSON NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loan_products (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(180) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  min_amount INT NOT NULL,
  max_amount INT NOT NULL,
  min_interest_rate DECIMAL(6,2) NULL,
  max_interest_rate DECIMAL(6,2) NULL,
  data_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_loan_products_type (type),
  INDEX idx_loan_products_active (is_active, is_featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS applications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  product_type VARCHAR(40) NOT NULL,
  applicant_name VARCHAR(180) NOT NULL,
  email VARCHAR(190) NOT NULL,
  mobile VARCHAR(30) NOT NULL,
  status VARCHAR(60) NOT NULL,
  requested_amount INT NOT NULL,
  requested_tenure_months INT NOT NULL,
  data_json JSON NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_applications_user_id (user_id),
  INDEX idx_applications_status (status),
  INDEX idx_applications_mobile (mobile),
  INDEX idx_applications_email (email),
  CONSTRAINT fk_applications_product
    FOREIGN KEY (product_id) REFERENCES loan_products(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS loan_accounts (
  account_number VARCHAR(64) PRIMARY KEY,
  application_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  customer_name VARCHAR(180) NOT NULL,
  loan_type VARCHAR(40) NOT NULL,
  principal_amount INT NOT NULL,
  interest_rate DECIMAL(6,2) NOT NULL,
  tenure_months INT NOT NULL,
  monthly_emi INT NOT NULL,
  outstanding_principal INT NOT NULL,
  total_paid INT NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL,
  data_json JSON NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_loan_accounts_application_id (application_id),
  INDEX idx_loan_accounts_user_id (user_id),
  INDEX idx_loan_accounts_status (status),
  CONSTRAINT fk_loan_accounts_application
    FOREIGN KEY (application_id) REFERENCES applications(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_submissions (
  id VARCHAR(64) PRIMARY KEY,
  loan_account_id VARCHAR(64) NULL,
  application_id VARCHAR(64) NULL,
  user_id VARCHAR(64) NOT NULL,
  customer_name VARCHAR(180) NOT NULL,
  amount INT NOT NULL,
  purpose ENUM('emi', 'processing_fee', 'foreclosure', 'late_fee', 'insurance') NOT NULL,
  utr_number VARCHAR(80) NOT NULL UNIQUE,
  status ENUM('pending_verification', 'verified', 'rejected') NOT NULL,
  data_json JSON NOT NULL,
  submitted_at DATETIME NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payment_submissions_application_id (application_id),
  INDEX idx_payment_submissions_loan_account_id (loan_account_id),
  INDEX idx_payment_submissions_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- This file re-runs on every server start (see initializeMysqlDatabase); the
-- CREATE TABLE above only takes effect for a brand new database, so widen the
-- purpose enum on an already-existing table too. Safe to repeat every start.
ALTER TABLE payment_submissions MODIFY COLUMN purpose ENUM('emi', 'processing_fee', 'foreclosure', 'late_fee', 'insurance') NOT NULL;

CREATE TABLE IF NOT EXISTS insurance_policies (
  id VARCHAR(64) PRIMARY KEY,
  application_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  customer_name VARCHAR(180) NOT NULL,
  policy_number VARCHAR(80) NOT NULL,
  status ENUM('issued', 'payment_submitted', 'active', 'cancelled') NOT NULL,
  data_json JSON NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_insurance_policies_application_id (application_id),
  INDEX idx_insurance_policies_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS receipts (
  receipt_number VARCHAR(64) PRIMARY KEY,
  payment_id VARCHAR(64) NOT NULL,
  loan_account_id VARCHAR(64) NULL,
  application_id VARCHAR(64) NULL,
  customer_name VARCHAR(180) NOT NULL,
  amount_paid INT NOT NULL,
  utr_number VARCHAR(80) NOT NULL,
  data_json JSON NOT NULL,
  verification_date DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_receipts_payment_id (payment_id),
  INDEX idx_receipts_application_id (application_id),
  CONSTRAINT fk_receipts_payment
    FOREIGN KEY (payment_id) REFERENCES payment_submissions(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS support_tickets (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  customer_name VARCHAR(180) NOT NULL,
  category VARCHAR(120) NOT NULL,
  subject VARCHAR(220) NOT NULL,
  priority VARCHAR(30) NOT NULL,
  status VARCHAR(40) NOT NULL,
  data_json JSON NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_support_tickets_user_id (user_id),
  INDEX idx_support_tickets_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  title VARCHAR(180) NOT NULL,
  type VARCHAR(30) NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  data_json JSON NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_notifications_user_id (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  timestamp DATETIME NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  user_role VARCHAR(60) NOT NULL,
  user_email VARCHAR(190) NOT NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(120) NOT NULL,
  entity_id VARCHAR(120) NOT NULL,
  details TEXT NOT NULL,
  ip_address VARCHAR(60) NOT NULL,
  data_json JSON NOT NULL,
  INDEX idx_audit_logs_entity (entity_type, entity_id),
  INDEX idx_audit_logs_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) PRIMARY KEY,
  full_name VARCHAR(180) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  mobile VARCHAR(30) NOT NULL UNIQUE,
  kyc_status VARCHAR(40) NOT NULL,
  account_status VARCHAR(40) NOT NULL,
  data_json JSON NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customers_kyc_status (kyc_status),
  INDEX idx_customers_account_status (account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS staff (
  id VARCHAR(64) PRIMARY KEY,
  full_name VARCHAR(180) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30) NOT NULL,
  role VARCHAR(80) NOT NULL,
  department VARCHAR(120) NOT NULL,
  status VARCHAR(40) NOT NULL,
  data_json JSON NOT NULL,
  last_login DATETIME NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_staff_role (role),
  INDEX idx_staff_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eligibility_rules (
  id VARCHAR(64) PRIMARY KEY,
  product_type VARCHAR(40) NOT NULL,
  rule_name VARCHAR(180) NOT NULL,
  field VARCHAR(80) NOT NULL,
  operator VARCHAR(20) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  data_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_eligibility_rules_product_type (product_type, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO schema_migrations (version)
VALUES ('001_initial_schema.sql')
ON DUPLICATE KEY UPDATE applied_at = CURRENT_TIMESTAMP;
