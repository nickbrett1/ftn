# Tasks: Project Generation Tool (genproj)

**Input**: Design documents from `/specs/001-genproj/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Constitution Compliance**: All tasks must adhere to principles in `.specify/memory/constitution.md`:

- **Principle I**: Code Quality Standards (linting, type safety, code review)
- **Principle II**: Testing Standards (TDD mandatory - tests before implementation)
- **Principle III**: UX Consistency (accessibility, responsive design, design system)
- **Principle IV**: Performance Requirements (bundle size, response times, monitoring)
- **Principle V**: Security & Compliance (encryption, audit logging, security scanning)

**Tests**: Following Principle II (Testing Standards), TDD is MANDATORY: **Write failing tests → User approval → Implement → Refactor**. Test coverage must meet 85% minimum threshold.

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

- [x] T022 [P] [US2] Contract test for preview endpoint in webapp/tests/contract/test_preview_api.js
- [x] T023 [P] [US2] Integration test for tab switching in webapp/tests/integration/test_tab_interface.js
- [x] T024 [P] [US2] E2E test for two-tab workflow in webapp/tests/e2e/genproj_tabs.spec.js

### Implementation for User Story 2

- [x] T025 [P] [US2] Create preview API endpoint in webapp/src/routes/projects/genproj/api/preview/+server.js
- [x] T026 [P] [US2] Create ConfigurationForm component in webapp/src/lib/components/genproj/ConfigurationForm.svelte
- [x] T027 [P] [US2] Create PreviewMode component in webapp/src/lib/components/genproj/PreviewMode.svelte
- [x] T028 [US2] Implement tab switching logic and state management
- [x] T029 [US2] Implement preview generation service in webapp/src/lib/services/project-generator.js
- [x] T030 [US2] Add real-time preview updates when capabilities change
- [x] T031 [US2] Add visual indicators for active tab
- [x] T032 [US2] Add logging for tab switching and preview operations

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Authenticate for Project Generation (Priority: P1)

**Goal**: Handle progressive authentication with required services only when user confirms project generation

**Independent Test**: Configure a project, preview it, then authenticate with required services and verify project generation

### Tests for User Story 3 ⚠️

- [x] T033 [P] [US3] Contract test for GitHub auth endpoint in webapp/tests/contract/test_github_auth.js
- [x] T034 [P] [US3] Contract test for external service auth endpoints in webapp/tests/contract/test_external_auth.js
- [x] T035 [P] [US3] Integration test for progressive auth flow in webapp/tests/integration/test_progressive_auth.js
- [x] T036 [P] [US3] E2E test for authentication workflow in webapp/tests/e2e/genproj_auth.spec.js

### Implementation for User Story 3

- [x] T037 [P] [US3] Create GitHub OAuth endpoint in webapp/src/routes/projects/genproj/api/auth/github/+server.js
- [x] T038 [P] [US3] Create GitHub callback handler in webapp/src/routes/projects/genproj/api/auth/github/callback/+server.js
- [x] T039 [P] [US3] Create CircleCI auth endpoint in webapp/src/routes/projects/genproj/api/auth/circleci/+server.js
- [x] T040 [P] [US3] Create Doppler auth endpoint in webapp/src/routes/projects/genproj/api/auth/doppler/+server.js
- [x] T041 [P] [US3] Create SonarCloud auth endpoint in webapp/src/routes/projects/genproj/api/auth/sonarcloud/+server.js
- [x] T042 [US3] Create AuthFlow component in webapp/src/lib/components/genproj/AuthFlow.svelte
- [x] T043 [US3] Implement authentication state management
- [x] T044 [US3] Add encrypted token storage in D1
- [x] T045 [US3] Add logging for authentication operations

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Store and Reuse Authentication Tokens (Priority: P1)

**Goal**: Securely store, reuse, and allow user management of authentication tokens to streamline future project generations.

**Independent Test**: User can see and revoke stored tokens in a new settings page. When generating a new project, a stored token is used automatically.

### Tests for User Story 4 ⚠️

- [x] T046 [P] [US4] Contract test for token management API in `webapp/tests/contract/test_token_management_api.js`
- [x] T047 [P] [US4] Integration test for token reuse during generation in `webapp/tests/integration/test_token_reuse.js`
- [x] T048 [P] [US4] E2E test for viewing and revoking tokens in `webapp/tests/e2e/genproj_token_management.spec.js`

### Implementation for User Story 4

- [x] T049 [P] [US4] Create token management API endpoints (list, revoke) in `webapp/src/routes/projects/genproj/api/tokens/+server.js`
- [x] T050 [P] [US4] Create `TokenManager` component in `webapp/src/lib/components/genproj/TokenManager.svelte` to display and revoke tokens.
- [x] T051 [P] [US4] Create a new route for token management at `webapp/src/routes/settings/tokens/+page.svelte` and integrate the `TokenManager` component.
- [x] T052 [US4] Implement logic in `project-generator.js` to retrieve and use stored tokens as a fallback during authentication checks.
- [x] T053 [US4] Add logging for token management operations.

---

## Phase 7: User Story 5 - Generate Project with Confirmed Configuration (Priority: P1)

**Goal**: Generate complete project with all files and external service configurations after authentication

**Independent Test**: Confirm a preview and verify all files are generated and external services are configured exactly as previewed

### Tests for User Story 5 ⚠️

- [x] T054 [P] [US5] Contract test for generation endpoint in webapp/tests/contract/test_generation_api.js
- [x] T055 [P] [US5] Integration test for project generation in webapp/tests/integration/test_project_generation.js
- [x] T056 [P] [US5] E2E test for complete generation workflow in webapp/tests/e2e/genproj_generation.spec.js

### Implementation for User Story 5

- [x] T057 [P] [US5] Create generation API endpoint in `webapp/src/routes/projects/genproj/api/generate/+server.js`
- [x] T058 [P] [US5] Implement GitHub API service in webapp/src/lib/services/github-api.js
- [x] T059 [P] [US5] Implement CircleCI API service in webapp/src/lib/services/circleci-api.js
- [x] T060 [P] [US5] Implement Doppler API service in webapp/src/lib/services/doppler-api.js
- [x] T061 [P] [US5] Implement SonarCloud API service in webapp/src/lib/services/sonarcloud-api.js
- [x] T062 [US5] Implement file generation and repository creation
- [x] T063 [US5] Implement external service project creation
- [x] T064 [US5] Add comprehensive error handling and fallback instructions
- [x] T065 [US5] Add logging for generation operations.

---

## Phase 8: User Story 6 - Authenticate with External Services for Project Creation (Priority: P2)

**Goal**: Connect external service accounts (e.g., CircleCI, Doppler, SonarCloud) for automatic project creation and integration.

**Independent Test**: Authenticate with an external service, select its capability, and verify the corresponding project is created and linked to the GitHub repository.

### Tests for User Story 6 ⚠️

- [x] T066 [P] [US6] Integration test for generic external service project creation in `webapp/tests/integration/test_external_service_creation.js`
- [x] T067 [P] [US6] E2E test for a full external service authentication and creation workflow in `webapp/tests/e2e/genproj_external_service_flow.spec.js`

### Implementation for User Story 6

- [x] T068 [P] [US6] Create generic project templates for external services (e.g., CircleCI, Doppler, SonarCloud) in `webapp/src/lib/templates/external/`
- [x] T069 [US6] Implement generic external service project creation logic in `webapp/src/lib/services/external-service-integration.js`
- [x] T070 [US6] Add configuration file generation for each selected external service.
- [x] T071 [US6] Add GitHub webhook setup logic for services that require it (e.g., CircleCI).
- [x] T072 [US6] Add logging for all external service operations.

---

## Phase 9: User Story 7 - Generate Comprehensive Project Documentation (Priority: P2)

**Goal**: Create comprehensive README.md documenting all selected capabilities and setup instructions

**Independent Test**: Generate a project and verify the README.md contains all selected capabilities, setup instructions, and usage guidelines

### Tests for User Story 7 ⚠️

- [x] T073 [P] [US7] Integration test for README generation in webapp/tests/integration/test_readme_generation.js
- [x] T074 [P] [US7] E2E test for documentation workflow in webapp/tests/e2e/genproj_documentation.spec.js

### Implementation for User Story 7

- [ ] T075 [P] [US7] Create README templates in webapp/src/lib/templates/readme/
- [ ] T076 [US7] Implement README generation logic
- [ ] T077 [US7] Add capability-specific documentation sections
- [ ] T078 [US7] Add external service setup instructions
- [ ] T079 [US7] Add logging for documentation generation

---

## Phase 10: User Story 8 - Handle External Service Integration (Priority: P2)

**Goal**: Automatically configure external services when possible, or provide clear instructions when manual setup is required

**Independent Test**: Select capabilities that require external services and verify appropriate configuration files are generated or clear setup instructions are provided

### Tests for User Story 8 ⚠️

- [ ] T080 [P] [US8] Integration test for external service integration in webapp/tests/integration/test_external_service_integration.js
- [ ] T081 [P] [US8] E2E test for external service workflow in webapp/tests/e2e/genproj_external_services.spec.js

### Implementation for User Story 8

- [ ] T082 [P] [US8] Refactor external service integration service in webapp/src/lib/services/external-service-integration.js to handle both success and failure cases.
- [ ] T083 [US8] Implement fallback instruction generation for manual setup when API calls fail.
- [ ] T084 [US8] Add robust error handling for all external service API failures.
- [ ] T085 [US8] Add logging for all external service integration attempts and outcomes.

---

## Phase 11: User Story 9 - Celebrate Successful Project Generation (Priority: P3)

**Goal**: Display delightful celebration animation upon successful project generation

**Independent Test**: Complete project generation and verify the firework particle animation displays correctly with appropriate timing and visual appeal

### Tests for User Story 9 ⚠️

- [ ] T086 [P] [US9] Integration test for celebration animation in webapp/tests/integration/test_celebration_animation.js
- [ ] T087 [P] [US9] E2E test for celebration workflow in webapp/tests/e2e/genproj_celebration.spec.js

### Implementation for User Story 9

- [ ] T088 [P] [US9] Create CelebrationAnimation component in webapp/src/lib/components/genproj/CelebrationAnimation.svelte
- [ ] T089 [US9] Implement tsparticles integration for firework effects
- [ ] T090 [US9] Add accessibility options for motion sensitivity
- [ ] T091 [US9] Add performance optimization for animation
- [ ] T092 [US9] Add logging for celebration operations

---

## Phase 12: Error Handling & Edge Cases

**Purpose**: Implement graceful failure modes for a robust user experience.

- [ ] T093 [P] Implement UI feedback for GitHub repo creation failure (naming conflict, permissions) in `ConfigurationForm.svelte`.
- [ ] T094 [P] Implement re-authentication flow for expired/invalid GitHub tokens in `AuthFlow.svelte`.
- [ ] T095 [P] Implement generic UI feedback for external service authentication failures.
- [ ] T096 [P] Implement non-blocking warnings for API failures during generation, with links to manual setup.
- [ ] T097 [P] Add input validation for project name to prevent generation with invalid names.
- [ ] T098 [P] Implement re-authentication prompt when a stored token is found to be invalid.
- [ ] T099 [P] Implement conflict detection logic in `CapabilitySelector.svelte`.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T100 [P] Documentation updates in webapp/docs/genproj/
- [ ] T101 Code cleanup and refactoring across all components
- [ ] T102 Performance optimization across all stories
- [ ] T103 [P] Additional unit tests in webapp/tests/unit/
- [ ] T104 Security hardening and audit logging
- [ ] T105 Run quickstart.md validation
- [ ] T106 Accessibility improvements across all components
- [ ] T107 Bundle size optimization and code splitting

---

## Dependencies & Execution Order

### Phase Dependencies

- **User Stories (Phase 3-11)**: All depend on Foundational phase completion.
- **Error Handling (Phase 12)**: Depends on implementation of corresponding features (e.g., auth, generation).
- **Polish (Phase 13)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 5 (P1)**: Depends on US2 for preview functionality.
- **User Story 6 (P2)**: Can start after US3 completion.
- **User Story 8 (P2)**: Depends on US6 for external service integration.
- **User Story 9 (P3)**: Depends on US5 for successful generation.

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- Once Foundational phase completes, User Stories 1, 3, 4 can start in parallel.
- User Story 5 can start after US2 completion.
- User Stories 6, 7 can run in parallel after US5 completion.

---

## Implementation Strategy

### MVP First (User Stories 1-5 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3-7 (User Stories 1-5)
4. **STOP and VALIDATE**: Test all MVP stories independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Stories 1-5 → Test independently → Deploy/Demo (Full MVP!)
3. Add User Stories 6-8 → Test independently → Deploy/Demo (External services & Docs)
4. Add User Story 9 → Test independently → Deploy/Demo (Celebration)
5. Add Phase 12-13 -> Harden and polish the feature.
6. Each story adds value without breaking previous stories

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
