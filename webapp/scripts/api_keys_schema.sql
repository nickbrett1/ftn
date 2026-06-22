-- API Keys D1 Database Schema
--
-- Usage:
-- 1. Create a new D1 database in Cloudflare (e.g., named 'genproj') via the dashboard or Wrangler CLI.
-- 2. Run this SQL to initialize the schema (can use the Cloudflare dashboard, Wrangler, or D1 CLI).
--
-- This file is for initial setup, not for migration from production data.

CREATE TABLE IF NOT EXISTS ApiKeys (
	id TEXT PRIMARY KEY,
	user_email TEXT NOT NULL,
	hashed_key TEXT NOT NULL,
	name TEXT NOT NULL,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	last_used_at DATETIME,
	rate_limit_count INTEGER DEFAULT 0,
	rate_limit_reset_at DATETIME
);
