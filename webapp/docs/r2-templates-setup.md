# R2 Template Storage Configuration

This document describes the R2 bucket setup for storing project generation templates.

## Bucket Configuration

**Bucket Name**: `genproj-templates`
**Region**: `auto` (Cloudflare global)
**Public Access**: `false` (private bucket)

## Template Organization

```
genproj-templates/
├── devcontainer/
│   ├── node/
│   │   ├── devcontainer.json.hbs
│   │   └── Dockerfile.hbs
│   ├── python/
│   │   ├── devcontainer.json.hbs
│   │   └── Dockerfile.hbs
│   └── java/
│       ├── devcontainer.json.hbs
│       └── Dockerfile.hbs
├── circleci/
│   └── config.yml.hbs
├── github-actions/
│   └── ci.yml.hbs
├── sonarcloud/
│   └── sonar-project.properties.hbs
├── sonarlint/
│   └── sonarlint.json.hbs
├── doppler/
│   └── doppler.yaml.hbs
├── cloudflare/
│   └── wrangler.toml.hbs
├── dependabot/
│   └── dependabot.yml.hbs
├── lighthouse/
│   └── .lighthouserc.js.hbs
├── playwright/
│   └── playwright.config.js.hbs
└── spec-kit/
    ├── spec-template.md.hbs
    └── tasks-template.md.hbs
```

## Template Variables

Each template uses Handlebars syntax with the following common variables:

- `{{projectName}}` - User-provided project name
- `{{nodeVersion}}` - Node.js version (18, 20, 22)
- `{{pythonVersion}}` - Python version (3.9, 3.10, 3.11, 3.12)
- `{{javaVersion}}` - Java version (11, 17, 21)
- `{{packageManager}}` - Package manager (npm, yarn, pnpm, pip, poetry, etc.)
- `{{buildTool}}` - Build tool (maven, gradle)
- `{{deployTarget}}` - Deployment target (cloudflare, vercel, aws)
- `{{language}}` - Programming language (javascript, typescript, python, java)
- `{{qualityGate}}` - SonarCloud quality gate (default, strict)
- `{{environments}}` - Doppler environments array
- `{{projectType}}` - Project type (web, api, mobile)
- `{{workerType}}` - Cloudflare Worker type (web, api, scheduled)
- `{{compatibilityDate}}` - Cloudflare compatibility date
- `{{ecosystems}}` - Dependabot ecosystems array
- `{{updateSchedule}}` - Dependabot update schedule
- `{{thresholds}}` - Lighthouse CI thresholds object
- `{{browsers}}` - Playwright browsers array
- `{{testDir}}` - Playwright test directory
- `{{specFormat}}` - Spec Kit format (markdown, yaml, json)
- `{{includeTemplates}}` - Spec Kit include templates boolean

## Setup Commands

```bash
# Create R2 bucket
npx wrangler r2 bucket create genproj-templates

# Upload templates (run from webapp directory)
npm run upload-templates

# Sync templates from local
npm run sync-templates
```

## Environment Variables

Add to `.env` or Cloudflare Workers environment:

```bash
R2_GENPROJ_BUCKET_NAME=genproj-templates
R2_GENPROJ_ACCESS_KEY_ID=your_access_key
R2_GENPROJ_SECRET_ACCESS_KEY=your_secret_key
```

## Usage in Code

```javascript
// Access R2 bucket in SvelteKit
import { platform } from '$app/environment';

export async function getTemplate(templateId) {
	const bucket = platform.env.R2_GENPROJ;
	const object = await bucket.get(templateId);
	return object?.text();
}

export async function uploadTemplate(templateId, content) {
	const bucket = platform.env.R2_GENPROJ;
	await bucket.put(templateId, content);
}
```
