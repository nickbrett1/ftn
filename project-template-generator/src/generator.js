const fs = require('fs-extra');
const path = require('path');
const Handlebars = require('handlebars');

class ProjectGenerator {
  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'templates');
    this.registerHelpers();
  }

  registerHelpers() {
    // Helper for conditional includes
    Handlebars.registerHelper('if_eq', function(a, b, options) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Helper for array includes
    Handlebars.registerHelper('includes', function(array, value, options) {
      if (Array.isArray(array) && array.includes(value)) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Helper for logical AND
    Handlebars.registerHelper('and', function(a, b, options) {
      if (a && b) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    // Helper for logical OR
    Handlebars.registerHelper('or', function(a, b, options) {
      if (a || b) {
        return options.fn(this);
      }
      return options.inverse(this);
    });
  }

  async generateProject(projectName, outputDir, config) {
    // Ensure output directory exists
    await fs.ensureDir(outputDir);

    // Copy and process template files
    await this.copyTemplateFiles(projectName, outputDir, config);

    // Generate framework-specific files
    await this.generateFrameworkFiles(projectName, outputDir, config);

    // Generate cloud provider specific files
    await this.generateCloudProviderFiles(projectName, outputDir, config);

    // Generate package.json
    await this.generatePackageJson(projectName, outputDir, config);

    // Generate README
    await this.generateReadme(projectName, outputDir, config);

    // Generate additional configuration files
    await this.generateConfigFiles(projectName, outputDir, config);
  }

  async copyTemplateFiles(projectName, outputDir, config) {
    const templateFiles = [
      '.devcontainer/devcontainer.json',
      '.devcontainer/Dockerfile',
      '.devcontainer/.zshrc',
      '.devcontainer/.p10k.zsh',
      '.devcontainer/post-create-setup.sh',
      '.circleci/config.yml',
      '.vscode/settings.json',
      '.vscode/extensions.json',
      '.vscode/tasks.json',
      '.vscode/launch.json',
      'doppler.yaml',
      'sonar-project.properties',
      '.gitignore',
      '.eslintrc.js',
      '.prettierrc',
      'tsconfig.json'
    ];

    for (const templateFile of templateFiles) {
      const sourcePath = path.join(this.templatesDir, templateFile);
      const targetPath = path.join(outputDir, templateFile);

      if (await fs.pathExists(sourcePath)) {
        await fs.ensureDir(path.dirname(targetPath));
        await this.processTemplateFile(sourcePath, targetPath, config);
      }
    }
  }

  async processTemplateFile(sourcePath, targetPath, config) {
    const templateContent = await fs.readFile(sourcePath, 'utf8');
    const template = Handlebars.compile(templateContent);
    const processedContent = template(config);
    await fs.writeFile(targetPath, processedContent);
  }

  async generateFrameworkFiles(projectName, outputDir, config) {
    if (config.sveltekit) {
      await this.generateSvelteKitFiles(projectName, outputDir, config);
    } else if (config.nextjs) {
      await this.generateNextJSFiles(projectName, outputDir, config);
    } else if (config.express) {
      await this.generateExpressFiles(projectName, outputDir, config);
    } else if (config.fastify) {
      await this.generateFastifyFiles(projectName, outputDir, config);
    }
  }

  async generateSvelteKitFiles(projectName, outputDir, config) {
    const webappDir = path.join(outputDir, 'webapp');
    await fs.ensureDir(webappDir);

    // Generate svelte.config.js
    const svelteConfig = `import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<build>']
      }
    })
  }
};

export default config;`;

    await fs.writeFile(path.join(webappDir, 'svelte.config.js'), svelteConfig);

    // Generate vite.config.js
    const viteConfig = `import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}']
  }
});`;

    await fs.writeFile(path.join(webappDir, 'vite.config.js'), viteConfig);

    // Generate basic app structure
    await this.generateSvelteKitAppStructure(webappDir, config);
  }

  async generateSvelteKitAppStructure(webappDir, config) {
    const srcDir = path.join(webappDir, 'src');
    await fs.ensureDir(srcDir);

    // Generate app.html
    const appHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{projectName}}</title>
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>`;

    await fs.writeFile(path.join(webappDir, 'src', 'app.html'), appHtml);

    // Generate +layout.svelte
    const layoutSvelte = `<script>
  import '../app.css';
</script>

<main>
  <slot />
</main>

<style>
  main {
    padding: 1rem;
  }
</style>`;

    await fs.writeFile(path.join(webappDir, 'src', 'routes', '+layout.svelte'), layoutSvelte);

    // Generate +page.svelte
    const pageSvelte = `<h1>Welcome to {{projectName}}</h1>
<p>Your new SvelteKit application is ready!</p>`;

    await fs.writeFile(path.join(webappDir, 'src', 'routes', '+page.svelte'), pageSvelte);

    // Generate app.css
    const appCss = `/* Global styles */
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
}

h1, h2, h3, h4, h5, h6 {
  margin: 0 0 1rem 0;
}

p {
  margin: 0 0 1rem 0;
}`;

    await fs.writeFile(path.join(webappDir, 'src', 'app.css'), appCss);
  }

  async generateNextJSFiles(projectName, outputDir, config) {
    // Next.js specific files would go here
    console.log('Generating Next.js files...');
  }

  async generateExpressFiles(projectName, outputDir, config) {
    // Express.js specific files would go here
    console.log('Generating Express.js files...');
  }

  async generateFastifyFiles(projectName, outputDir, config) {
    // Fastify specific files would go here
    console.log('Generating Fastify files...');
  }

  async generateCloudProviderFiles(projectName, outputDir, config) {
    if (config.cloudflare) {
      await this.generateCloudflareFiles(projectName, outputDir, config);
    } else if (config.gcs) {
      await this.generateGCSFiles(projectName, outputDir, config);
    } else if (config.aws) {
      await this.generateAWSFiles(projectName, outputDir, config);
    }
  }

  async generateCloudflareFiles(projectName, outputDir, config) {
    const scriptsDir = config.sveltekit ? path.join(outputDir, 'webapp', 'scripts') : path.join(outputDir, 'scripts');
    await fs.ensureDir(scriptsDir);

    // Generate wrangler.template.jsonc
    const wranglerTemplate = `{
  "name": "{{projectName}}",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "main": "{{#if sveltekit}}webapp/{{/if}}dist/index.js",
  "routes": [
    { "pattern": "{{domain}}/*", "custom_domain": true }
  ],
  "env": {
    "production": {
      "name": "{{projectName}}-prod"
    },
    "preview": {
      "name": "{{projectName}}-preview"
    }
  },
  "kv_namespaces": [
    {
      "binding": "KV_NAMESPACE",
      "id": "KV_NAMESPACE_ID_PLACEHOLDER",
      "preview_id": "KV_NAMESPACE_ID_PLACEHOLDER"
    }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "{{projectName}}",
      "database_id": "D1_DATABASE_ID_PLACEHOLDER"
    }
  ]
}`;

    await fs.writeFile(path.join(outputDir, config.sveltekit ? 'webapp' : '.', 'wrangler.template.jsonc'), wranglerTemplate);

    // Generate cloud login script
    const cloudLoginScript = `#!/bin/bash
set -e

# Doppler login/setup
if command -v doppler &> /dev/null; then
  if doppler whoami &> /dev/null; then
    echo "Already logged in to Doppler."
  else
    echo "INFO: Logging into Doppler..."
    doppler login --no-check-version --no-timeout --yes
    echo "INFO: Setting up Doppler..."
    doppler setup --no-interactive --project {{projectName}} --config dev
  fi
else
  echo "Doppler CLI not found. Skipping Doppler login."
fi

echo
# Cloudflare Wrangler login
# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
  echo "Wrangler CLI not found. Installing globally with npm..."
  npm install -g wrangler
fi

script -q -c "npx wrangler login --browser=false --callback-host=0.0.0.0 --callback-port=8976 | stdbuf -oL sed 's/0\\.0\\.0\\.0/localhost/g'" /dev/null

echo
# Setup Wrangler configuration with environment variables
echo "Setting up Wrangler configuration..."
doppler run --project {{projectName}} --config dev -- ./scripts/setup-wrangler-config.sh

echo "Cloud login script finished."`;

    await fs.writeFile(path.join(scriptsDir, 'cloud-login.sh'), cloudLoginScript);
    await fs.chmod(path.join(scriptsDir, 'cloud-login.sh'), '755');

    // Generate setup-wrangler-config.sh
    const setupWranglerScript = `#!/bin/bash
set -e

# Setup Wrangler Configuration Script
# This script generates wrangler.jsonc from the template using environment variables
# It should be called during development setup and CI/CD deployments

echo "Setting up Wrangler configuration..."

# Check if doppler CLI is available
if ! command -v doppler &> /dev/null; then
    echo "❌ Error: Doppler CLI is not installed or not in PATH"
    echo "Please install Doppler CLI: https://docs.doppler.com/docs/install-cli"
    exit 1
fi

# Check Doppler authentication status
echo "🔍 Checking Doppler authentication..."
if ! doppler whoami &> /dev/null; then
    echo "❌ Error: Not authenticated with Doppler"
    echo "Please run: doppler login"
    exit 1
fi

echo "✅ Doppler authentication confirmed"
echo "👤 Current Doppler user: $(doppler whoami 2>/dev/null || echo 'Unable to determine')"

# Check if wrangler.template.jsonc exists
if [ ! -f "wrangler.template.jsonc" ]; then
    echo "Error: wrangler.template.jsonc not found in current directory"
    exit 1
fi

# Build doppler args - DOPPLER_TOKEN is the token, DOPPLER_ENVIRONMENT is the config name
DOPPLER_CONFIG_TO_USE=""
DOPPLER_ARGS=""
if [ -n "$DOPPLER_ENVIRONMENT" ]; then
    DOPPLER_CONFIG_TO_USE="$DOPPLER_ENVIRONMENT"
    DOPPLER_ARGS="--config $DOPPLER_ENVIRONMENT"
    echo "🎯 Using Doppler config: $DOPPLER_ENVIRONMENT (from DOPPLER_ENVIRONMENT environment variable)"
else
    # Default to stg config for staging/production builds
    DOPPLER_CONFIG_TO_USE="stg"
    DOPPLER_ARGS="--config stg"
    echo "🎯 Using Doppler config: stg (default)"
fi

# Add token to args if available
if [ -n "$DOPPLER_TOKEN" ]; then
    DOPPLER_ARGS="$DOPPLER_ARGS --token $DOPPLER_TOKEN"
fi

# Debug: Show environment variables
if [ -n "$DOPPLER_TOKEN" ]; then
    echo "🔑 Doppler token is set via DOPPLER_TOKEN (${#DOPPLER_TOKEN} characters)"
else
    echo "🔑 No Doppler token found in DOPPLER_TOKEN environment variable"
fi

if [ -n "$DOPPLER_ENVIRONMENT" ]; then
    echo "🌍 Doppler environment is set via DOPPLER_ENVIRONMENT: $DOPPLER_ENVIRONMENT"
else
    echo "🌍 No Doppler environment found in DOPPLER_ENVIRONMENT, using default"
fi

# Validate that the config exists and is accessible
echo "🔍 Validating access to Doppler config '$DOPPLER_CONFIG_TO_USE'..."
VALIDATION_ARGS="--project {{projectName}} --config $DOPPLER_CONFIG_TO_USE"
if [ -n "$DOPPLER_TOKEN" ]; then
    VALIDATION_ARGS="$VALIDATION_ARGS --token $DOPPLER_TOKEN"
fi
if ! doppler configs get $VALIDATION_ARGS &> /dev/null; then
    echo "❌ Error: Cannot access Doppler config '$DOPPLER_CONFIG_TO_USE' in project '{{projectName}}'"
    echo ""
    echo "🔍 Debugging information:"
    echo "  - Token type: Service token (CircleCI)"
    echo "  - Project: {{projectName}}"
    echo "  - Requested config: $DOPPLER_CONFIG_TO_USE"
    echo ""
    echo "📋 Attempting to list available configs:"
    LIST_ARGS="--project {{projectName}}"
    if [ -n "$DOPPLER_TOKEN" ]; then
        LIST_ARGS="$LIST_ARGS --token $DOPPLER_TOKEN"
    fi
    if doppler configs $LIST_ARGS 2>/dev/null; then
        echo "✅ Successfully listed configs above"
    else
        echo "❌ Failed to list configs. This service token may have limited permissions."
        echo "💡 Common issues:"
        echo "   1. The config '$DOPPLER_CONFIG_TO_USE' doesn't exist"
        echo "   2. The service token doesn't have access to this config"
        echo "   3. The config name is being passed incorrectly"
    fi
    echo ""
    echo "🔧 To fix this:"
    echo "   1. Check that the config '$DOPPLER_CONFIG_TO_USE' exists in the Doppler dashboard"
    echo "   2. Ensure the CircleCI service token has access to this config"
    echo "   3. Verify the DOPPLER_CONFIG environment variable is set correctly"
    exit 1
fi
echo "✅ Config '$DOPPLER_CONFIG_TO_USE' is accessible"

# Run doppler to get environment variables and execute the configuration generation
echo "📥 Fetching environment variables from Doppler config '$DOPPLER_CONFIG_TO_USE'..."
if doppler run $DOPPLER_ARGS -- bash -c '
    set -e  # Exit on any error
    
    echo "🔍 Checking required environment variables..."
    
    # Check if required environment variables are set
    if [ -z "$KV_NAMESPACE_ID" ]; then
        echo "❌ Error: KV_NAMESPACE_ID environment variable is not set in Doppler config"
        exit 1
    fi
    echo "✅ KV_NAMESPACE_ID is set: ${KV_NAMESPACE_ID:0:10}..."

    if [ -z "$D1_DATABASE_ID" ]; then
        echo "❌ Error: D1_DATABASE_ID environment variable is not set in Doppler config"
        exit 1
    fi
    echo "✅ D1_DATABASE_ID is set: ${D1_DATABASE_ID:0:10}..."

    # Create wrangler.jsonc from template with substitutions
    echo "📝 Generating wrangler.jsonc from template..."
    if ! sed \
        -e "s/KV_NAMESPACE_ID_PLACEHOLDER/$KV_NAMESPACE_ID/g" \
        -e "s/D1_DATABASE_ID_PLACEHOLDER/$D1_DATABASE_ID/g" \
        wrangler.template.jsonc > wrangler.jsonc; then
        echo "❌ Error: Failed to generate wrangler.jsonc from template"
        exit 1
    fi

    echo "✅ Wrangler configuration generated successfully"
    echo "📁 Generated: wrangler.jsonc"
'; then
    echo "✅ Wrangler configuration setup completed successfully"
else
    echo "❌ Error: Failed to fetch environment variables from Doppler or generate wrangler.jsonc"
    echo "This could be due to:"
    echo "  1. Invalid Doppler token"
    echo "  2. Token doesn't have access to config '$DOPPLER_CONFIG_TO_USE'"
    echo "  3. Missing required environment variables in Doppler config"
    echo "  4. Network connectivity issues"
    echo "  5. Template file issues or sed command failure"
    exit 1
fi`;

    await fs.writeFile(path.join(scriptsDir, 'setup-wrangler-config.sh'), setupWranglerScript);
    await fs.chmod(path.join(scriptsDir, 'setup-wrangler-config.sh'), '755');
  }

  async generateGCSFiles(projectName, outputDir, config) {
    // Google Cloud Platform specific files would go here
    console.log('Generating GCS files...');
  }

  async generateAWSFiles(projectName, outputDir, config) {
    // AWS specific files would go here
    console.log('Generating AWS files...');
  }

  async generatePackageJson(projectName, outputDir, config) {
    const packageJson = {
      name: projectName,
      version: '0.0.1',
      description: config.description,
      author: config.author,
      license: 'MIT',
      scripts: this.getScripts(config),
      dependencies: this.getDependencies(config),
      devDependencies: this.getDevDependencies(config),
      type: 'module'
    };

    const targetPath = config.sveltekit ? path.join(outputDir, 'webapp', 'package.json') : path.join(outputDir, 'package.json');
    await fs.writeFile(targetPath, JSON.stringify(packageJson, null, 2));
  }

  getScripts(config) {
    const baseScripts = {
      'dev': config.sveltekit ? 'vite dev' : 'node src/index.js',
      'build': config.sveltekit ? 'vite build' : 'tsc',
      'preview': config.sveltekit ? 'vite preview' : 'node dist/index.js',
      'test': 'jest',
      'test:watch': 'jest --watch',
      'test:ci': 'jest --ci --coverage --watchAll=false',
      'lint': 'eslint .',
      'lint:fix': 'eslint . --fix',
      'format': 'prettier --write .'
    };

    if (config.cloudflare) {
      baseScripts.deploy = 'wrangler deploy';
      baseScripts['deploy-preview'] = 'wrangler deploy --env preview';
    }

    if (config.playwright) {
      baseScripts['test:e2e'] = 'playwright test';
      baseScripts['test:e2e:ui'] = 'playwright test --ui';
    }

    return baseScripts;
  }

  getDependencies(config) {
    const deps = {};

    if (config.sveltekit) {
      deps['@sveltejs/adapter-cloudflare'] = '^3.0.0';
      deps['@sveltejs/kit'] = '^2.0.0';
      deps['svelte'] = '^4.0.0';
    } else if (config.nextjs) {
      deps['next'] = '^14.0.0';
      deps['react'] = '^18.0.0';
      deps['react-dom'] = '^18.0.0';
    } else if (config.express) {
      deps['express'] = '^4.18.0';
    } else if (config.fastify) {
      deps['fastify'] = '^4.24.0';
    }

    return deps;
  }

  getDevDependencies(config) {
    const devDeps = {
      '@types/node': '^20.0.0',
      'typescript': '^5.0.0',
      'eslint': '^8.55.0',
      'prettier': '^3.1.1'
    };

    if (config.sveltekit) {
      devDeps['@sveltejs/vite-plugin-svelte'] = '^3.0.0';
      devDeps['vite'] = '^5.0.0';
    } else if (config.nextjs) {
      devDeps['@types/react'] = '^18.0.0';
      devDeps['@types/react-dom'] = '^18.0.0';
    }

    if (config.jest) {
      devDeps['jest'] = '^29.7.0';
      devDeps['@types/jest'] = '^29.5.0';
    }

    if (config.vitest) {
      devDeps['vitest'] = '^1.0.0';
    }

    if (config.playwright) {
      devDeps['@playwright/test'] = '^1.40.0';
    }

    return devDeps;
  }

  async generateReadme(projectName, outputDir, config) {
    const readme = `# ${projectName}

${config.description}

## Features

- **DevContainer** setup with Node.js, zsh, Oh My Zsh, Powerlevel10k
- **Doppler** integration for secrets management
- **CircleCI** pipeline with build, test, and deploy stages
- **SonarCloud** integration for code quality
- **${config.cloudProvider === 'cloudflare' ? 'Cloudflare Workers' : config.cloudProvider === 'gcs' ? 'Google Cloud Platform' : config.cloudProvider === 'aws' ? 'Amazon Web Services' : 'Local development'}** deployment
- **VS Code/Cursor** configuration with extensions and settings

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for devcontainer)
- Doppler CLI
${config.cloudflare ? '- Wrangler CLI' : ''}
${config.gcs ? '- Google Cloud CLI' : ''}
${config.aws ? '- AWS CLI' : ''}

### Development Setup

1. **Clone and open in devcontainer:**
   \`\`\`bash
   git clone <your-repo-url>
   cd ${projectName}
   code . # or cursor .
   \`\`\`

2. **Set up Doppler:**
   \`\`\`bash
   doppler login
   doppler setup --project ${projectName} --config dev
   \`\`\`

3. **Set up cloud provider:**
   ${config.cloudflare ? '```bash\n   npx wrangler login\n   # Configure your wrangler.toml file\n```' : ''}
   ${config.gcs ? '```bash\n   gcloud auth login\n   gcloud config set project YOUR_PROJECT_ID\n```' : ''}
   ${config.aws ? '```bash\n   aws configure\n```' : ''}

4. **Install dependencies and start development:**
   \`\`\`bash
   ${config.sveltekit ? 'cd webapp && ' : ''}npm install
   npm run dev
   \`\`\`

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run test\` - Run tests
- \`npm run lint\` - Run ESLint
- \`npm run format\` - Format code with Prettier
${config.playwright ? '- `npm run test:e2e` - Run end-to-end tests' : ''}
${config.cloudflare ? '- `npm run deploy` - Deploy to Cloudflare Workers' : ''}

## Project Structure

\`\`\`
${projectName}/
├── .devcontainer/          # DevContainer configuration
├── .circleci/              # CI/CD pipeline
├── .vscode/                # VS Code settings
${config.sveltekit ? '├── webapp/                 # SvelteKit application\n│   ├── src/\n│   ├── static/\n│   └── package.json' : '├── src/                   # Source code\n├── dist/                  # Built files'}
├── doppler.yaml            # Doppler configuration
├── sonar-project.properties # SonarCloud configuration
└── README.md
\`\`\`

## Deployment

This project is configured for automatic deployment via CircleCI:

- **Main branch** → Production deployment
- **Other branches** → Preview deployment

### Environment Variables

Configure the following in CircleCI:

- \`DOPPLER_TOKEN\` - Doppler service token
- \`SONAR_TOKEN\` - SonarCloud token
${config.cloudflare ? '- Cloudflare API tokens' : ''}
${config.gcs ? '- Google Cloud service account key' : ''}
${config.aws ? '- AWS access keys' : ''}

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT
`;

    await fs.writeFile(path.join(outputDir, 'README.md'), readme);
  }

  async generateConfigFiles(projectName, outputDir, config) {
    // Generate .gitignore
    const gitignore = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
.svelte-kit/
.next/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/settings.json
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
logs/
*.log

# Coverage
coverage/
.nyc_output/

# Temporary files
.tmp/
.temp/

# Cloudflare
wrangler.toml
wrangler.jsonc

# Doppler
.doppler/
`;

    await fs.writeFile(path.join(outputDir, '.gitignore'), gitignore);

    // Generate ESLint config
    const eslintConfig = `module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    '@typescript-eslint/no-unused-vars': 'error'
  }
};`;

    await fs.writeFile(path.join(outputDir, '.eslintrc.js'), eslintConfig);

    // Generate Prettier config
    const prettierConfig = `{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}`;

    await fs.writeFile(path.join(outputDir, '.prettierrc'), prettierConfig);

    // Generate TypeScript config
    const tsConfig = {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist']
    };

    await fs.writeFile(path.join(outputDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2));
  }
}

module.exports = ProjectGenerator;