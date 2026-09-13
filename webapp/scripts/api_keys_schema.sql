-- API Keys D1 Database Schema
--
-- Usage:
-- 1. Create a new D1 database in Cloudflare (e.g., named 'api-keys') via the dashboard or Wrangler CLI.
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
	rate_limit_reset_at DATETIME,
	-- 'user' (created by a human in /api-keys), 'api' (a service credential,
	-- e.g. the MCP) or 'system' (provisioned by ftn for a logged-in user).
	kind TEXT NOT NULL DEFAULT 'user',
	-- Counter bumped on each rotation of a 'system' key; part of the value the
	-- token is derived from, so bumping it invalidates the previous token.
	rotation INTEGER NOT NULL DEFAULT 0
);
