# Feature Specification: Project Generation Tool (genproj)

**Feature Branch**: `001-genproj`  
**Created**: 2025-01-15  
**Status**: Draft  
**Input**: User description: "Here's my problem. I've put a lot of effort into this ftn project, adding numerous tools to ensure I have an efficient development environment that produces high quality results. However if I want to create a new project, I have to setup all those tools from scratch. Some of that is relatively straightforward, such as copying over say the Dockerfile and making edits for my new project. Or creating the project on GitHub. But other things are more tricky, such as setting up a new CircleCI project for CI/CD. And of course for a new project, there are some capabilities that I generally will always want, such as a CircleCI deployment pipeline, but others will be optional. I won't for example need a Lighthouse test if I have no front-end. To make it easy for me to create new projects, I'd like to create a tool within ftn that has a UI interface that will allow me to create a new project with the set of capabilities I want and for the tool to go ahead and generate all the required code and as much as possible configurations in external services so I can accelerate my development. Obviously this tool should sit behind my authentication before it creates artifacts for my service, but without logging in, the UI should still show the available capabilities to pick from, even if it can't be run. That makes for a nice demo. A login button should be present to allow me to login via my normal google authentication workflow."

**Constitution Compliance**: This specification must align with principles in `.specify/memory/constitution.md`, particularly:

- **Principle II**: Testing Standards (TDD with acceptance scenarios)
- **Principle III**: UX Consistency (user-centered design, accessibility)
- **Principle IV**: Performance Requirements (measurable success criteria)
- **Principle V**: Security & Compliance (data protection, audit requirements)

**Scope**: This tool focuses exclusively on VS Code IDE support, Cloudflare deployment targets, CircleCI for CI/CD, and web projects. All generated projects are optimized for VS Code development with DevContainer support and Cloudflare Workers deployment. Note: GitHub Actions support, API projects, mobile projects, and alternative package managers (yarn, pnpm, poetry, pipenv, gradle) are planned for future versions but not included in v1.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Browse Available Capabilities (Priority: P1)

As a developer visiting the FTN portfolio, I want to see what project generation capabilities are available so I can understand the tool's potential value before committing to authentication.

**Why this priority**: This is the entry point that demonstrates the tool's value proposition and encourages engagement. It must work without authentication to serve as an effective demo.

**Independent Test**: Can be fully tested by visiting `/projects/genproj` without authentication and verifying all capability options are visible with descriptions, even though generation is disabled.

**Acceptance Scenarios**:

1. **Given** I am an unauthenticated visitor, **When** I navigate to `/projects/genproj`, **Then** I see a comprehensive list of available project capabilities with descriptions
2. **Given** I am viewing the capability list, **When** I read the descriptions, **Then** I understand what each capability provides and its dependencies
3. **Given** I am viewing the capability list, **When** I attempt to generate a project, **Then** I am prompted to authenticate with a clear login button

---

### User Story 2 - Two-Tab Interface for Configuration and Preview (Priority: P1)

As a developer, I want a clean two-tab interface where I can configure my project capabilities in one tab and preview the generated output in another tab, with easy switching between them without needing any authentication.

**Why this priority**: This is the core value proposition - providing full transparency and control over what will be generated before any authentication or changes are made, with a simple, non-linear interface that doesn't overcomplicate the process with unnecessary steps.

**Independent Test**: Can be fully tested by selecting capabilities in the "Capabilities" tab, switching to the "Preview" tab to see the output, then switching back to modify capabilities and seeing the preview update accordingly.

**Acceptance Scenarios**:

1. **Given** I am browsing the tool, **When** I see the two-tab interface with "Capabilities" and "Preview" tabs, **Then** I understand I can configure in one tab and preview in the other
2. **Given** I am in the Capabilities tab, **When** I select project capabilities and provide configuration details, **Then** I can switch to the Preview tab to see all files that would be generated
3. **Given** I have selected capabilities with external services, **When** I switch to the Preview tab, **Then** I see descriptions of all external service changes that would be made
4. **Given** I am viewing the Preview tab, **When** I want to modify capabilities, **Then** I can switch back to the Capabilities tab without losing my settings
5. **Given** I modify capabilities in the Capabilities tab, **When** I switch back to the Preview tab, **Then** the preview updates to reflect my changes
6. **Given** I am satisfied with the preview, **When** I click "Generate Project", **Then** I am prompted for required authentication

---

### User Story 3 - Authenticate for Project Generation (Priority: P1)

As a developer who has configured and previewed a project, I want to authenticate with the required services only when I'm ready to generate the actual project.

**Why this priority**: Users need a clear workflow to generate projects with external service integrations. Authentication happens automatically when generation is requested.

**Independent Test**: Can be fully tested by configuring a project, previewing it, then authenticating with required services and verifying project generation.

**Acceptance Scenarios**:

1. **Given** I have configured and previewed a project, **When** I click "Generate Project", **Then** authentication is automatically requested for Google, GitHub, and selected external services
2. **Given** I have selected CircleCI capability, **When** I generate the project, **Then** CircleCI authentication is automatically requested
3. **Given** I have selected Doppler capability, **When** I generate the project, **Then** Doppler authentication is automatically requested
4. **Given** I have selected SonarCloud capability, **When** I generate the project, **Then** SonarCloud authentication is automatically requested
5. **Given** I have completed all required authentication, **When** I confirm generation, **Then** the project is created with all files and external service configurations

---

### User Story 4 - Generate Project with Confirmed Configuration (Priority: P1)

As a developer who has reviewed the preview, I want to generate the complete project with all files and external service configurations so I can have a fully functional development environment.

**Why this priority**: This is the execution phase that delivers the actual value - creating the complete project setup based on the confirmed preview.

**Independent Test**: Can be fully tested by confirming a preview and verifying all files are generated and external services are configured exactly as previewed.

**Acceptance Scenarios**:

1. **Given** I have reviewed and confirmed the preview, **When** I click "Generate Project", **Then** all files are created in the GitHub repository
2. **Given** I have external services in the preview, **When** the generation completes, **Then** all external service projects are created and configured
3. **Given** the generation is successful, **When** the process completes, **Then** I see the celebration animation and project summary

---

### User Story 5 - Authenticate with CircleCI for Project Creation (Priority: P2)

As an authenticated developer, I want to connect my CircleCI account so the system can automatically create CircleCI projects and configure CI/CD pipelines for my generated repositories.

**Why this priority**: CircleCI project creation automation eliminates manual setup steps and ensures proper integration between GitHub repositories and CI/CD pipelines.

**Independent Test**: Can be fully tested by authenticating with CircleCI, selecting CI/CD capability, and verifying CircleCI project is created and linked to the GitHub repository.

**Acceptance Scenarios**:

1. **Given** I am authenticated with Google and GitHub, **When** I select CircleCI capability, **Then** I am prompted to authenticate with CircleCI
2. **Given** I authenticate with CircleCI, **When** the system verifies my access, **Then** I can proceed with automatic CircleCI project creation
3. **Given** I have CircleCI access, **When** I generate a project, **Then** the system creates both the GitHub repository and CircleCI project

---

### User Story 6 - Generate Comprehensive Project Documentation (Priority: P2)

As a developer generating a project, I want a comprehensive README.md that documents all selected capabilities and provides clear setup instructions so I can understand what was configured and how to use it.

**Why this priority**: Documentation is crucial for project maintainability and team onboarding. A well-documented README ensures users understand the generated setup and can effectively use all configured capabilities.

**Independent Test**: Can be fully tested by generating a project and verifying the README.md contains all selected capabilities, setup instructions, and usage guidelines.

**Acceptance Scenarios**:

1. **Given** I generate a project with multiple capabilities, **When** I review the README.md, **Then** I see a complete overview of all selected capabilities and their purposes
2. **Given** I have a generated project, **When** I read the README.md, **Then** I can follow the setup instructions to get the development environment running
3. **Given** I have external services configured, **When** I read the README.md, **Then** I understand how to access and configure each external service

---

### User Story 7 - Authenticate with Doppler for Secrets Management (Priority: P2)

As an authenticated developer, I want to connect my Doppler account so the system can automatically create Doppler projects and configure secrets management for my generated repositories.

**Why this priority**: Doppler project creation automation eliminates manual setup steps and ensures proper integration between GitHub repositories and secrets management.

**Independent Test**: Can be fully tested by authenticating with Doppler, selecting secrets management capability, and verifying Doppler project is created and configured.

**Acceptance Scenarios**:

1. **Given** I am authenticated with Google and GitHub, **When** I select Doppler capability, **Then** I am prompted to authenticate with Doppler
2. **Given** I authenticate with Doppler, **When** the system verifies my access, **Then** I can proceed with automatic Doppler project creation
3. **Given** I have Doppler access, **When** I generate a project, **Then** the system creates both the GitHub repository and Doppler project

---

### User Story 8 - Authenticate with SonarCloud for Code Quality (Priority: P2)

As an authenticated developer, I want to connect my SonarCloud account so the system can automatically create SonarCloud projects and configure code quality analysis for my generated repositories.

**Why this priority**: SonarCloud project creation automation eliminates manual setup steps and ensures proper integration between GitHub repositories and code quality analysis.

**Independent Test**: Can be fully tested by authenticating with SonarCloud, selecting code quality capability, and verifying SonarCloud project is created and configured.

**Acceptance Scenarios**:

1. **Given** I am authenticated with Google and GitHub, **When** I select SonarCloud capability, **Then** I am prompted to authenticate with SonarCloud
2. **Given** I authenticate with SonarCloud, **When** the system verifies my access, **Then** I can proceed with automatic SonarCloud project creation
3. **Given** I have SonarCloud access, **When** I generate a project, **Then** the system creates both the GitHub repository and SonarCloud project

---

### User Story 9 - Handle External Service Integration (Priority: P2)

As a developer generating a project, I want the system to automatically configure external services (CircleCI, SonarCloud, Doppler) when possible, or provide clear instructions when manual setup is required.

**Why this priority**: External service integration is the most complex part of project setup. Automating this provides significant value and reduces setup errors.

**Independent Test**: Can be fully tested by selecting capabilities that require external services and verifying appropriate configuration files are generated or clear setup instructions are provided.

**Acceptance Scenarios**:

1. **Given** I select CircleCI capability with authentication, **When** the system generates the project, **Then** a CircleCI project is created and config.yml is committed to the repository
2. **Given** I select SonarCloud capability with authentication, **When** the system generates the project, **Then** a SonarCloud project is created and sonar-project.properties is committed to the repository
3. **Given** I select Doppler capability with authentication, **When** the system generates the project, **Then** a Doppler project is created and doppler.yaml is committed to the repository
4. **Given** external service creation fails, **When** the system encounters the error, **Then** clear instructions are provided for manual setup

---

### User Story 10 - Celebrate Successful Project Generation (Priority: P3)

As a developer who has successfully generated a project, I want to see a delightful celebration animation to acknowledge the completion of this significant milestone.

**Why this priority**: Project generation is a complex, multi-step process that represents significant value delivery. A celebratory moment enhances user satisfaction and creates a positive emotional connection with the tool.

**Independent Test**: Can be fully tested by completing project generation and verifying the firework particle animation displays correctly with appropriate timing and visual appeal.

**Acceptance Scenarios**:

1. **Given** I have successfully generated a project with all files committed, **When** the generation process completes, **Then** I see a beautiful firework particle animation celebrating the success
2. **Given** the firework animation is playing, **When** I watch the display, **Then** I see colorful particles with realistic physics and smooth animations
3. **Given** the celebration animation completes, **When** the display finishes, **Then** I see a clear summary of what was created with links to the generated repository

---

### Edge Cases

- What happens when GitHub repository creation fails due to permissions or naming conflicts?
- How does the system handle GitHub authentication failures or expired tokens?
- What happens when CircleCI authentication fails or user lacks CircleCI project creation permissions?
- How does the system handle CircleCI API failures or rate limiting during project creation?
- What happens when Doppler authentication fails or user lacks Doppler project creation permissions?
- How does the system handle Doppler API failures or rate limiting during project creation?
- What happens when SonarCloud authentication fails or user lacks SonarCloud project creation permissions?
- How does the system handle SonarCloud API failures or rate limiting during project creation?
- What happens when external service API failures occur for other services?
- How does the system handle selected capabilities with conflicting requirements?
- What happens when invalid project names or repository URLs are provided?
- What happens when the user's Google, GitHub, CircleCI, Doppler, or SonarCloud authentication expires during project generation?
- How does the system handle GitHub API rate limiting during repository creation?
- What happens when the user lacks sufficient GitHub permissions to create repositories?
- What happens when CircleCI project creation succeeds but GitHub webhook setup fails?
- What happens when Doppler project creation succeeds but GitHub integration fails?
- What happens when SonarCloud project creation succeeds but GitHub integration fails?
- What happens when the celebration animation fails to load or display properly?
- How does the system handle celebration animation on devices with limited graphics capabilities?
- What happens when the user navigates away during the celebration animation?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display all available project capabilities to unauthenticated users with clear descriptions
- **FR-002**: System MUST allow project configuration and preview without any authentication
- **FR-044**: System MUST clearly indicate when the page is in "Demo Mode" for unauthenticated users with a visible banner and login button at the top of the page
- **FR-003**: System MUST require Google authentication only when user confirms project generation
- **FR-004**: System MUST require GitHub authentication (OAuth) only when user confirms project generation
- **FR-005**: System MUST require CircleCI authentication (API token) only when CI/CD capability is selected and user confirms generation
- **FR-006**: System MUST require Doppler authentication (API token) only when secrets management capability is selected and user confirms generation
- **FR-007**: System MUST require SonarCloud authentication (API token) only when code quality capability is selected and user confirms generation
- **FR-008**: System MUST allow users to select from available capabilities with dependency resolution
- **FR-042**: System MUST automatically select dependencies when a user selects a capability that requires other capabilities
- **FR-043**: System MUST prevent deselection of capabilities that are required by other selected capabilities
- **FR-009**: System MUST provide a two-tab interface with "Capabilities" and "Preview" tabs
- **FR-010**: System MUST show all generated files and external service changes in the Preview tab without making actual changes
- **FR-011**: System MUST allow seamless navigation between Capabilities and Preview tabs without losing user settings
- **FR-012**: System MUST automatically update Preview tab content when capabilities or configuration changes are made
- **FR-013**: System MUST provide clear visual indicators showing which tab is currently active
- **FR-014**: System MUST enable users to switch to Preview tab at any time to see current configuration results
- **FR-015**: System MUST create a new GitHub repository if no repository URL is provided, or accept and write to an existing repository URL if provided, only after user confirms the preview and completes authentication
- **FR-016**: System MUST create devcontainer.json and Dockerfile based on selected capabilities for VS Code
- **FR-017**: System MUST generate VS Code-specific configuration files (settings.json, extensions.json) based on selected capabilities
- **FR-018**: System MUST create post-create-setup.sh script with git safe directory configuration
- **FR-019**: System MUST generate dependabot.yml when dependency management is selected with ecosystems automatically determined from selected devcontainer languages
- **FR-020**: System MUST create CircleCI project and configuration when CI/CD capability is selected with authentication (v1 only supports CircleCI, GitHub Actions planned for future versions)
- **FR-021**: System MUST create Doppler project and configuration when secrets management capability is selected with authentication
- **FR-022**: System MUST create SonarCloud project and configuration when code quality capability is selected with authentication
- **FR-023**: System MUST generate Cloudflare Wrangler configuration when selected with today's date as the compatibility date
- **FR-024**: System MUST create comprehensive README.md documenting all selected capabilities, setup instructions, and usage guidelines
- **FR-025**: System MUST include in README.md: project overview, selected capabilities list, development environment setup, external service configurations, and next steps
- **FR-026**: System MUST handle capability dependencies (e.g., Java required for SonarLint)
- **FR-027**: System MUST provide clear error messages when external service integration fails
- **FR-028**: System MUST validate project names and repository URLs before generation
- **FR-040**: System MUST clearly explain to users that leaving repository URL empty will create a new GitHub repository
- **FR-041**: System MUST allow users to provide an existing repository URL to add generated files to that repository
- **FR-029**: System MUST generate appropriate package.json dependencies based on selected capabilities
- **FR-030**: System MUST create proper directory structure for selected project type
- **FR-031**: System MUST include security headers and best practices in generated configurations
- **FR-032**: System MUST display celebratory firework particle animation upon successful project generation
- **FR-033**: System MUST provide smooth, performant animation that works across different devices and browsers
- **FR-034**: System MUST include accessibility options to disable animations for users with motion sensitivity
- **FR-035**: System MUST use JavaScript (not TypeScript) for all implementation code
- **FR-036**: System MUST default all tool versions to the latest stable version available
- **FR-037**: System MUST display version options with latest version first in selection dropdowns
- **FR-038**: System MUST only include stable, production-ready versions in capability configuration options
- **FR-039**: System MUST allow users to select older versions if needed, but default to latest

### Key Entities _(include if feature involves data)_

- **Project Configuration**: Represents the user's selected capabilities and project details, including name, repository URL, and capability selections
- **Capability Definition**: Represents an available project capability with its dependencies, requirements, and generated artifacts
- **Generated Artifact**: Represents a file or configuration that will be created based on selected capabilities
- **External Service Integration**: Represents the connection to third-party services like CircleCI, SonarCloud, or Doppler
- **Authentication State**: Represents the user's authentication status with Google (required), GitHub (required for repository operations), CircleCI (required for CI/CD operations), Doppler (required for secrets management), and SonarCloud (required for code quality operations)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can browse all available capabilities and understand their value within 30 seconds of visiting the tool
- **SC-002**: Authenticated users can complete GitHub authentication flow in under 1 minute
- **SC-003**: Authenticated users can complete CircleCI authentication flow in under 1 minute when CI/CD is selected
- **SC-004**: Authenticated users with GitHub and CircleCI access can generate a complete project with 5+ capabilities in under 2 minutes
- **SC-005**: Generated projects have 100% functional configuration files (no syntax errors or missing dependencies)
- **SC-006**: External service integrations succeed automatically 90% of the time, with clear manual instructions for failures
- **SC-007**: Users can successfully commit generated projects to GitHub repositories without manual file modifications
- **SC-008**: Generated devcontainer configurations work correctly on first container creation
- **SC-009**: All generated CI/CD pipelines pass initial validation and can deploy successfully
- **SC-010**: Project setup time is reduced by 80% compared to manual configuration
- **SC-011**: Users report 95% satisfaction with generated project quality and completeness
- **SC-012**: Tool demonstrates clear value proposition to unauthenticated visitors, leading to 70% authentication conversion rate
- **SC-013**: GitHub authentication success rate exceeds 95% for users with valid GitHub accounts
- **SC-014**: CircleCI authentication success rate exceeds 95% for users with valid CircleCI accounts
- **SC-015**: Doppler authentication success rate exceeds 95% for users with valid Doppler accounts
- **SC-016**: SonarCloud authentication success rate exceeds 95% for users with valid SonarCloud accounts
- **SC-017**: Generated README.md files contain complete documentation for all selected capabilities
- **SC-018**: Users can successfully set up development environment using only README.md instructions 95% of the time
- **SC-019**: Celebration animation displays successfully on 99% of supported browsers and devices
- **SC-020**: Users report 90% satisfaction with the celebration animation and overall project generation experience
- **SC-021**: Users can switch between Capabilities and Preview tabs in under 1 second without losing settings
- **SC-022**: Preview tab updates automatically within 2 seconds when capabilities or configuration changes are made
- **SC-023**: Users can access Preview tab at any time during configuration without additional steps
- **SC-024**: Generated projects use latest stable tool versions by default (e.g., Node.js 22, Python 3.12, Java 21)

### Version Selection Requirements

**Default to Latest Stable Versions**: All tool version selections default to the latest stable version to provide users with current, secure technology.

**Version Selection Rules**:

- **Latest First**: Version options are ordered with latest version first in dropdown menus
- **Stable Only**: Only stable, production-ready versions are included in selection options
- **User Downgrade**: Users can select older versions if needed, but defaults promote modern technology
- **Security**: Latest versions include security patches and vulnerability fixes
- **Features**: Users benefit from latest features and improvements by default

**Rationale**: Starting with latest stable versions reduces technical debt and security vulnerabilities. Users can still downgrade if compatibility is required, but the tool promotes current, supported technology.

### IDE Support Requirements

**VS Code Only**: This tool exclusively supports VS Code IDE to maintain focus and reduce complexity.

**VS Code Support Rules**:

- **DevContainer**: All generated projects include VS Code DevContainer configuration
- **Extensions**: VS Code extensions are automatically configured for selected capabilities
- **Settings**: VS Code-specific settings are generated for code quality tools
- **No Multi-IDE**: IDE selection has been removed - all projects target VS Code

**Rationale**: Focusing on a single IDE (VS Code) simplifies the tool, reduces complexity, and ensures all generated projects have consistent, well-tested VS Code configuration. Most developers use VS Code, making this a practical default.

### Deployment Target Requirements

**Cloudflare Only**: This tool exclusively supports Cloudflare Workers as the deployment target to maintain focus and ensure consistent serverless deployment.

**Cloudflare Deployment Rules**:

- **Workers**: All generated projects deploy to Cloudflare Workers
- **Wrangler**: Cloudflare Wrangler configuration is automatically generated
- **No Multi-Platform**: Other deployment platforms (AWS Lambda, Vercel) are not supported
- **Consistency**: All CI/CD pipelines target Cloudflare Workers deployment
- **Simplified Configuration**: Deployment target selection has been removed - all projects target Cloudflare

**Rationale**: Focusing on a single deployment platform (Cloudflare Workers) simplifies the tool and ensures all generated projects have consistent deployment configuration. Cloudflare's edge computing platform is powerful and widely used for modern web applications.

**Wrangler Configuration Rules**:

- **Compatibility Date**: All generated Wrangler configurations must use today's date as the compatibility date
- **Per Cloudflare Guidance**: Following official Cloudflare documentation, new projects should always set `compatibility_date` to the current date
- **Always Current**: The compatibility date is set to the date of project generation to access latest features
- **No User Configuration**: The compatibility date is set automatically to today's date and not shown as a configuration option
- **Documentation**: Cloudflare documentation describes current behavior, so staying current makes documentation accurate

**Rationale**: Per [Cloudflare's compatibility dates documentation](https://developers.cloudflare.com/workers/configuration/compatibility-dates/), developers should always set `compatibility_date` to the current date when starting a project. New features may only be available to Workers with a current compatibility date, and documentation reflects current behavior. Using today's date ensures access to latest features and accurate documentation.

### CI/CD Platform Requirements

**CircleCI Only**: This tool exclusively supports CircleCI as the CI/CD platform to maintain focus and ensure consistent pipeline configuration.

**CircleCI Support Rules**:

- **Single Platform**: Only CircleCI is supported for CI/CD pipelines
- **No Alternatives**: GitHub Actions and other CI/CD platforms are not available in v1
- **Consistency**: All generated projects have consistent CircleCI configuration
- **Simplified**: No choice between CI/CD systems reduces complexity
- **Future Versions**: GitHub Actions may be added in future versions

**Rationale**: Focusing on a single CI/CD platform (CircleCI) simplifies the tool and ensures all generated projects have consistent, well-tested CI/CD configuration. This allows the tool to provide deeper integration with CircleCI features without spreading effort across multiple platforms.

### Project Type Requirements

**Web Projects Only**: This tool exclusively supports web project generation to maintain focus and ensure consistent application structure.

**Web Project Support Rules**:

- **Web Focus**: All generated projects are web applications targeting Cloudflare Workers
- **No API/Mobile**: API projects and mobile projects are not supported in v1
- **Consistent Structure**: All projects follow web application patterns and conventions
- **Simplified**: No project type selection - all projects are web applications
- **Future Versions**: API and mobile project types may be added in future versions

**Rationale**: Focusing on a single project type (web applications) simplifies the tool and ensures all generated projects have consistent structure, deployment patterns, and testing approaches. This allows the tool to provide deep integration with web-specific features without spreading effort across multiple project types.

### Package Manager Standards

**Single Standard Tool**: This tool uses only the most common, standard package manager for each language to reduce complexity and ensure consistency.

**Package Manager Rules**:

- **Node.js**: Only npm is supported (yarn and pnpm not available in v1)
- **Python**: Only pip is supported (poetry and pipenv not available in v1)
- **Java**: Only Maven is supported (Gradle not available in v1)
- **No Selection**: Package manager choice is removed - the standard tool is used automatically
- **Consistency**: All projects use the same package manager per language for predictable dependency management

**Rationale**: Using a single standard package manager per language reduces complexity, eliminates choice paralysis, and ensures consistent dependency management. Alternative tools can be added later as the platform matures. Most projects use the standard tools anyway, so this simplification doesn't significantly limit users.

### Dependabot Configuration Standards

**Daily Updates by Default**: All generated Dependabot configurations default to daily updates to ensure security patches and updates are applied promptly.

**Dependabot Rules**:

- **Daily Schedule**: Dependabot update schedule defaults to daily for npm (and other ecosystems)
- **Security First**: Daily updates ensure security patches are applied promptly
- **User Override**: Users can change the schedule if needed, but daily is recommended
- **Consistency**: All generated projects use the same daily schedule by default
- **No Configuration**: Daily schedule is used automatically without requiring user selection

**Rationale**: Security vulnerabilities should be patched quickly. Daily updates ensure that security patches are available as soon as possible while still allowing users to adjust the frequency for their workflow. This prioritizes security by default while maintaining flexibility.

**Dependabot Ecosystem Rules**:

- **Auto-Detection**: Dependabot ecosystems are automatically determined based on selected devcontainer languages
- **Node.js → npm**: If Node.js devcontainer is selected, npm ecosystem is automatically added
- **Python → pip**: If Python devcontainer is selected, pip ecosystem is automatically added
- **Java → maven**: If Java devcontainer is selected, maven ecosystem is automatically added
- **No Manual Selection**: Ecosystems are automatically configured based on project languages
- **Multi-Language Support**: If multiple languages are selected, all relevant ecosystems are included

**Rationale**: Dependency ecosystems should match the actual technologies in the project. Automatically detecting and configuring ecosystems reduces configuration errors and ensures Dependabot monitors the right package managers. Users don't need to manually match ecosystems to their selected languages.

### Playwright Configuration Standards

**Chromium Only by Default**: All generated Playwright configurations default to testing with Chromium only to reduce test execution time and complexity.

**Playwright Browser Rules**:

- **Single Browser**: Only Chromium is used by default for faster test execution
- **Cross-Browser Not Needed**: Most web applications work consistently across browsers in modern development
- **Test Speed**: Single browser reduces test execution time significantly
- **User Override**: Users can add additional browsers if cross-browser testing is required
- **Consistency**: All generated projects use the same browser configuration

**Rationale**: Modern web applications built with cloudflare workers and following standards work consistently across browsers. Testing with only Chromium provides faster feedback while still catching most bugs. Cross-browser testing can be added when specifically needed for browser-specific features.

### Capability Links and Documentation

**External Documentation Links**: All capabilities should include links to their official documentation or project pages in their headings to help users learn more about each tool.

**Link Requirements**:

- **Official Resources**: Capability headings link to official websites, GitHub repositories, or documentation
- **Educational Value**: Links help users understand what each capability provides before selecting
- **Trust Indicators**: Official links demonstrate credibility and professionalism
- **Example Links**:
  - Spec Kit → github.com/github/spec-kit
  - Doppler → doppler.com
  - SonarCloud → sonarcloud.io
  - CircleCI → circleci.com
  - Cloudflare Wrangler → developers.cloudflare.com/workers
  - Playwright → playwright.dev
  - Lighthouse CI → github.com/GoogleChrome/lighthouse-ci

**Rationale**: Users need to understand what each capability does before selecting it. Linking to official documentation helps users make informed decisions and builds trust in the tool. External links also provide credibility signals that show this isn't just made-up functionality.

### Spec Kit Configuration Standards

**Spec-Driven Development**: [GitHub's Spec Kit](https://github.com/github/spec-kit) provides a toolkit for specification-driven development with templates and workflows to help structure projects.

**Spec Kit Rules**:

- **Default Constitution**: Spec Kit defaults to including a `constitution.md` based on the ftn project's principles, but users can opt out
- **Optional Configuration**: Users can choose to exclude the constitution if they want to create their own from scratch
- **Template Files**: Always includes spec templates (spec-template.md, tasks-template.md, CLAUDE-template.md)
- **SDD Workflow**: Sets up the Spec-Driven Development workflow structure
- **User Control**: If included, users can modify the constitution.md file to match their own principles after generation

**Rationale**: The constitution.md file contains foundational principles that guide development decisions. Including it by default helps establish quality standards from the start, but some users may prefer to create their own constitution from scratch. This provides flexibility while still promoting best practices.

## Summary of Changes

The worker types (web, api, scheduled) were configuration options, but since this tool focuses exclusively on web applications, the worker type defaults to 'web' and is not configurable. This removes unnecessary choices and keeps the focus on the tool's primary use case of generating web applications on Cloudflare Workers.
