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
  closed BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE budget (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE budget_merchant (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  budget_id INTEGER NOT NULL REFERENCES budget(id),
  merchant TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE statement (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  billing_cycle_id INTEGER NOT NULL REFERENCES billing_cycle(id),
  credit_card_id INTEGER NOT NULL REFERENCES credit_card(id),
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  due_date DATE NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  statement_id INTEGER NOT NULL REFERENCES statement(id),
  merchant TEXT NOT NULL,
  amount REAL NOT NULL,
  allocated_to TEXT NOT NULL, -- 'Nick', 'Tas', or 'Both'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
); 