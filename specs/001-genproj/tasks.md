# Tasks: Project Generation Tool (genproj)

**Input**: Design documents from `/specs/001-genproj/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Constitution Compliance**: All tasks must adhere to principles in `.specify/memory/constitution.md`:

- **Principle I**: Code Quality Standards (linting, type safety, code review)
- **Principle II**: Testing Standards (TDD mandatory - tests before implementation)
- **Principle III**: UX Consistency (accessibility, responsive design, design system)
- **Principle IV**: Performance Requirements (bundle size, response times, monitoring)
- **Principle V**: Security & Compliance (encryption, audit logging, security scanning)
- **Principle VI**: Site Consistency & Component Standards (header/footer, component reuse)
- **Principle VII**: Database Schema Management Standards (schema creation patterns)
- **Principle VIII**: Cloudflare Services Integration Standards (direct D1/R2 usage)
- **Principle IX**: Code Organization Standards (lib/ folder structure)
- **Principle X**: Simple Logging Standards (console.\* with emoji prefixes)
- **Principle XI**: Error Handling Standards (RouteUtils.handleError, user-friendly messages)

**Tests**: Following Principle II (Testing Standards), TDD is MANDATORY. Tests must be written FIRST, approved by user, and FAIL before implementation begins. Test coverage must meet 85% minimum threshold.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `webapp/src/`, `webapp/tests/` at repository root
- Paths shown below follow the SvelteKit structure from plan.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create genproj database schema in webapp/scripts/genproj_schema.sql
- [x] T002 [P] Create genproj route structure in webapp/src/routes/projects/genproj/
- [x] T003 [P] Setup R2 bucket for template storage configuration
- [x] T004 [P] Configure external API service integrations (GitHub, CircleCI, Doppler, SonarCloud)
- [x] T005 Initialize capability definitions in webapp/src/lib/config/capabilities.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Setup Cloudflare D1 database connection and initialization
- [x] T007 [P] Implement authentication state management extending existing Google auth
- [x] T008 [P] Create base validation utilities in webapp/src/lib/utils/validation.js
- [x] T009 [P] Setup error handling infrastructure using RouteUtils.handleError
- [x] T010 [P] Create logging utilities with emoji prefixes in webapp/src/lib/utils/logging.js
- [x] T011 [P] Setup template engine with Handlebars in webapp/src/lib/utils/file-generator.js
- [x] T012 Create base project configuration model in webapp/src/lib/models/project-config.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Browse Available Capabilities (Priority: P1) 🎯 MVP

**Goal**: Display all available project capabilities to unauthenticated users with clear descriptions

**Independent Test**: Visit `/projects/genproj` without authentication and verify all capability options are visible with descriptions, even though generation is disabled

### Tests for User Story 1 ⚠️

**NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T013 [P] [US1] Contract test for capabilities endpoint in webapp/tests/contract/test_capabilities_api.js
- [x] T014 [P] [US1] Integration test for capability browsing in webapp/tests/integration/test_capability_browsing.js
- [x] T015 [P] [US1] E2E test for unauthenticated capability viewing in webapp/tests/e2e/genproj_capabilities.spec.js

### Implementation for User Story 1

- [x] T016 [P] [US1] Create capabilities API endpoint in webapp/src/routes/projects/genproj/api/capabilities/+server.js
- [x] T017 [P] [US1] Create main genproj page component in webapp/src/routes/projects/genproj/+page.svelte
- [x] T018 [P] [US1] Create CapabilitySelector component in webapp/src/lib/components/genproj/CapabilitySelector.svelte
- [x] T019 [US1] Implement capability loading and display logic
- [x] T020 [US1] Add login prompt when generation attempted without auth
- [x] T021 [US1] Add logging for capability browsing operations

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Two-Tab Interface for Configuration and Preview (Priority: P1)

**Goal**: Provide clean two-tab interface where users can configure capabilities in one tab and preview generated output in another tab

**Independent Test**: Select capabilities in "Capabilities" tab, switch to "Preview" tab to see output, then switch back to modify capabilities and see preview update accordingly

### Tests for User Story 2 ⚠️

- [ ] T022 [P] [US2] Contract test for preview endpoint in webapp/tests/contract/test_preview_api.js
- [ ] T023 [P] [US2] Integration test for tab switching in webapp/tests/integration/test_tab_interface.js
- [ ] T024 [P] [US2] E2E test for two-tab workflow in webapp/tests/e2e/genproj_tabs.spec.js

### Implementation for User Story 2

- [ ] T025 [P] [US2] Create preview API endpoint in webapp/src/routes/projects/genproj/api/preview/+server.js
- [ ] T026 [P] [US2] Create ConfigurationForm component in webapp/src/lib/components/genproj/ConfigurationForm.svelte
- [ ] T027 [P] [US2] Create PreviewMode component in webapp/src/lib/components/genproj/PreviewMode.svelte
- [ ] T028 [US2] Implement tab switching logic and state management
- [ ] T029 [US2] Implement preview generation service in webapp/src/lib/services/project-generator.js
- [ ] T030 [US2] Add real-time preview updates when capabilities change
- [ ] T031 [US2] Add visual indicators for active tab
- [ ] T032 [US2] Add logging for tab switching and preview operations

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Authenticate for Project Generation (Priority: P1)

**Goal**: Handle progressive authentication with required services only when user confirms project generation

**Independent Test**: Configure a project, preview it, then authenticate with required services and verify project generation

### Tests for User Story 3 ⚠️

- [ ] T033 [P] [US3] Contract test for GitHub auth endpoint in webapp/tests/contract/test_github_auth.js
- [ ] T034 [P] [US3] Contract test for external service auth endpoints in webapp/tests/contract/test_external_auth.js
- [ ] T035 [P] [US3] Integration test for progressive auth flow in webapp/tests/integration/test_progressive_auth.js
- [ ] T036 [P] [US3] E2E test for authentication workflow in webapp/tests/e2e/genproj_auth.spec.js

### Implementation for User Story 3

- [ ] T037 [P] [US3] Create GitHub OAuth endpoint in webapp/src/routes/projects/genproj/api/auth/github/+server.js
- [ ] T038 [P] [US3] Create GitHub callback handler in webapp/src/routes/projects/genproj/api/auth/github/callback/+server.js
- [ ] T039 [P] [US3] Create CircleCI auth endpoint in webapp/src/routes/projects/genproj/api/auth/circleci/+server.js
- [ ] T040 [P] [US3] Create Doppler auth endpoint in webapp/src/routes/projects/genproj/api/auth/doppler/+server.js
- [ ] T041 [P] [US3] Create SonarCloud auth endpoint in webapp/src/routes/projects/genproj/api/auth/sonarcloud/+server.js
- [ ] T042 [US3] Create AuthFlow component in webapp/src/lib/components/genproj/AuthFlow.svelte
- [ ] T043 [US3] Implement authentication state management
- [ ] T044 [US3] Add encrypted token storage in D1
- [ ] T045 [US3] Add logging for authentication operations

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Generate Project with Confirmed Configuration (Priority: P1)

**Goal**: Generate complete project with all files and external service configurations after authentication

**Independent Test**: Confirm a preview and verify all files are generated and external services are configured exactly as previewed

### Tests for User Story 4 ⚠️

- [ ] T046 [P] [US4] Contract test for generation endpoint in webapp/tests/contract/test_generation_api.js
- [ ] T047 [P] [US4] Integration test for project generation in webapp/tests/integration/test_project_generation.js
- [ ] T048 [P] [US4] E2E test for complete generation workflow in webapp/tests/e2e/genproj_generation.spec.js

### Implementation for User Story 4

- [ ] T049 [P] [US4] Create generation API endpoint in webapp/src/routes/projects/genproj/api/generate/+server.js
- [ ] T050 [P] [US4] Implement GitHub API service in webapp/src/lib/services/github-api.js
- [ ] T051 [P] [US4] Implement CircleCI API service in webapp/src/lib/services/circleci-api.js
- [ ] T052 [P] [US4] Implement Doppler API service in webapp/src/lib/services/doppler-api.js
- [ ] T053 [P] [US4] Implement SonarCloud API service in webapp/src/lib/services/sonarcloud-api.js
- [ ] T054 [US4] Implement file generation and repository creation
- [ ] T055 [US4] Implement external service project creation
- [ ] T056 [US4] Add comprehensive error handling and fallback instructions
- [ ] T057 [US4] Add logging for generation operations

---

## Phase 7: User Story 5 - Authenticate with CircleCI for Project Creation (Priority: P2)

**Goal**: Connect CircleCI account for automatic CI/CD pipeline creation

**Independent Test**: Authenticate with CircleCI, select CI/CD capability, and verify CircleCI project is created and linked to GitHub repository

### Tests for User Story 5 ⚠️

- [ ] T058 [P] [US5] Integration test for CircleCI project creation in webapp/tests/integration/test_circleci_integration.js
- [ ] T059 [P] [US5] E2E test for CircleCI workflow in webapp/tests/e2e/genproj_circleci.spec.js

### Implementation for User Story 5

- [ ] T060 [P] [US5] Create CircleCI project templates in webapp/src/lib/templates/circleci/
- [ ] T061 [US5] Implement CircleCI project creation logic
- [ ] T062 [US5] Add CircleCI configuration file generation
- [ ] T063 [US5] Add GitHub webhook setup for CircleCI
- [ ] T064 [US5] Add logging for CircleCI operations

---

## Phase 8: User Story 6 - Generate Comprehensive Project Documentation (Priority: P2)

**Goal**: Create comprehensive README.md documenting all selected capabilities and setup instructions

**Independent Test**: Generate a project and verify the README.md contains all selected capabilities, setup instructions, and usage guidelines

### Tests for User Story 6 ⚠️

- [ ] T065 [P] [US6] Integration test for README generation in webapp/tests/integration/test_readme_generation.js
- [ ] T066 [P] [US6] E2E test for documentation workflow in webapp/tests/e2e/genproj_documentation.spec.js

### Implementation for User Story 6

- [ ] T067 [P] [US6] Create README templates in webapp/src/lib/templates/readme/
- [ ] T068 [US6] Implement README generation logic
- [ ] T069 [US6] Add capability-specific documentation sections
- [ ] T070 [US6] Add external service setup instructions
- [ ] T071 [US6] Add logging for documentation generation

---

## Phase 9: User Story 7 - Authenticate with Doppler for Secrets Management (Priority: P2)

**Goal**: Connect Doppler account for automatic secrets management setup

**Independent Test**: Authenticate with Doppler, select secrets management capability, and verify Doppler project is created and configured

### Tests for User Story 7 ⚠️

- [ ] T072 [P] [US7] Integration test for Doppler project creation in webapp/tests/integration/test_doppler_integration.js
- [ ] T073 [P] [US7] E2E test for Doppler workflow in webapp/tests/e2e/genproj_doppler.spec.js

### Implementation for User Story 7

- [ ] T074 [P] [US7] Create Doppler project templates in webapp/src/lib/templates/doppler/
- [ ] T075 [US7] Implement Doppler project creation logic
- [ ] T076 [US7] Add Doppler configuration file generation
- [ ] T077 [US7] Add logging for Doppler operations

---

## Phase 10: User Story 8 - Authenticate with SonarCloud for Code Quality (Priority: P2)

**Goal**: Connect SonarCloud account for automatic code quality analysis setup

**Independent Test**: Authenticate with SonarCloud, select code quality capability, and verify SonarCloud project is created and configured

### Tests for User Story 8 ⚠️

- [ ] T078 [P] [US8] Integration test for SonarCloud project creation in webapp/tests/integration/test_sonarcloud_integration.js
- [ ] T079 [P] [US8] E2E test for SonarCloud workflow in webapp/tests/e2e/genproj_sonarcloud.spec.js

### Implementation for User Story 8

- [ ] T080 [P] [US8] Create SonarCloud project templates in webapp/src/lib/templates/sonarcloud/
- [ ] T081 [US8] Implement SonarCloud project creation logic
- [ ] T082 [US8] Add SonarCloud configuration file generation
- [ ] T083 [US8] Add logging for SonarCloud operations

---

## Phase 11: User Story 9 - Handle External Service Integration (Priority: P2)

**Goal**: Automatically configure external services when possible, or provide clear instructions when manual setup is required

**Independent Test**: Select capabilities that require external services and verify appropriate configuration files are generated or clear setup instructions are provided

### Tests for User Story 9 ⚠️

- [ ] T084 [P] [US9] Integration test for external service integration in webapp/tests/integration/test_external_service_integration.js
- [ ] T085 [P] [US9] E2E test for external service workflow in webapp/tests/e2e/genproj_external_services.spec.js

### Implementation for User Story 9

- [ ] T086 [P] [US9] Create external service integration service in webapp/src/lib/services/external-service-integration.js
- [ ] T087 [US9] Implement fallback instruction generation
- [ ] T088 [US9] Add error handling for service failures
- [ ] T089 [US9] Add logging for external service operations

---

## Phase 12: User Story 10 - Celebrate Successful Project Generation (Priority: P3)

**Goal**: Display delightful celebration animation upon successful project generation

**Independent Test**: Complete project generation and verify the firework particle animation displays correctly with appropriate timing and visual appeal

### Tests for User Story 10 ⚠️

- [ ] T090 [P] [US10] Integration test for celebration animation in webapp/tests/integration/test_celebration_animation.js
- [ ] T091 [P] [US10] E2E test for celebration workflow in webapp/tests/e2e/genproj_celebration.spec.js

### Implementation for User Story 10

- [ ] T092 [P] [US10] Create CelebrationAnimation component in webapp/src/lib/components/genproj/CelebrationAnimation.svelte
- [ ] T093 [US10] Implement tsparticles integration for firework effects
- [ ] T094 [US10] Add accessibility options for motion sensitivity
- [ ] T095 [US10] Add performance optimization for animation
- [ ] T096 [US10] Add logging for celebration operations

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T097 [P] Documentation updates in webapp/docs/genproj/
- [ ] T098 Code cleanup and refactoring across all components
- [ ] T099 Performance optimization across all stories
- [ ] T100 [P] Additional unit tests in webapp/tests/unit/
- [ ] T101 Security hardening and audit logging
- [ ] T102 Run quickstart.md validation
- [ ] T103 Accessibility improvements across all components
- [ ] T104 Bundle size optimization and code splitting

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 for capability display
- **User Story 3 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 4 (P1)**: Can start after Foundational (Phase 2) - Depends on US2 for preview functionality
- **User Stories 5-9 (P2)**: Can start after US4 completion - Each is independently testable
- **User Story 10 (P3)**: Can start after US4 completion - Depends on successful generation

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, User Stories 1, 3 can start in parallel
- User Stories 2, 4 can start after US1 completion
- User Stories 5-9 can run in parallel after US4 completion
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Contract test for capabilities endpoint in webapp/tests/contract/test_capabilities_api.js"
Task: "Integration test for capability browsing in webapp/tests/integration/test_capability_browsing.js"
Task: "E2E test for unauthenticated capability viewing in webapp/tests/e2e/genproj_capabilities.spec.js"

# Launch all components for User Story 1 together:
Task: "Create capabilities API endpoint in webapp/src/routes/projects/genproj/api/capabilities/+server.js"
Task: "Create main genproj page component in webapp/src/routes/projects/genproj/+page.svelte"
Task: "Create CapabilitySelector component in webapp/src/lib/components/genproj/CapabilitySelector.svelte"
```

---

## Implementation Strategy

### MVP First (User Stories 1-4 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Browse Capabilities)
4. Complete Phase 4: User Story 2 (Two-Tab Interface)
5. Complete Phase 5: User Story 3 (Authentication)
6. Complete Phase 6: User Story 4 (Project Generation)
7. **STOP and VALIDATE**: Test all MVP stories independently
8. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Basic capability browsing)
3. Add User Story 2 → Test independently → Deploy/Demo (Two-tab interface)
4. Add User Story 3 → Test independently → Deploy/Demo (Authentication)
5. Add User Story 4 → Test independently → Deploy/Demo (Full MVP!)
6. Add User Stories 5-9 → Test independently → Deploy/Demo (External services)
7. Add User Story 10 → Test independently → Deploy/Demo (Celebration)
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Capabilities)
   - Developer B: User Story 3 (Authentication)
3. Once US1 is done:
   - Developer A: User Story 2 (Two-Tab Interface)
   - Developer B: User Story 4 (Project Generation)
4. Once US4 is done:
   - Developer A: User Stories 5-6 (CircleCI, Documentation)
   - Developer B: User Stories 7-8 (Doppler, SonarCloud)
   - Developer C: User Stories 9-10 (External Services, Celebration)
5. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Follow SvelteKit conventions for file structure
- Use existing Google authentication system
- Implement two-tab interface as specified in updated spec
- All external service integrations should be optional and gracefully degrade
- Celebration animation should be accessible and performant
