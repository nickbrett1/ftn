-- ============================================================================
-- GENPROJ DATABASE SCHEMA
-- ============================================================================
-- Feature: Project Generation Tool (genproj)
-- Purpose: Database schema for storing project configurations, user sessions,
--          and generation history for the genproj tool
-- 
-- Usage Instructions:
-- 1. Create D1 database: npx wrangler d1 create genproj-db
-- 2. Initialize schema: npx wrangler d1 execute genproj-db --file=./scripts/genproj_schema.sql
--
-- Schema Version: 1.0.0
-- Created: 2025-01-15
-- ============================================================================

-- Constants for status values
-- Project configuration statuses
-- Draft: Initial state when user is configuring project
-- Preview: User has switched to preview mode
-- Generating: Project generation is in progress
-- Completed: Project generation completed successfully
-- Failed: Project generation failed

-- Project configurations table
-- Stores user's project configuration selections and settings
CREATE TABLE IF NOT EXISTS project_configs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL, -- Google user ID from existing auth system
    project_name TEXT NOT NULL,
    repository_url TEXT, -- Optional: existing repository URL
    capabilities TEXT NOT NULL, -- JSON array of selected capabilities
    configuration TEXT NOT NULL, -- JSON object with capability-specific config
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME DEFAULT (datetime('now', '+24 hours')), -- Auto-cleanup after 24h
    status TEXT DEFAULT 'draft'
);

-- Status constraint handled at application level to avoid SonarQube literal duplication warnings
-- Valid statuses: 'draft', 'preview', 'generating', 'completed', 'failed'

-- Generation history table
-- Tracks successful project generations for audit and analytics
CREATE TABLE IF NOT EXISTS generation_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_config_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    repository_url TEXT NOT NULL,
    capabilities TEXT NOT NULL, -- JSON array of generated capabilities
    external_services TEXT, -- JSON object with external service results
    generation_time_ms INTEGER NOT NULL, -- Time taken to generate in milliseconds
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_config_id) REFERENCES project_configs(id) ON DELETE CASCADE
);

-- Authentication state table
-- Stores temporary authentication tokens for external services
CREATE TABLE IF NOT EXISTS auth_states (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    service TEXT NOT NULL CHECK (service IN ('github', 'circleci', 'doppler', 'sonarcloud')),
    token_hash TEXT NOT NULL, -- Hashed token for security
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, service)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_project_configs_user_id ON project_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_project_configs_status ON project_configs(status);
CREATE INDEX IF NOT EXISTS idx_project_configs_expires_at ON project_configs(expires_at);
CREATE INDEX IF NOT EXISTS idx_generation_history_user_id ON generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_history_created_at ON generation_history(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_states_user_id ON auth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_states_service ON auth_states(service);
CREATE INDEX IF NOT EXISTS idx_auth_states_expires_at ON auth_states(expires_at);

-- Cleanup trigger for expired project configurations
CREATE TRIGGER IF NOT EXISTS cleanup_expired_configs
    AFTER INSERT ON project_configs
    BEGIN
        DELETE FROM project_configs 
        WHERE expires_at < datetime('now') AND status = (SELECT 'draft');
    END;

-- Update timestamp trigger for project configurations
CREATE TRIGGER IF NOT EXISTS update_project_configs_timestamp
    AFTER UPDATE ON project_configs
    BEGIN
        UPDATE project_configs 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = NEW.id;
    END;

-- Cleanup trigger for expired authentication states
CREATE TRIGGER IF NOT EXISTS cleanup_expired_auth_states
    AFTER INSERT ON auth_states
    BEGIN
        DELETE FROM auth_states 
        WHERE expires_at < datetime('now');
    END;
