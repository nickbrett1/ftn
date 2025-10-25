-- Project Generation Tool D1 Database Schema
--
-- Usage:
-- 1. Create a new D1 database in Cloudflare (e.g., named 'genproj') via the dashboard or Wrangler CLI.
-- 2. Run this SQL to initialize the schema (can use the Cloudflare dashboard, Wrangler, or D1 CLI).
--
-- This file is for initial setup, not for migration from production data.

-- Project configurations
CREATE TABLE project_configurations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  project_name TEXT NOT NULL,
  repository_url TEXT,
  selected_capabilities TEXT NOT NULL, -- JSON array
  configuration TEXT NOT NULL,        -- JSON object
  status TEXT NOT NULL DEFAULT 'draft',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Authentication states
CREATE TABLE authentication_states (
  user_id TEXT PRIMARY KEY,
  google_auth TEXT NOT NULL,           -- JSON object
  github_auth TEXT,                    -- JSON object
  circleci_auth TEXT,                  -- JSON object
  doppler_auth TEXT,                   -- JSON object
  sonarcloud_auth TEXT,                -- JSON object
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Generated artifacts
CREATE TABLE generated_artifacts (
  id TEXT PRIMARY KEY,
  project_config_id TEXT NOT NULL,
  capability_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  template_id TEXT NOT NULL,
  variables TEXT NOT NULL,             -- JSON object
  is_executable BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_config_id) REFERENCES project_configurations(id)
);

-- External service integrations
CREATE TABLE external_service_integrations (
  id TEXT PRIMARY KEY,
  project_config_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  service_project_id TEXT,
  configuration TEXT NOT NULL,         -- JSON object
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (project_config_id) REFERENCES project_configurations(id)
);

-- Performance indexes
CREATE INDEX idx_project_configs_user_id ON project_configurations(user_id);
CREATE INDEX idx_project_configs_status ON project_configurations(status);
CREATE INDEX idx_artifacts_project_config ON generated_artifacts(project_config_id);
CREATE INDEX idx_integrations_project_config ON external_service_integrations(project_config_id);
CREATE INDEX idx_integrations_service ON external_service_integrations(service_id);