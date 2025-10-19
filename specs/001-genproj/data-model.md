# Data Model: Project Generation Tool (genproj)

**Date**: 2025-01-15  
**Feature**: Project Generation Tool  
**Phase**: 1 - Design & Contracts

## Core Entities

### 1. Project Configuration

**Purpose**: Represents a user's project configuration including selected capabilities and settings.

```javascript
/**
 * @typedef {Object} ProjectConfiguration
 * @property {string} id - UUID for session tracking
 * @property {string} [userId] - Google user ID (when authenticated)
 * @property {string} projectName - User-provided project name
 * @property {string} [repositoryUrl] - Existing repository URL (optional)
 * @property {string[]} selectedCapabilities - Array of selected capability IDs
 * @property {Object<string, any>} configuration - Capability-specific configuration
 * @property {Date} createdAt - Configuration creation timestamp
 * @property {Date} updatedAt - Last modification timestamp
 * @property {'draft'|'preview'|'generating'|'completed'|'failed'} status
 */

**Validation Rules**:

- `projectName`: Required, 3-50 characters, alphanumeric + hyphens only
- `repositoryUrl`: Optional, must be valid GitHub URL if provided
- `selectedCapabilities`: Required, non-empty array
- `configuration`: Must match capability requirements

**State Transitions**:

```

draft → preview → generating → completed
↓ ↓ ↓
failed ← failed ← failed

````

### 2. Capability Definition

**Purpose**: Defines available project capabilities with their requirements and dependencies.

```javascript
/**
 * @typedef {Object} CapabilityDefinition
 * @property {CapabilityId} id - Unique capability identifier
 * @property {string} name - Human-readable name
 * @property {string} description - Detailed description
 * @property {'devcontainer'|'ci-cd'|'code-quality'|'secrets'|'deployment'|'monitoring'} category
 * @property {CapabilityId[]} dependencies - Required capabilities
 * @property {CapabilityId[]} conflicts - Conflicting capabilities
 * @property {ServiceId[]} requiresAuth - Required authentication services
 * @property {Object} configurationSchema - Configuration validation schema
 * @property {TemplateReference[]} templates - Associated file templates
 * @property {Object} [externalService] - External service configuration
 * @property {ServiceId} externalService.service
 * @property {boolean} externalService.projectCreation - Can create projects automatically
 * @property {string} externalService.fallbackInstructions - Manual setup instructions
 */
````

**Capability IDs**:

```javascript
/**
 * @typedef {'devcontainer-node'|'devcontainer-python'|'devcontainer-java'|'circleci'|'github-actions'|'sonarcloud'|'sonarlint'|'doppler'|'cloudflare-wrangler'|'dependabot'|'lighthouse-ci'|'playwright'|'spec-kit'} CapabilityId
 */
```

### 3. Authentication State

**Purpose**: Tracks user authentication status across multiple services, reusing existing Google auth.

```javascript
/**
 * @typedef {Object} AuthenticationState
 * @property {string} userId - Google user ID (from existing auth)
 * @property {Object} google - Reuses existing Google auth state
 * @property {boolean} google.authenticated - From existing auth system
 * @property {string} google.email - From existing auth system
 * @property {Date} google.expiresAt - From existing auth system
 * @property {Object} github - New GitHub OAuth integration
 * @property {boolean} github.authenticated
 * @property {string} github.username
 * @property {string} github.token - Encrypted OAuth token
 * @property {Date} github.expiresAt
 * @property {string[]} github.scopes
 * @property {Object} circleci - New CircleCI API token
 * @property {boolean} circleci.authenticated
 * @property {string} circleci.token - Encrypted API token
 * @property {Date} circleci.expiresAt
 * @property {Object} doppler - New Doppler API token
 * @property {boolean} doppler.authenticated
 * @property {string} doppler.token - Encrypted API token
 * @property {Date} doppler.expiresAt
 * @property {Object} sonarcloud - New SonarCloud API token
 * @property {boolean} sonarcloud.authenticated
 * @property {string} sonarcloud.token - Encrypted API token
 * @property {Date} sonarcloud.expiresAt
 * @property {Date} lastUpdated
 */
```

### 4. Generated Artifact

**Purpose**: Represents a file or configuration that will be created.

```javascript
/**
 * @typedef {Object} GeneratedArtifact
 * @property {string} id - Unique artifact identifier
 * @property {string} projectConfigId - Reference to project configuration
 * @property {CapabilityId} capabilityId - Source capability
 * @property {string} filePath - Target file path in repository
 * @property {string} content - File content
 * @property {string} templateId - Source template identifier
 * @property {Object<string, any>} variables - Template variables
 * @property {boolean} isExecutable - File permissions
 * @property {Date} createdAt
 */
```

### 5. External Service Integration

**Purpose**: Tracks integration status with external services.

```javascript
/**
 * @typedef {Object} ExternalServiceIntegration
 * @property {string} id
 * @property {string} projectConfigId
 * @property {ServiceId} serviceId
 * @property {'pending'|'creating'|'completed'|'failed'} status
 * @property {string} [serviceProjectId] - External service project ID
 * @property {Object<string, any>} configuration - Service-specific configuration
 * @property {string} [errorMessage] - Error details if failed
 * @property {Date} createdAt
 * @property {Date} [completedAt]
 */

/**
 * @typedef {'github'|'circleci'|'doppler'|'sonarcloud'} ServiceId
 */
```

## Database Schema (Cloudflare D1)

### Schema Creation Pattern

Following the established pattern from `ccbilling_schema.sql`, the genproj schema will be created in `webapp/scripts/genproj_schema.sql` for initial setup, not in migrations.

### Tables

```sql
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
```

## Data Validation

### Project Configuration Validation

```javascript
const projectConfigSchema = {
  type: "object",
  required: ["projectName", "selectedCapabilities"],
  properties: {
    projectName: {
      type: "string",
      minLength: 3,
      maxLength: 50,
      pattern: "^[a-zA-Z0-9-]+$",
    },
    repositoryUrl: {
      type: "string",
      format: "uri",
      pattern: "^https://github\\.com/[^/]+/[^/]+/?$",
    },
    selectedCapabilities: {
      type: "array",
      minItems: 1,
      items: { type: "string" },
    },
    configuration: {
      type: "object",
      additionalProperties: true,
    },
  },
};
```

### Capability Configuration Validation

```javascript
const capabilityConfigSchemas = {
  "devcontainer-node": {
    type: "object",
    properties: {
      nodeVersion: { type: "string", enum: ["18", "20", "22"] },
      packageManager: { type: "string", enum: ["npm", "yarn", "pnpm"] },
    },
  },
  circleci: {
    type: "object",
    properties: {
      nodeVersion: { type: "string", enum: ["18", "20", "22"] },
      deployTarget: { type: "string", enum: ["cloudflare", "vercel", "aws"] },
    },
  },
  // ... other capability schemas
};
```

## State Management

### Client-Side State (Svelte Stores)

```javascript
// Project configuration store
export const projectConfig = writable(null);

// Authentication state store
export const authState = writable(null);

// Preview mode store
export const previewMode = writable(false);

// Generated artifacts store
export const generatedArtifacts = writable([]);

// Loading states
export const isLoading = writable(false);
export const errorMessage = writable(null);
```

### Server-Side State Management

- **Direct D1 usage**: Project configurations stored directly in D1 using `platform.env.DB`
- **Direct R2 usage**: Template files stored directly in R2 using `platform.env.R2_GENPROJ`
- **Session-based**: Project configurations tied to user sessions
- **Temporary storage**: Configurations expire after 24 hours if not completed
- **Cleanup**: Automated cleanup of abandoned configurations
- **Audit trail**: All state changes logged for debugging

## Data Flow

### 1. Configuration Flow

```
User Input → Validation → Project Configuration → Preview Generation → Display
```

### 2. Authentication Flow

```
User Action → Service Auth Required → OAuth/Token Flow → Auth State Update → Continue
```

### 3. Generation Flow

```
Confirmed Config → Artifact Generation → External Service Creation → Repository Commit → Completion
```

## Security Considerations

### Data Encryption

- **API tokens**: Encrypted using Cloudflare's encryption at rest
- **Sensitive config**: User-provided secrets encrypted before storage
- **Session data**: Encrypted session cookies

### Data Retention

- **Project configurations**: Retained for 30 days after completion
- **Authentication tokens**: Retained until expiration or user logout
- **Generated artifacts**: Retained for 7 days for debugging purposes

### Access Control

- **User isolation**: Users can only access their own configurations
- **Admin access**: Limited admin access for debugging and support
- **Audit logging**: All data access logged for security monitoring
