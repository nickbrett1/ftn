-- Migration script to add full_statement_text field to existing payment table
-- Run this on your existing database to add support for multi-line Amazon order ID extraction

-- Add the new column (SQLite will add it with NULL values for existing rows)
ALTER TABLE payment ADD COLUMN full_statement_text TEXT;

-- Create an index for efficient lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_payment_full_statement_text ON payment(full_statement_text);

-- Update existing Amazon charges to extract order IDs from merchant_details if available
-- This is a one-time update to populate the new field for existing data
UPDATE payment 
SET full_statement_text = merchant_details 
WHERE (merchant LIKE '%AMAZON%' OR merchant LIKE '%AMZN%') 
  AND merchant_details IS NOT NULL 
  AND full_statement_text IS NULL;