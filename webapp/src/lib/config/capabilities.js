/**
 * @fileoverview Project capability definitions for the genproj tool
 * @description Defines all available project capabilities with their requirements and dependencies
 */

/**
 * @typedef {Object} CapabilityDefinition
 * @property {string} id - Unique capability identifier
 * @property {string} name - Human-readable name
 * @property {string} description - Detailed description
 * @property {'devcontainer'|'ci-cd'|'code-quality'|'secrets'|'deployment'|'monitoring'} category
 * @property {string[]} dependencies - Required capabilities
 * @property {string[]} conflicts - Conflicting capabilities
 * @property {string[]} requiresAuth - Required authentication services
 * @property {Object} configurationSchema - Configuration validation schema
 * @property {TemplateReference[]} templates - Associated file templates
 * @property {Object} [externalService] - External service configuration
 */

/**
 * @typedef {Object} TemplateReference
 * @property {string} id - Template identifier
 * @property {string} filePath - Target file path in repository
 * @property {string} templateId - Source template identifier
 * @property {Object} [variables] - Template variables
 */

/**
 * Available project capabilities
 * @type {CapabilityDefinition[]}
 */
export const capabilities = [
  {
    id: "devcontainer-node",
    name: "Node.js DevContainer",
    description: "Development container with Node.js runtime and common tools",
    category: "devcontainer",
    dependencies: [],
    conflicts: ["devcontainer-python", "devcontainer-java"],
    requiresAuth: [],
    configurationSchema: {
      type: "object",
      properties: {
        nodeVersion: { type: "string", enum: ["18", "20", "22"], default: "20" },
        packageManager: { type: "string", enum: ["npm", "yarn", "pnpm"], default: "npm" },
      },
    },
    templates: [
      { id: "devcontainer-json", filePath: ".devcontainer/devcontainer.json", templateId: "devcontainer-node-json" },
      { id: "dockerfile", filePath: ".devcontainer/Dockerfile", templateId: "devcontainer-node-dockerfile" },
    ],
  },
  {
    id: "devcontainer-python",
    name: "Python DevContainer",
    description: "Development container with Python runtime and common tools",
    category: "devcontainer",
    dependencies: [],
    conflicts: ["devcontainer-node", "devcontainer-java"],
    requiresAuth: [],
    configurationSchema: {
      type: "object",
      properties: {
        pythonVersion: { type: "string", enum: ["3.9", "3.10", "3.11", "3.12"], default: "3.11" },
        packageManager: { type: "string", enum: ["pip", "poetry", "pipenv"], default: "pip" },
      },
    },
    templates: [
      { id: "devcontainer-json", filePath: ".devcontainer/devcontainer.json", templateId: "devcontainer-python-json" },
      { id: "dockerfile", filePath: ".devcontainer/Dockerfile", templateId: "devcontainer-python-dockerfile" },
    ],
  },
  {
    id: "devcontainer-java",
    name: "Java DevContainer",
    description: "Development container with Java runtime and Maven/Gradle",
    category: "devcontainer",
    dependencies: [],
    conflicts: ["devcontainer-node", "devcontainer-python"],
    requiresAuth: [],
    configurationSchema: {
      type: "object",
      properties: {
        javaVersion: { type: "string", enum: ["11", "17", "21"], default: "17" },
        buildTool: { type: "string", enum: ["maven", "gradle"], default: "maven" },
      },
    },
    templates: [
      { id: "devcontainer-json", filePath: ".devcontainer/devcontainer.json", templateId: "devcontainer-java-json" },
      { id: "dockerfile", filePath: ".devcontainer/Dockerfile", templateId: "devcontainer-java-dockerfile" },
    ],
  },
  {
    id: "circleci",
    name: "CircleCI CI/CD",
    description: "Continuous integration and deployment with CircleCI",
    category: "ci-cd",
    dependencies: [],
    conflicts: ["github-actions"],
    requiresAuth: ["circleci"],
    configurationSchema: {
      type: "object",
      properties: {
        nodeVersion: { type: "string", enum: ["18", "20", "22"], default: "20" },
        deployTarget: { type: "string", enum: ["cloudflare", "vercel", "aws"], default: "cloudflare" },
      },
    },
    templates: [
      { id: "circleci-config", filePath: ".circleci/config.yml", templateId: "circleci-config" },
    ],
    externalService: {
      service: "circleci",
      projectCreation: true,
      fallbackInstructions: "Create a CircleCI project manually and connect it to your GitHub repository",
    },
  },
  {
    id: "github-actions",
    name: "GitHub Actions",
    description: "Continuous integration and deployment with GitHub Actions",
    category: "ci-cd",
    dependencies: [],
    conflicts: ["circleci"],
    requiresAuth: ["github"],
    configurationSchema: {
      type: "object",
      properties: {
        nodeVersion: { type: "string", enum: ["18", "20", "22"], default: "20" },
        deployTarget: { type: "string", enum: ["cloudflare", "vercel", "aws"], default: "cloudflare" },
      },
    },
    templates: [
      { id: "github-workflow", filePath: ".github/workflows/ci.yml", templateId: "github-actions-ci" },
    ],
  },
  {
    id: "sonarcloud",
    name: "SonarCloud Code Quality",
    description: "Code quality analysis and security scanning with SonarCloud",
    category: "code-quality",
    dependencies: [],
    conflicts: [],
    requiresAuth: ["sonarcloud"],
    configurationSchema: {
      type: "object",
      properties: {
        language: { type: "string", enum: ["javascript", "typescript", "python", "java"], default: "javascript" },
        qualityGate: { type: "string", enum: ["default", "strict"], default: "default" },
      },
    },
    templates: [
      { id: "sonar-config", filePath: "sonar-project.properties", templateId: "sonarcloud-config" },
    ],
    externalService: {
      service: "sonarcloud",
      projectCreation: true,
      fallbackInstructions: "Create a SonarCloud project manually and configure it for your repository",
    },
  },
  {
    id: "sonarlint",
    name: "SonarLint IDE Integration",
    description: "IDE integration for SonarLint code quality analysis",
    category: "code-quality",
    dependencies: ["sonarcloud"],
    conflicts: [],
    requiresAuth: [],
    configurationSchema: {
      type: "object",
      properties: {
        ide: { type: "string", enum: ["vscode", "intellij", "eclipse"], default: "vscode" },
      },
    },
    templates: [
      { id: "sonarlint-config", filePath: ".sonarlint/sonarlint.json", templateId: "sonarlint-config" },
    ],
  },
  {
    id: "doppler",
    name: "Doppler Secrets Management",
    description: "Secure secrets management and environment configuration",
    category: "secrets",
    dependencies: [],
    conflicts: [],
    requiresAuth: ["doppler"],
    configurationSchema: {
      type: "object",
      properties: {
        environments: { type: "array", items: { type: "string" }, default: ["dev", "staging", "prod"] },
        projectType: { type: "string", enum: ["web", "api", "mobile"], default: "web" },
      },
    },
    templates: [
      { id: "doppler-config", filePath: "doppler.yaml", templateId: "doppler-config" },
    ],
    externalService: {
      service: "doppler",
      projectCreation: true,
      fallbackInstructions: "Create a Doppler project manually and configure environment variables",
    },
  },
  {
    id: "cloudflare-wrangler",
    name: "Cloudflare Wrangler",
    description: "Cloudflare Workers development and deployment configuration",
    category: "deployment",
    dependencies: [],
    conflicts: [],
    requiresAuth: [],
    configurationSchema: {
      type: "object",
      properties: {
        workerType: { type: "string", enum: ["web", "api", "scheduled"], default: "web" },
        compatibilityDate: { type: "string", default: "2024-01-01" },
      },
    },
    templates: [
      { id: "wrangler-config", filePath: "wrangler.toml", templateId: "wrangler-config" },
    ],
  },
  {
    id: "dependabot",
    name: "Dependabot",
    description: "Automated dependency updates and security alerts",
    category: "monitoring",
    dependencies: [],
    conflicts: [],
    requiresAuth: [],
    configurationSchema: {
      type: "object",
      properties: {
        ecosystems: { type: "array", items: { type: "string" }, default: ["npm"] },
        updateSchedule: { type: "string", enum: ["daily", "weekly", "monthly"], default: "weekly" },
      },
    },
    templates: [
      { id: "dependabot-config", filePath: ".github/dependabot.yml", templateId: "dependabot-config" },
    ],
  },
  {
    id: "lighthouse-ci",
    name: "Lighthouse CI",
    description: "Automated performance and accessibility testing",
    category: "monitoring",
    dependencies: [],
    conflicts: [],
    requiresAuth: [],
    configurationSchema: {
      type: "object",
      properties: {
        thresholds: {
          type: "object",
          properties: {
            performance: { type: "number", minimum: 0, maximum: 100, default: 90 },
            accessibility: { type: "number", minimum: 0, maximum: 100, default: 90 },
            bestPractices: { type: "number", minimum: 0, maximum: 100, default: 90 },
            seo: { type: "number", minimum: 0, maximum: 100, default: 90 },
          },
        },
      },
    },
    templates: [
      { id: "lighthouse-config", filePath: ".lighthouserc.js", templateId: "lighthouse-ci-config" },
    ],
  },
  {
    id: "playwright",
    name: "Playwright Testing",
    description: "End-to-end testing with Playwright",
    category: "monitoring",
    dependencies: [],
    conflicts: [],
    requiresAuth: [],
    configurationSchema: {
      type: "object",
      properties: {
        browsers: { type: "array", items: { type: "string" }, default: ["chromium", "firefox", "webkit"] },
        testDir: { type: "string", default: "tests/e2e" },
      },
    },
    templates: [
      { id: "playwright-config", filePath: "playwright.config.js", templateId: "playwright-config" },
    ],
  },
  {
    id: "spec-kit",
    name: "Spec Kit",
    description: "Specification-driven development tools and templates",
    category: "monitoring",
    dependencies: [],
    conflicts: [],
    requiresAuth: [],
    configurationSchema: {
      type: "object",
      properties: {
        specFormat: { type: "string", enum: ["markdown", "yaml", "json"], default: "markdown" },
        includeTemplates: { type: "boolean", default: true },
      },
    },
    templates: [
      { id: "spec-template", filePath: ".specify/templates/spec-template.md", templateId: "spec-template" },
      { id: "tasks-template", filePath: ".specify/templates/tasks-template.md", templateId: "tasks-template" },
    ],
  },
];

/**
 * Get capability by ID
 * @param {string} id - Capability ID
 * @returns {CapabilityDefinition|undefined} Capability definition
 */
export function getCapabilityById(id) {
  return capabilities.find(cap => cap.id === id);
}

/**
 * Get capabilities by category
 * @param {string} category - Capability category
 * @returns {CapabilityDefinition[]} Capabilities in category
 */
export function getCapabilitiesByCategory(category) {
  return capabilities.filter(cap => cap.category === category);
}

/**
 * Validate capability dependencies
 * @param {string[]} selectedCapabilities - Selected capability IDs
 * @returns {Object} Validation result with missing dependencies
 */
export function validateCapabilityDependencies(selectedCapabilities) {
  const missing = [];
  const conflicts = [];

  for (const capabilityId of selectedCapabilities) {
    const capability = getCapabilityById(capabilityId);
    if (!capability) continue;

    // Check dependencies
    for (const depId of capability.dependencies) {
      if (!selectedCapabilities.includes(depId)) {
        missing.push({ capability: capabilityId, dependency: depId });
      }
    }

    // Check conflicts
    for (const conflictId of capability.conflicts) {
      if (selectedCapabilities.includes(conflictId)) {
        conflicts.push({ capability: capabilityId, conflict: conflictId });
      }
    }
  }

  return { missing, conflicts, valid: missing.length === 0 && conflicts.length === 0 };
}

/**
 * Get required authentication services for selected capabilities
 * @param {string[]} selectedCapabilities - Selected capability IDs
 * @returns {string[]} Required authentication service IDs
 */
export function getRequiredAuthServices(selectedCapabilities) {
  const required = new Set();
  
  for (const capabilityId of selectedCapabilities) {
    const capability = getCapabilityById(capabilityId);
    if (capability) {
      capability.requiresAuth.forEach(service => required.add(service));
    }
  }

  return Array.from(required);
}
