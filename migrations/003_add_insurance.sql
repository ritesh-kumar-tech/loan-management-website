-- SQLite auto-rewrites other tables' FK REFERENCES clauses when a table is
-- renamed, so after renaming payment_submissions out of the way, `receipts`
-- silently starts pointing at payment_submissions_old - which then blocks
-- dropping it (a table can't be dropped while another table's FK still
-- targets it). recreate receipts too, pointed back at the new
-- payment_submissions, before dropping either _old table.
ALTER TABLE payment_submissions RENAME TO payment_submissions_old;
ALTER TABLE receipts RENAME TO receipts_old;

CREATE TABLE payment_submissions (
  id TEXT PRIMARY KEY,
  loan_account_id TEXT,
  application_id TEXT,
  user_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  purpose TEXT NOT NULL CHECK (purpose IN ('emi', 'processing_fee', 'foreclosure', 'late_fee', 'insurance')),
  utr_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending_verification', 'verified', 'rejected')),
  data_json TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO payment_submissions SELECT * FROM payment_submissions_old;

CREATE TABLE receipts (
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
INSERT INTO receipts SELECT * FROM receipts_old;

DROP TABLE receipts_old;
DROP TABLE payment_submissions_old;

CREATE INDEX IF NOT EXISTS idx_payment_submissions_application_id ON payment_submissions(application_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_loan_account_id ON payment_submissions(loan_account_id);
CREATE INDEX IF NOT EXISTS idx_payment_submissions_status ON payment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_id ON receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_application_id ON receipts(application_id);

CREATE TABLE IF NOT EXISTS insurance_policies (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  policy_number TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('issued', 'payment_submitted', 'active', 'cancelled')),
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_application_id ON insurance_policies(application_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_user_id ON insurance_policies(user_id);
