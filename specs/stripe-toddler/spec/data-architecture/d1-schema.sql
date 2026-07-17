-- Stripe Toddler Relational Analytics Schema (Cloudflare D1 SQLite)

-- Enable foreign key support (SQLite requires this per-connection, but it's good practice to declare)
PRAGMA foreign_keys = ON;

-- 1. Core Transactions Table
-- Logs overall sales metadata after a payment intent is captured successfully.
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id TEXT PRIMARY KEY NOT NULL,          -- Internally generated UUID for database primary key
    payment_intent_id TEXT NOT NULL UNIQUE,            -- Stripe Payment Intent ID (e.g., pi_3M123...)
    amount_cents INTEGER NOT NULL,                     -- Total transaction price in cents (non-negative integer)
    status TEXT NOT NULL,                              -- State: 'captured', 'refunded', etc.
    created_at INTEGER NOT NULL                        -- Unix timestamp in seconds
);

-- Indices for analytics search/reports
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_intent_id ON transactions (payment_intent_id);

-- 2. Transaction Line Items Table
-- Tracks specific items scanned and sold per checkout event to power itemized reports.
CREATE TABLE IF NOT EXISTS transaction_items (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,         -- Auto-incrementing line ID
    transaction_id TEXT NOT NULL,                      -- Foreign key references transactions
    barcode TEXT NOT NULL,                             -- Scanned barcode string
    name TEXT NOT NULL,                                -- Name of the item at the time of sale
    price_cents INTEGER NOT NULL,                      -- Price in cents at the time of sale
    quantity INTEGER NOT NULL DEFAULT 1,               -- Number of instances sold
    FOREIGN KEY (transaction_id) REFERENCES transactions (transaction_id) ON DELETE CASCADE
);

-- Indices for transaction matching and item popularity searches
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items (transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_barcode ON transaction_items (barcode);
CREATE INDEX IF NOT EXISTS idx_transaction_items_name ON transaction_items (name);
