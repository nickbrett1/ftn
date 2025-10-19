# Quickstart Guide: Project Generation Tool (genproj)

**Date**: 2025-01-15  
**Feature**: Project Generation Tool  
**Phase**: 1 - Design & Contracts

## Overview

The Project Generation Tool (genproj) is a comprehensive web application that allows developers to configure and generate new development projects with selected capabilities through an intuitive UI. The tool provides preview functionality without authentication, then handles multi-service authentication and project creation when users confirm generation.

## Architecture

### Technology Stack

- **Frontend**: SvelteKit 2.47, JavaScript ES2022, TailwindCSS
- **Backend**: SvelteKit server-side functions, Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (file templates)
- **Authentication**: Google OAuth, GitHub OAuth, API tokens
- **Testing**: Vitest, Playwright, @testing-library/svelte
- **Animation**: tsparticles for celebration effects

### Key Components

- **CapabilitySelector**: UI for selecting project capabilities
- **ConfigurationForm**: Form for capability-specific configuration
- **PreviewMode**: Preview of generated files and external service changes
- **AuthFlow**: Multi-service authentication management
- **CelebrationAnimation**: Success animation with particle effects

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Cloudflare account (for D1 and R2)
- GitHub account (for OAuth)
- CircleCI, Doppler, SonarCloud accounts (optional)

### Installation

1. **Clone and setup**:

   ```bash
   git clone https://github.com/nickbrett1/ftn.git
   cd ftn/webapp
   npm install
   ```

2. **Environment configuration**:

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Database setup**:

   ```bash
   # Create D1 database
   npx wrangler d1 create genproj-db

   # Initialize schema
   npx wrangler d1 execute genproj-db --file=./scripts/genproj_schema.sql
   ```

4. **Template storage setup**:

   ```bash
   # Create R2 bucket for templates
   npx wrangler r2 bucket create genproj-templates

   # Upload template files
   npm run upload-templates
   ```

### Development

1. **Start development server**:

   ```bash
   npm run dev
   ```

2. **Run tests**:

   ```bash
   # Unit tests
   npm run test:unit

   # Integration tests
   npm run test:integration

   # E2E tests
   npm run test:e2e
   ```

3. **Build and preview**:
   ```bash
   npm run build
   npm run preview
   ```

## API Usage

### Get Available Capabilities

```javascript
const response = await fetch("/projects/genproj/api/capabilities");
const { capabilities } = await response.json();
```

### Generate Preview

```javascript
const previewResponse = await fetch("/projects/genproj/api/preview", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    projectName: "my-project",
    selectedCapabilities: ["devcontainer-node", "circleci"],
    configuration: {
      "devcontainer-node": { nodeVersion: "20" },
      circleci: { deployTarget: "cloudflare" },
    },
  }),
});
const preview = await previewResponse.json();
```

### Generate Project

```javascript
const generateResponse = await fetch("/projects/genproj/api/generate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(projectConfig),
});
const result = await generateResponse.json();
```

## Configuration

### Environment Variables

```bash
# Authentication
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Database
DATABASE_URL=your_d1_database_url

# Storage
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=genproj-templates

# External Services
CIRCLECI_API_URL=https://circleci.com/api/v2
DOPPLER_API_URL=https://api.doppler.com
SONARCLOUD_API_URL=https://sonarcloud.io/api
```

### Capability Configuration

Capabilities are defined in `/src/lib/config/capabilities.js`:

```javascript
export const capabilities = [
  {
    id: "devcontainer-node",
    name: "Node.js DevContainer",
    description: "Development container with Node.js",
    category: "devcontainer",
    dependencies: [],
    conflicts: ["devcontainer-python"],
    requiresAuth: [],
    configurationSchema: {
      type: "object",
      properties: {
        nodeVersion: { type: "string", enum: ["18", "20", "22"] },
      },
    },
    templates: [
      { id: "devcontainer-json", filePath: ".devcontainer/devcontainer.json" },
      { id: "dockerfile", filePath: ".devcontainer/Dockerfile" },
    ],
  },
  // ... more capabilities
];
```

## Celebration Animation

### tsparticles Integration

The celebration animation uses the existing tsparticles library from your codebase:

```javascript
// Celebration animation component
import { tsParticles } from "tsparticles";

export function initializeCelebrationAnimation(container) {
  tsParticles.load(container, {
    particles: {
      number: { value: 100 },
      color: { value: ["#10b981", "#3b82f6", "#f59e0b"] },
      shape: { type: "circle" },
      opacity: { value: 0.8 },
      size: { value: { min: 1, max: 3 } },
      move: {
        enable: true,
        speed: 2,
        direction: "top",
        outModes: { default: "out" },
      },
    },
    background: { color: "transparent" },
    detectRetina: true,
  });
}
```

### Benefits of tsparticles

- **Existing Dependency**: No additional bundle size impact
- **Performance**: WebGL acceleration with Canvas fallback
- **Rich Features**: Extensive configuration options
- **Accessibility**: Built-in support for reduced motion preferences
- **Consistency**: Matches existing project animation patterns

## Authentication

### Google OAuth Integration

The genproj tool reuses the existing Google authentication flow:

```javascript
// Reuse existing Google auth from the main application
import { isUserAuthenticated } from "$lib/client/google-auth.js";

export async function checkAuthStatus() {
  return isUserAuthenticated();
}
```

### Progressive External Service Authentication

After Google authentication, external services are authenticated progressively:

```javascript
// GitHub OAuth (after Google auth)
export async function authenticateGitHub() {
  // Redirect to GitHub OAuth with proper scopes
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo,user`;
  window.location.href = authUrl;
}

// API Token Authentication (CircleCI, Doppler, SonarCloud)
export async function authenticateWithToken(service, token) {
  // Store encrypted token in D1
  await storeEncryptedToken(service, token);
}
```

### Benefits of Reusing Existing Auth

- **Consistency**: Same authentication flow users already know
- **Reduced Complexity**: No need to implement new Google OAuth
- **Familiar UX**: Users understand the existing auth pattern
- **Maintenance**: Leverages existing, tested authentication code

## Testing

### Unit Tests

```javascript
// Example unit test
import { describe, it, expect } from "vitest";
import { validateProjectName } from "$lib/utils/validation";

describe("Project Name Validation", () => {
  it("should accept valid project names", () => {
    expect(validateProjectName("my-project")).toBe(true);
    expect(validateProjectName("project123")).toBe(true);
  });

  it("should reject invalid project names", () => {
    expect(validateProjectName("my project")).toBe(false);
    expect(validateProjectName("my@project")).toBe(false);
  });
});
```

### Integration Tests

```javascript
// Example integration test
import { describe, it, expect } from "vitest";
import { generatePreview } from "$lib/services/project-generator";

describe("Preview Generation", () => {
  it("should generate preview for valid configuration", async () => {
    const config = {
      projectName: "test-project",
      selectedCapabilities: ["devcontainer-node"],
      configuration: { "devcontainer-node": { nodeVersion: "20" } },
    };

    const preview = await generatePreview(config);
    expect(preview.artifacts).toHaveLength(2);
    expect(preview.artifacts[0].filePath).toBe(
      ".devcontainer/devcontainer.json"
    );
  });
});
```

### E2E Tests

```javascript
// Example E2E test
import { test, expect } from "@playwright/test";

test("should generate project with selected capabilities", async ({ page }) => {
  await page.goto("/projects/genproj");

  // Select capabilities
  await page.click('[data-testid="capability-devcontainer-node"]');
  await page.fill('[data-testid="project-name"]', "test-project");

  // Switch to preview mode
  await page.click('[data-testid="preview-mode"]');
  await expect(page.locator('[data-testid="preview-content"]')).toBeVisible();

  // Generate project (requires authentication)
  await page.click('[data-testid="generate-project"]');
  await expect(page.locator('[data-testid="auth-flow"]')).toBeVisible();
});
```

## Deployment

### Cloudflare Workers

```bash
# Deploy to production
npm run deploy

# Deploy to preview
npm run deploy:preview
```

### Database Migrations

```bash
# Create new migration
npx wrangler d1 migrations create genproj-db "add-new-table"

# Apply migrations
npx wrangler d1 migrations apply genproj-db
```

### Template Updates

```bash
# Upload new templates
npm run upload-templates

# Sync templates from local
npm run sync-templates
```

## Monitoring and Debugging

### Logging

- **Structured logging**: All operations logged with request IDs
- **Error tracking**: Comprehensive error logging with stack traces
- **Performance monitoring**: API response times and user interactions

### Health Checks

- **API health**: `/health` endpoint for service status
- **Database health**: Connection and query performance monitoring
- **External services**: API availability and response time monitoring

### Debugging

```javascript
// Enable debug logging
const DEBUG = process.env.NODE_ENV === "development";

if (DEBUG) {
  console.log("Project config:", projectConfig);
  console.log("Generated artifacts:", artifacts);
}
```

## Security Considerations

### Authentication

- **OAuth flows**: Secure OAuth 2.0 implementation
- **Token storage**: Encrypted token storage in D1
- **Session management**: Secure session handling with expiration

### Data Protection

- **Input validation**: Comprehensive validation for all inputs
- **SQL injection prevention**: Parameterized queries
- **XSS protection**: Content Security Policy headers

### Rate Limiting

- **API rate limiting**: Per-user rate limiting
- **External service limits**: Respect external API rate limits
- **Abuse prevention**: Monitoring and blocking of abusive usage

## Performance Optimization

### Caching

- **Template caching**: R2 templates cached in memory
- **Preview caching**: Generated previews cached for performance
- **API response caching**: External API responses cached when appropriate

### Bundle Optimization

- **Code splitting**: Genproj-specific code split from main bundle
- **Tree shaking**: Unused code eliminated from bundle
- **Asset optimization**: Images and fonts optimized

### Database Optimization

- **Indexing**: Proper indexes for query performance
- **Connection pooling**: Efficient database connection management
- **Query optimization**: Optimized queries for common operations

## Troubleshooting

### Common Issues

1. **Authentication failures**:

   - Check OAuth configuration
   - Verify token expiration
   - Ensure proper scopes

2. **Preview generation errors**:

   - Validate capability configuration
   - Check template availability
   - Verify file path generation

3. **External service integration failures**:
   - Verify API tokens
   - Check service availability
   - Review rate limiting

### Debug Commands

```bash
# Check database status
npx wrangler d1 execute genproj-db --command="SELECT COUNT(*) FROM project_configurations"

# Test external API connectivity
npm run test:external-apis

# Validate templates
npm run validate-templates
```

## Contributing

### Development Workflow

1. Create feature branch
2. Write tests first (TDD)
3. Implement feature
4. Run all tests
5. Submit pull request

### Code Standards

- **JavaScript ES2022**: Modern JavaScript with strict mode enabled
- **JSDoc annotations**: Comprehensive type documentation using JSDoc
- **ESLint/Prettier**: Automated code formatting
- **Test coverage**: Minimum 85% coverage required
- **Documentation**: Comprehensive inline documentation

### Pull Request Process

1. All tests must pass
2. Code review required
3. Performance impact assessed
4. Security review completed
5. Documentation updated
