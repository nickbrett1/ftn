-- Credit Card Billing D1 Database Schema
--
-- Usage:
-- 1. Create a new D1 database in Cloudflare (e.g., named 'ccbilling') via the dashboard or Wrangler CLI.
-- 2. Run this SQL to initialize the schema (can use the Cloudflare dashboard, Wrangler, or D1 CLI).
--
-- This file is for initial setup, not for migration from production data.

CREATE TABLE credit_card (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  last4 TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE billing_cycle (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE budget (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE budget_merchant (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id INTEGER NOT NULL REFERENCES budget(id),
  merchant_normalized TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE statement (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  billing_cycle_id INTEGER NOT NULL REFERENCES billing_cycle(id),
  credit_card_id INTEGER REFERENCES credit_card(id), -- Allow NULL for auto-identification
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  statement_date DATE, -- Allow NULL until parsed from PDF
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  statement_id INTEGER NOT NULL REFERENCES statement(id),
  merchant TEXT NOT NULL, -- Original merchant name from statement
  merchant_normalized TEXT NOT NULL, -- Normalized merchant identifier
  merchant_details TEXT, -- Additional details (restaurant name, flight info, etc.)
  amount REAL NOT NULL,
  allocated_to TEXT, -- References budget names (dynamically managed), NULL means unallocated
  transaction_date DATE,
  is_foreign_currency BOOLEAN DEFAULT 0,
  foreign_currency_amount REAL,
  foreign_currency_type TEXT,
  flight_details TEXT, -- JSON string for flight-specific details
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add an index for efficient foreign currency lookups
CREATE INDEX idx_payment_foreign_currency ON payment(is_foreign_currency);

-- Add indexes for merchant normalization
CREATE INDEX idx_payment_merchant_normalized ON payment(merchant_normalized);
CREATE INDEX idx_budget_merchant_normalized ON budget_merchant(merchant_normalized);

-- Add indexes for efficient recent merchants query
CREATE INDEX idx_statement_uploaded_at ON statement(uploaded_at);
CREATE INDEX idx_payment_statement_id ON payment(statement_id);
