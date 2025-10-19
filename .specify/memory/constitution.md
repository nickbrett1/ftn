<!--
  ============================================================================
  SYNC IMPACT REPORT
  ============================================================================
  Version Change: 1.7.0 → 1.8.0
  Change Type: Minor Amendment - New Principle Added

  Modified Principles:
    - EXISTING: I. Code Quality Standards
    - EXISTING: II. Testing Standards
    - EXISTING: III. User Experience Consistency
    - EXISTING: IV. Performance Requirements
    - EXISTING: V. Security & Compliance
    - EXISTING: VI. Site Consistency & Component Standards
    - EXISTING: VII. Database Schema Management Standards
    - EXISTING: VIII. Cloudflare Services Integration Standards
    - EXISTING: IX. Code Organization Standards
    - EXISTING: X. Simple Logging Standards
    - EXISTING: XI. Error Handling Standards
    - EXISTING: XII. Code Quality Assurance Standards
    - EXISTING: XIII. Linter Compliance Standards
    - NEW: XIV. Development Environment Standards

  Added Sections:
    - Core Principles (all 11 principles)
    - Development Standards
    - Quality Gates
    - Governance

  Removed Sections: None

  Templates Status:
    ✅ plan-template.md - Reviewed and aligned
    ✅ spec-template.md - Reviewed and aligned
    ✅ tasks-template.md - Reviewed and aligned
    ✅ agent-file-template.md - Reviewed and aligned
    ✅ checklist-template.md - Reviewed and aligned

  Follow-up TODOs: None

  Notes:
    - Constitution gates align with existing plan-template.md Constitution Check section
    - Testing standards match tasks-template.md TDD emphasis
    - Performance requirements align with existing project metrics (>95 Lighthouse, >85% coverage)
    - UX principles match spec-template.md user story requirements
    - Site consistency principle ensures component reuse and design system adherence
    - Database schema management principle standardizes initial schema creation patterns
    - Cloudflare services integration principle standardizes direct D1/R2 usage patterns
    - Code organization principle standardizes lib/ folder structure and execution context
    - Simple logging principle standardizes console.* usage with emoji prefixes
    - Error handling principle standardizes RouteUtils.handleError() usage and user-friendly messages
  ============================================================================
-->

# FTN Constitution

## Core Principles

### I. Code Quality Standards

**Code quality is non-negotiable and must be measurable.**

All code contributions MUST:

- Maintain consistent style enforced by automated linting (ESLint, Prettier)
- Follow language-specific best practices (TypeScript strict mode, SvelteKit conventions)
- Include type safety where applicable (no `any` types without explicit justification)
- Be self-documenting with clear naming conventions; comments explain _why_, not _what_
- Pass automated code quality gates (SonarCloud Quality Gate must pass)
- Address all critical and high-severity linter warnings before merge
- Achieve minimum technical debt rating of 'A' in SonarCloud

**Rationale**: Financial applications require predictable, maintainable code. Automated quality gates ensure consistent standards without blocking velocity. Technical debt must be tracked and managed proactively.

### II. Testing Standards

**Test-Driven Development (TDD) is mandatory for all feature work.**

Testing requirements are NON-NEGOTIABLE:

- **Red-Green-Refactor cycle strictly enforced**: Write failing tests → User approval → Implement → Refactor
- **Minimum coverage**: 85% unit and integration test coverage required for all new code
- **Test types required**:
  - Unit tests: All business logic, utilities, and pure functions
  - Integration tests: API endpoints, database interactions, external service integrations
  - Contract tests: API contracts between frontend/backend, external dependencies
- **Test quality standards**:
  - Tests must be deterministic (no flaky tests allowed in main branch)
  - Tests must be independent (no test execution order dependencies)
  - Tests must be fast (<5 seconds per unit test suite, <30 seconds per integration suite)
- **Security testing**: All authentication/authorization flows, data validation, input sanitization
- **Performance testing**: Critical paths measured for regression (Lighthouse CI >95 score)

**Rationale**: Fintech applications demand reliability. TDD ensures features are designed for testability and validates requirements before implementation. Coverage thresholds prevent regression and build confidence for continuous deployment.

### III. User Experience Consistency

**User experience must be consistent, accessible, and delightful across all touchpoints.**

UX requirements are MANDATORY:

- **Accessibility first**: WCAG 2.1 AA compliance required for all interactive elements
  - Semantic HTML enforced
  - ARIA attributes required where HTML semantics insufficient
  - Keyboard navigation fully supported
  - Screen reader testing performed for critical flows
- **Responsive design**: Mobile-first approach, tested on 320px–2560px viewports
- **Performance budgets**:
  - First Contentful Paint (FCP): <1.5s
  - Largest Contentful Paint (LCP): <2.5s
  - Cumulative Layout Shift (CLS): <0.1
  - Time to Interactive (TTI): <3.5s
- **Design system**: All UI components must use the established TailwindCSS design tokens
  - Colors, spacing, typography from design system only
  - Component library (Storybook) documents all reusable components
  - No inline styles or magic numbers
- **User feedback**: All state changes provide clear feedback (loading states, success/error messages)
- **Error handling**: User-friendly error messages that guide resolution without exposing technical details

**Rationale**: Financial tools handle sensitive data and critical operations. Users must trust the interface through consistent, accessible, and performant experiences. Design systems ensure quality at scale.

### IV. Performance Requirements

**Performance is a feature and must be continuously monitored and optimized.**

Performance standards MUST be met:

- **Frontend performance**:
  - Lighthouse Performance score ≥95 (CI enforced)
  - Bundle size budget: <200KB initial JS, <500KB total for critical paths
  - Code splitting enforced for routes and heavy components
  - Images optimized (WebP/AVIF with fallbacks, responsive srcsets)
  - Fonts subset and preloaded
- **Backend performance**:
  - API response time p95 <200ms for reads, <500ms for writes
  - Database queries optimized (EXPLAIN QUERY PLAN reviewed for N+1, missing indexes)
  - Caching strategy implemented (Cloudflare edge caching, in-memory caching where appropriate)
- **Infrastructure performance**:
  - Global CDN distribution (Cloudflare Workers edge network)
  - Cold start time <50ms for serverless functions
  - Database connection pooling and optimization
- **Monitoring**:
  - Real User Monitoring (RUM) tracks actual user performance
  - Synthetic monitoring validates critical paths every 5 minutes
  - Performance regression alerts before deployment
  - Performance budgets enforced in CI/CD pipeline

**Rationale**: Users expect instant feedback, especially in financial applications where delays erode trust. Performance directly impacts conversion, engagement, and user satisfaction. Continuous monitoring prevents regression.

### V. Security & Compliance

**Security and data protection are fundamental requirements for all fintech operations.**

Security requirements are NON-NEGOTIABLE:

- **Authentication & Authorization**:
  - Secure session management with encrypted cookies
  - Multi-factor authentication (MFA) supported for sensitive operations
  - Role-based access control (RBAC) enforced at API and UI levels
  - Password requirements enforced (minimum 12 characters, complexity requirements)
- **Data Protection**:
  - Encryption at rest (D1 database, R2 storage)
  - Encryption in transit (TLS 1.3 minimum)
  - Sensitive data never logged or exposed in error messages
  - PII handling follows GDPR compliance guidelines
- **Security Scanning**:
  - GitGuardian secret scanning prevents credential leaks
  - Dependency vulnerability scanning (Snyk/npm audit) with zero critical vulnerabilities allowed
  - Static application security testing (SAST) in CI pipeline
  - Security headers enforced (CSP, HSTS, X-Frame-Options, etc.)
- **Audit & Compliance**:
  - Comprehensive audit logging for all data access and mutations
  - Immutable audit trail for financial transactions
  - Data retention policies enforced
  - Regular security reviews and penetration testing
- **Incident Response**:
  - Security incident response plan documented
  - Breach notification procedures defined
  - Rollback procedures tested and documented

**Rationale**: Financial applications are high-value targets for attackers. Proactive security measures, continuous scanning, and compliance adherence protect users and the business. Security must be built in, not bolted on.

### VI. Site Consistency & Component Standards

**All pages must maintain consistent styling and use established component patterns.**

Site consistency requirements are MANDATORY:

- **Header and Footer Components**: All pages MUST use the established header and footer components
  - No custom headers or footers without explicit architectural approval
  - Navigation consistency maintained across all pages
  - Footer content and links standardized
- **Page Layout Standards**:
  - Consistent page structure and spacing using TailwindCSS design tokens
  - Standardized content containers and responsive breakpoints
  - Uniform typography hierarchy (h1, h2, h3) across all pages
- **Component Reusability**:
  - All UI elements must use existing component library components
  - New components must be added to Storybook documentation
  - No duplicate component implementations allowed
- **Brand Consistency**:
  - Logo placement and sizing standardized
  - Color scheme adherence to established palette
  - Consistent button styles, form elements, and interactive components
- **Navigation Patterns**:
  - Breadcrumb navigation for multi-level pages
  - Consistent menu structure and behavior
  - Standardized page transitions and loading states

**Rationale**: Consistent user experience builds trust and reduces cognitive load. Standardized components ensure maintainability and prevent design drift. Professional fintech applications require polished, cohesive interfaces that reinforce brand credibility.

### VII. Database Schema Management Standards

**Database schema creation and management must follow established patterns for consistency and maintainability.**

Database schema requirements are MANDATORY:

- **Initial Schema Creation**: All new features with database requirements MUST create schema files in `webapp/scripts/`
  - Schema files MUST be named `{feature-name}_schema.sql` (e.g., `genproj_schema.sql`)
  - Schema files MUST include comprehensive header comments with usage instructions
  - Schema files MUST be version-controlled and documented
- **Schema File Structure**:
  - Header comments MUST include feature name, usage instructions, and setup steps
  - All tables MUST include proper foreign key constraints and indexes
  - Performance indexes MUST be created for all query patterns
  - Comments MUST explain complex relationships and business logic
- **Migration vs Schema Separation**:
  - `webapp/migrations/` is ONLY for schema changes between versions
  - `webapp/scripts/` is for initial schema creation and setup
  - No initial schema creation in migrations folder
- **Database Setup Documentation**:
  - Schema files MUST include D1 database creation commands
  - Schema files MUST include schema initialization commands
  - Setup instructions MUST be copy-pasteable and tested
- **Schema Validation**:
  - All schema files MUST be tested with actual D1 database creation
  - Foreign key constraints MUST be validated
  - Index performance MUST be verified with EXPLAIN QUERY PLAN
  - Schema files MUST be linted for SQL best practices

**Rationale**: Consistent database schema management prevents confusion between initial setup and migrations. Clear separation ensures maintainability and reduces setup errors. Standardized patterns enable rapid feature development while maintaining data integrity and performance.

### VIII. Cloudflare Services Integration Standards

**Cloudflare D1 and R2 services must be used directly without wrapper utilities, following established patterns.**

Cloudflare services requirements are MANDATORY:

- **Direct D1 Usage**: Database operations MUST use D1 directly via `platform.env.DB`
  - No wrapper utilities or abstraction layers for D1 operations
  - Direct usage of `db.prepare()`, `stmt.first()`, `stmt.all()`, `stmt.run()` methods
  - Error handling implemented at the service level, not in wrapper utilities
  - Database connections accessed through SvelteKit's `platform.env` context
- **Direct R2 Usage**: Object storage operations MUST use R2 directly via `platform.env.R2_*`
  - No wrapper utilities or abstraction layers for R2 operations
  - Direct usage of `bucket.get()`, `bucket.put()`, `bucket.list()`, `bucket.delete()` methods
  - R2 buckets accessed through SvelteKit's `platform.env` context with descriptive names
  - Object metadata and custom headers handled directly in service methods
- **Service-Level Integration**:
  - Database and storage operations MUST be implemented within service classes
  - Service classes handle error handling, retry logic, and business logic
  - No generic "database client" or "storage client" utilities
  - Each feature's services implement their own D1/R2 integration patterns
- **Environment Configuration**:
  - D1 databases MUST be configured in `wrangler.toml` with descriptive names
  - R2 buckets MUST be configured in `wrangler.toml` with descriptive names
  - Environment bindings MUST follow the pattern `R2_{FEATURE_NAME}` for buckets
  - Database bindings MUST follow the pattern `DB_{FEATURE_NAME}` for databases
- **Testing and Development**:
  - Local development MUST use `--local` flag for D1 operations
  - Production operations MUST use `--remote` flag for D1 operations
  - R2 operations MUST work seamlessly in both local and production environments
  - Service classes MUST be testable with mocked `platform.env` objects

**Rationale**: Direct usage of Cloudflare services eliminates unnecessary abstraction layers and follows the established patterns in the FTN codebase. Service-level integration provides better error handling, clearer business logic, and easier testing. This approach reduces complexity while maintaining consistency with existing project patterns.

### IX. Code Organization Standards

**Code must be organized in standardized lib/ folders based on execution context and reusability.**

Code organization requirements are MANDATORY:

- **lib/components/**: Reusable Svelte components ONLY
  - All `.svelte` files MUST be placed in `lib/components/`
  - Components MUST be reusable across multiple features/pages
  - Feature-specific components MUST be organized in subfolders (e.g., `lib/components/genproj/`)
  - Shared components MUST be placed directly in `lib/components/`
  - Components MUST follow SvelteKit component conventions and best practices
- **lib/client/**: Reusable client-side code that are NOT Svelte components
  - Code that MUST run in the browser (authentication, localStorage, DOM manipulation)
  - Client-side utilities, helpers, and services
  - Browser-specific APIs and Web APIs
  - Code that cannot run on the server due to browser dependencies
  - Examples: `lib/client/google-auth.js`, `lib/client/local-storage.js`
- **lib/server/**: Reusable server-side code ONLY
  - Code that MUST run on the server (database operations, file system access)
  - Server-side utilities, helpers, and services
  - Node.js-specific APIs and server-only dependencies
  - Code that cannot run in the browser due to server dependencies
  - Examples: `lib/server/require-user.js`, `lib/server/database-helpers.js`
- **lib/utils/**: Reusable code that can run anywhere (universal/isomorphic)
  - Pure functions with no browser or server dependencies
  - Utility functions that work in both client and server contexts
  - Data transformation, validation, formatting, and calculation functions
  - Code that can be safely imported and used anywhere
  - Examples: `lib/utils/date-utils.js`, `lib/utils/validation.js`, `lib/utils/formatting.js`
- **Folder Structure Enforcement**:
  - NO code outside of these four lib/ folders unless absolutely necessary
  - Feature-specific code MUST be organized in appropriate lib/ subfolders
  - Import paths MUST reflect the execution context requirements
  - Code MUST be placed in the most restrictive folder that supports its requirements

**Rationale**: Consistent code organization improves maintainability, prevents execution context errors, and makes the codebase easier to navigate. Clear separation between client/server/universal code prevents runtime errors and ensures proper code splitting. This organization pattern scales well as the project grows and makes it easier for developers to find and reuse code.

### X. Simple Logging Standards

**Logging must use simple, consistent patterns without wrapper utilities or complex abstractions.**

Logging requirements are MANDATORY:

- **Native Console Methods**: Use standard `console.log()`, `console.error()`, `console.warn()`, `console.info()` methods
  - NO wrapper utilities or logging libraries unless absolutely necessary
  - NO complex logging abstractions or configuration systems
  - Direct usage of browser/Node.js console methods
  - Simple, readable logging statements
- **Consistent Emoji Prefixes**: Use emoji prefixes for visual log categorization
  - ✅ for success messages and completed operations
  - ❌ for errors and failures
  - ⚠️ for warnings and potential issues
  - 🔍 for debugging and discovery messages
  - 🔄 for progress and state changes
  - 📝 for information and data logging
- **Context-Aware Messages**: Include relevant context in log messages
  - Include function/component names in log messages
  - Include relevant data/parameters when helpful for debugging
  - Use descriptive, human-readable messages
  - Avoid overly technical jargon in user-facing logs
- **Appropriate Log Levels**: Use appropriate console methods for different situations
  - `console.error()` for actual errors and exceptions
  - `console.warn()` for warnings and non-critical issues
  - `console.log()` for general information and debugging
  - `console.info()` for important system information
- **No Logging Utilities**: Avoid creating custom logging utilities or wrappers
  - Use console methods directly in service classes and components
  - Implement logging at the point of use, not through abstractions
  - Keep logging simple and maintainable

**Rationale**: Simple logging patterns are easier to maintain, debug, and understand. Native console methods provide sufficient functionality without additional complexity. Consistent emoji prefixes improve log readability and make debugging faster. Direct usage prevents abstraction overhead and keeps logging statements clear and maintainable.

### XI. Error Handling Standards

**Error handling must use existing patterns and avoid creating unnecessary wrapper utilities.**

Error handling requirements are MANDATORY:

- **Use Existing Error Handling**: Leverage existing `RouteUtils.handleError()` for server-side error handling
  - Use `RouteUtils.handleError(error, context, options)` for API endpoints
  - Include relevant context in error messages
  - Return appropriate HTTP status codes
  - Provide user-friendly error messages
- **Client-Side Error Handling**: Implement error handling directly in components and services
  - Use try-catch blocks for async operations
  - Display user-friendly error messages in UI
  - Handle different error types appropriately
  - Provide fallback options when possible
- **No Error Handler Utilities**: Avoid creating custom error handling utilities or wrappers
  - Implement error handling at the point of use
  - Use existing patterns and utilities
  - Keep error handling simple and maintainable
  - Avoid over-engineering error handling systems
- **User-Friendly Messages**: Transform technical errors into user-friendly messages
  - Replace technical terms with user-friendly language
  - Provide actionable error messages when possible
  - Include helpful context for users
  - Avoid exposing internal system details
- **Consistent Error Patterns**: Follow consistent error handling patterns across the codebase
  - Use similar error handling approaches in similar contexts
  - Maintain consistency with existing error handling
  - Follow established patterns for different error types
  - Ensure error handling is predictable and maintainable

**Rationale**: Using existing error handling patterns reduces complexity and maintains consistency. Avoiding wrapper utilities prevents over-engineering and keeps error handling simple. User-friendly error messages improve user experience and reduce support burden. Consistent patterns make the codebase easier to maintain and debug.

## Development Standards

### Code Review Requirements

All code changes MUST:

- Pass automated CI/CD pipeline (tests, linting, security scanning, performance checks)
- Receive approval from at least one team member
- Include tests demonstrating changed functionality
- Update relevant documentation (inline comments, README, specs)
- Address all reviewer feedback or document reasons for deferral

**Blocking conditions** (no merge until resolved):

- Test coverage drops below 85%
- SonarCloud Quality Gate fails
- Critical or high security vulnerabilities detected

### Branching & Deployment Strategy

- **Preview deployments**: Automatic preview URLs for all feature branches
- **Zero-downtime deployments**: Rolling deployments with health checks
- **Rollback capability**: Previous version deployable within 2 minutes
- **Deployment frequency**: Continuous deployment to production after PR merge (if all gates pass)

## Quality Gates

### Pre-Implementation Gates

Before starting feature implementation, validate:

1. **Specification complete**: User stories with acceptance criteria defined
2. **Tests planned**: Test scenarios identified and agreed upon
3. **Performance budget**: Performance targets defined for new features
4. **Security review**: Security implications assessed and mitigations planned
5. **Accessibility review**: A11y requirements identified

### Pre-Merge Gates

Before merging to main, validate:

1. **All tests passing**: Unit, integration, contract tests green
2. **Coverage maintained**: ≥85% coverage maintained or improved
3. **Code quality gates**: SonarCloud Quality Gate passed
4. **Performance validated**: Lighthouse CI ≥95, no performance regression
5. **Security validated**: No critical/high vulnerabilities, secrets scanning passed
6. **Accessibility validated**: No WCAG violations introduced
7. **Documentation updated**: README, inline docs, specs updated as needed

### Post-Deployment Gates

After deploying to production, validate:

1. **Health checks passing**: Application responsive and functional
2. **Error rates normal**: No spike in error rates or logs
3. **Performance within SLA**: RUM metrics within acceptable ranges
4. **Monitoring active**: Alerts configured and functioning

## Governance

### Amendment Process

Constitution changes require:

1. **Proposal**: Documented rationale for change with impact analysis
2. **Discussion**: Team review and feedback period (minimum 48 hours)
3. **Approval**: Consensus from engineering leads
4. **Migration plan**: Steps to bring existing code into compliance (if applicable)
5. **Version bump**: Semantic versioning of constitution
   - **MAJOR**: Backward incompatible principle removals or redefinitions
   - **MINOR**: New principles or materially expanded guidance
   - **PATCH**: Clarifications, wording improvements, non-semantic changes
6. **Documentation**: All dependent templates and guides updated
7. **Communication**: Team notified of changes and training provided if needed

### Compliance Reviews

- **Daily**: Automated CI/CD pipeline enforces code quality, testing, security, performance gates
- **Weekly**: Review failed builds and quality trends; address systemic issues
- **Monthly**: Review technical debt metrics and prioritize remediation
- **Quarterly**: Full constitution compliance audit; identify gaps and improvement opportunities
- **Annually**: Constitution effectiveness review; major updates as needed

### Exception Process

Principle violations require explicit justification:

1. **Document exception**: Why deviation necessary, what alternatives considered
2. **Time-box exception**: Temporary exceptions have expiration dates
3. **Mitigation plan**: How risks will be managed during exception period
4. **Approval required**: Engineering lead approval for any principle violation
5. **Track exceptions**: All exceptions logged and reviewed monthly

**Note**: Security and testing standards have no exceptions. These principles are absolute.

### Decision Framework

When making technical decisions, evaluate against principles in order:

1. **Security first**: Does this compromise security or data protection? If yes, reject.
2. **Testing coverage**: Can this be tested effectively? If no, redesign.
3. **Performance impact**: Does this degrade user experience? If yes, optimize or reject.
4. **Accessibility impact**: Does this harm accessibility? If yes, fix or reject.
5. **Code quality**: Does this increase maintainability burden? If yes, simplify.
6. **User value**: Does this deliver user value proportional to complexity? If no, defer.

All technical decisions must be documented in Architecture Decision Records (ADRs) when they:

- Introduce new technologies or frameworks
- Establish new patterns or conventions
- Make tradeoffs between competing principles
- Impact system architecture or data models

- Explicitly forbids custom error handling utilities or wrappers.

### XII. Code Quality Assurance Standards

**Mandate**: All generated code MUST pass SonarQube quality gates with zero warnings or errors.

**Requirements**:

- **Zero SonarQube Issues**: No warnings, bugs, vulnerabilities, or code smells allowed
- **Cognitive Complexity**: Functions must not exceed 15 cognitive complexity points
- **Code Duplication**: Maximum 3% code duplication threshold
- **Test Coverage**: Minimum 85% line coverage for all generated code
- **Security Hotspots**: Zero security hotspots in generated code
- **Maintainability Rating**: A rating required for all generated code
- **Reliability Rating**: A rating required for all generated code
- **Security Rating**: A rating required for all generated code

**Implementation Standards**:

- Use `String.replaceAll()` instead of `String.replace()` with global regex
- Use `RegExp.exec()` instead of `String.match()` for better performance
- Use optional chaining (`?.`) instead of logical AND (`&&`) for property access
- Use `Number.isNaN()` instead of `isNaN()` for type safety
- Avoid unused variables and parameters
- Handle exceptions properly or don't catch them at all
- Use descriptive variable names to avoid reserved keyword conflicts
- Prefer array methods over multiple `Array.push()` calls

**Acceptable Exception Patterns**:

- **Token Validation**: Catch blocks that intentionally set default values for authentication token validation are acceptable
- **Required ESLint Comments**: Use `// eslint-disable-next-line sonarjs/no-useless-catch` with explanatory comments
- **Documentation**: All disabled warnings must include clear comments explaining why the pattern is acceptable
- **Logging**: Include appropriate logging when handling exceptions to maintain observability
- **SQL Schema Constraints**: Database constraints that would duplicate literals can be handled at the application level with clear documentation

**Quality Gates**:

- **Blocking**: Any SonarQube issue prevents code generation
- **Automated**: SonarQube analysis runs on every code generation
- **Reporting**: Quality metrics included in generation reports
- **Documentation**: Quality standards documented in generated README files

### XIII. Linter Compliance Standards

**Core Principle**: All generated code must pass linter validation without warnings or errors.

**Implementation Standards**:

- **Zero Tolerance**: No linter warnings or errors in generated code
- **Pre-Generation Validation**: Linter checks must pass before code generation
- **Real-Time Feedback**: Linter errors must be fixed immediately during development
- **Automated Enforcement**: CI/CD pipelines must enforce linter compliance

**Linter Rules**:

- **ESLint**: All JavaScript/TypeScript code must pass ESLint validation
- **Svelte**: All Svelte components must pass Svelte linter validation
- **CSS**: All CSS must pass style linter validation
- **Accessibility**: All components must pass accessibility linter checks

**Exception Handling**:

- **Required Comments**: All disabled linter rules must include explanatory comments
- **Documentation**: Disabled rules must be documented with justification
- **Review Required**: Any linter rule disabling requires code review approval
- **Temporary Only**: Linter rule disabling must be temporary with clear resolution plan

**Acceptable Exception Patterns**:

- **Tailwind CSS Directives**: `@plugin` and other Tailwind-specific at-rules are acceptable with `/* stylelint-disable-next-line at-rule-no-unknown */` comments
- **Framework-Specific Rules**: CSS linter rules that conflict with framework requirements (Tailwind, PostCSS plugins) are acceptable with proper documentation

**Quality Gates**:

- **Blocking**: Any linter failure prevents code generation
- **Automated**: Linter analysis runs on every code generation
- **Reporting**: Linter compliance metrics included in generation reports
- **Documentation**: Linter standards documented in generated README files

### XIV. Development Environment Standards

**Core Principle**: Development server should always be running to enable immediate testing and debugging.

**Implementation Standards**:

- **Always Running**: Development server must be running at all times during development
- **No Manual Startup**: No need to run development server separately - it should be automatically available
- **Immediate Testing**: Changes should be immediately testable without server restart
- **Hot Reload**: All changes should trigger automatic reload and recompilation

**Development Workflow**:

- **Continuous Development**: Server runs continuously during development sessions
- **Instant Feedback**: Code changes are immediately reflected in the browser
- **Error Visibility**: Development errors are immediately visible in browser and console
- **No Interruption**: Development flow should not be interrupted by server management

**Quality Gates**:

- **Blocking**: Development cannot proceed without running development server
- **Automated**: Development server startup should be automated and seamless
- **Documentation**: Development environment setup documented in README files
- **Consistency**: All team members use the same development server configuration

**Version**: 1.8.0 | **Ratified**: 2025-10-15 | **Last Amended**: 2025-01-15
