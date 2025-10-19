# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Verify compliance with `.specify/memory/constitution.md` principles:

### Pre-Implementation Gates (Required Before Starting)

- [ ] **Specification Complete**: User stories with acceptance criteria defined (Principle III)
- [ ] **Tests Planned**: Test scenarios identified following TDD approach (Principle II)
- [ ] **Performance Budget**: Performance targets defined (<1.5s FCP, <2.5s LCP) (Principle IV)
- [ ] **Security Review**: Security implications assessed, especially for auth/data handling (Principle V)
- [ ] **Accessibility Review**: WCAG 2.1 AA requirements identified (Principle III)

### Code Quality Standards (Principle I)

- [ ] TypeScript strict mode enabled with no `any` types without justification
- [ ] Linting configured (ESLint, Prettier) and enforced in CI
- [ ] SonarCloud integration configured with Quality Gate requirement
- [ ] Code review process documented

### Testing Standards (Principle II - NON-NEGOTIABLE)

- [ ] TDD approach confirmed: Tests written → User approval → Implementation
- [ ] Minimum 85% coverage target set
- [ ] Test types planned: Unit, Integration, Contract tests
- [ ] Test performance requirements: <5s per unit suite, <30s per integration suite
- [ ] Security testing planned for auth/validation flows

### UX Consistency (Principle III)

- [ ] Design system components identified (TailwindCSS tokens, Storybook components)
- [ ] Responsive design tested (320px–2560px viewports)
- [ ] Accessibility requirements defined (semantic HTML, ARIA, keyboard navigation)
- [ ] Error handling and user feedback patterns designed
- [ ] Performance budgets: FCP <1.5s, LCP <2.5s, CLS <0.1, TTI <3.5s

### Performance Requirements (Principle IV)

- [ ] Lighthouse CI configured with ≥95 score requirement
- [ ] Bundle size budget: <200KB initial JS, <500KB total
- [ ] API response time targets: p95 <200ms reads, <500ms writes
- [ ] Caching strategy defined
- [ ] Performance monitoring configured (RUM, synthetic monitoring)

### Security & Compliance (Principle V - NON-NEGOTIABLE)

- [ ] Authentication/authorization approach defined
- [ ] Data encryption strategy (at rest and in transit)
- [ ] PII/sensitive data handling compliant with GDPR
- [ ] Security scanning enabled (GitGuardian, dependency scanning)
- [ ] Audit logging planned for data access and mutations
- [ ] Security headers configured (CSP, HSTS, etc.)

### Site Consistency & Component Standards (Principle VI)

- [ ] Header and footer components identified and documented
- [ ] Page layout standards defined (containers, spacing, breakpoints)
- [ ] Component library requirements identified (Storybook documentation)
- [ ] Brand consistency requirements (logo, colors, typography)
- [ ] Navigation patterns defined (breadcrumbs, menus, transitions)
- [ ] No custom headers/footers without architectural approval

### Database Schema Management Standards (Principle VII)

- [ ] Database schema file created in `webapp/scripts/{feature-name}_schema.sql`
- [ ] Schema file includes comprehensive header comments with usage instructions
- [ ] All tables include proper foreign key constraints and performance indexes
- [ ] Database setup commands documented and tested
- [ ] Schema validation completed with actual D1 database creation
- [ ] No initial schema creation in migrations folder

### Cloudflare Services Integration Standards (Principle VIII)

- [ ] D1 database operations use direct `platform.env.DB` access without wrapper utilities
- [ ] R2 storage operations use direct `platform.env.R2_*` access without wrapper utilities
- [ ] Service classes implement D1/R2 integration with proper error handling
- [ ] Environment bindings follow naming patterns (`DB_{FEATURE}`, `R2_{FEATURE}`)
- [ ] Local development uses `--local` flag, production uses `--remote` flag
- [ ] Service classes are testable with mocked `platform.env` objects

### Code Organization Standards (Principle IX)

- [ ] Svelte components placed in `lib/components/` with feature-specific subfolders
- [ ] Client-side code placed in `lib/client/` (browser-only, not components)
- [ ] Server-side code placed in `lib/server/` (server-only, database operations)
- [ ] Universal utilities placed in `lib/utils/` (can run anywhere)
- [ ] Import paths reflect execution context requirements
- [ ] Code placed in most restrictive folder that supports requirements

### Simple Logging Standards (Principle X)

- [ ] Native console methods used (`console.log()`, `console.error()`, `console.warn()`)
- [ ] Consistent emoji prefixes used (✅, ❌, ⚠️, 🔍, 🔄, 📝)
- [ ] Context-aware messages included in log statements
- [ ] Appropriate log levels used for different situations
- [ ] No custom logging utilities or wrapper functions created

### Error Handling Standards (Principle XI)

- [ ] Existing `RouteUtils.handleError()` used for server-side error handling
- [ ] Client-side error handling implemented directly in components/services
- [ ] User-friendly error messages provided (no technical jargon)
- [ ] Consistent error handling patterns followed across codebase
- [ ] No custom error handler utilities or wrappers created

**Violation Justification**: Use Complexity Tracking section below if any gate cannot be satisfied

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

_Fill ONLY if Constitution Check has violations that must be justified_

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
